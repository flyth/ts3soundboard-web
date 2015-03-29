var
	express = require('express'),
	dgram = require('dgram'),
	fs = require('fs');
	
var util = require('util');

var config, tmpConfig;
try {
	tmpConfig = fs.readFileSync(__dirname + '/config.json');
} catch (err) {
	throw new Error('No config.json present.');
}

try {
	config = JSON.parse(tmpConfig);
} catch (err) {
	throw new Error('Config file does not seem to be valid JSON.');
}

var BASE_PATH = config.basePath;

var playlist = [];
var tracks = [];
var isPlaying = 0;
var currentlyPlaying = -1;
var skipNotification = false;

// Prepare webserver
var app = express();
app.listen(8080);
app.use(express.basicAuth(function(user, pass, fn) {
	if (config.users && config.users[user] && config.users[user].password && config.users[user].password == pass && config.users[user].permissions) {
		fn(null, config.users[user]);
	} else {
		fn(new Error('Unauthenticated.'));
	}
}));
app.use(express.static(__dirname + '/public'));

app.get('/api/tracks', function (req, res) {
	if (!req.user.permissions.view) {
		res.send(403, 'Not allowed.');
		return;
	}
	res.setHeader('Content-Type', 'application/x-json');
	var result = [];
	tracks.forEach(function (track, id) {
		result.push({
			id: id,
			name: track.name
		});
	});
	res.end(JSON.stringify(result));
});

app.get('/api/playing', function (req, res) {
	if (!req.user.permissions.view) {
		res.send(403, 'Not allowed.');
		return;
	}
	res.setHeader('Content-Type', 'application/x-json');
	if (isPlaying) {
		res.end(JSON.stringify({ id: currentlyPlaying, name: tracks[currentlyPlaying].name }));
	} else {
		res.end(JSON.stringify(false));
	}
});

app.get('/api/playlist', function (req, res) {
	if (!req.user.permissions.view) {
		res.send(403, 'Not allowed.');
		return;
	}
	res.setHeader('Content-Type', 'application/x-json');
	res.end(JSON.stringify(playlist));
});

// Reload track list in case of adding files while running
app.post('/api/reload', function (req, res) {
	if (!req.user.permissions.reload) {
		res.send(403, 'Not allowed.');
		return;
	}
	// /stop will not emit a notification
	console.log('Stopping');
	skipNotification = false;
	isPlaying = false;
	var cmd = new Buffer("/stop");
	cmdSocket.send(cmd, 0, cmd.length, 19111, '127.0.0.1');
	
	currentlyPlaying = -1;
	playlist = [];
	tracks = [];
	
	fs.readdir(BASE_PATH, function (err, files) {
		if (err) {
			throw new Error('Could not find files in basePath. Aborting.');
		}
		files.forEach(function (file) {
			if(file.indexOf('.mp3', file.length - 4) !== -1 || file.indexOf('.ogg', file.length - 4) !== -1)
				tracks.push({ file: BASE_PATH + '/' + file, name: file });
		});
	});
	
	res.end();
});

// Clear playlist, add all tracks, randomize it and then start playing
app.post('/api/random', function (req, res) {
	if (!req.user.permissions.queue || !req.user.permissions.unqueue) {
		res.send(403, 'Not allowed.');
		return;
	}
	// /stop will not emit a notification
	console.log('Stopping');
	skipNotification = false;
	isPlaying = false;
	var cmd = new Buffer("/stop");
	cmdSocket.send(cmd, 0, cmd.length, 19111, '127.0.0.1');
	
	var nb = 0;
	playlist = [];
	tracks.forEach(function(track) {
		playlist.push({ id: nb, name: track.name });
		nb = nb + 1;
	});
	playlist.sort(function() {return 0.5 - Math.random()});
	
	var track = playlist.shift();
	playById(track.id);
	isPlaying = true;
	currentlyPlaying = track.id;
	
	res.end();
});

// Randomize the current playlist
app.post('/api/randomcurrent', function (req, res) {
	if (!req.user.permissions.queue) {
		res.send(403, 'Not allowed.');
		return;
	}
	playlist.sort(function() {return 0.5 - Math.random()});
	res.end();
});

// Plays next song in playlist
app.post('/api/next', function (req, res) {
	if (!req.user.permissions.play) {
		res.send(403, 'Not allowed.');
		return;
	}
	if (playlist.length > 0) {
		// /stop will not emit a notification
		console.log('Stopping');
		skipNotification = false;
		isPlaying = false;
		var cmd = new Buffer("/stop");
		cmdSocket.send(cmd, 0, cmd.length, 19111, '127.0.0.1');
		
		var track = playlist.shift();
		playById(track.id);
		isPlaying = true;
		currentlyPlaying = track.id;
	}
	res.end();
});

// Clear current playlist
app.post('/api/clear', function (req, res) {
	if (!req.user.permissions.unqueue) {
		res.send(403, 'Not allowed.');
		return;
	}
	playlist = [];
	res.end();
});


app.post('/api/stop', function (req, res) {
	if (!req.user.permissions.stop) {
		res.send(403, 'Not allowed.');
		return;
	}
	// /stop will not emit a notification
	console.log('Stopping');
	skipNotification = false;
	isPlaying = false;
	var cmd = new Buffer("/stop");
	cmdSocket.send(cmd, 0, cmd.length, 19111, '127.0.0.1');
	res.end();
});

app.post('/api/play/:id', function (req, res) {
	if (!req.user.permissions.queue) {
		res.send(403, 'Not allowed.');
		return;
	}
	console.log('Playing: ' + req.params.id);
	playById(req.params.id);
	res.end();
});

app.post('/api/playDirect/:id', function (req, res) {
	if (!req.user.permissions.play) {
		res.send(403, 'Not allowed.');
		return;
	}
	console.log('Playing: ' + req.params.id);
	playById(req.params.id, true);
	res.end();
});

app.post('/api/unqueue/:id', function (req, res) {
	if (!req.user.permissions.unqueue) {
		res.send(403, 'Not allowed.');
		return;
	}
	console.log('Removing: ' + req.params.id);
	// playById(req.params.id);
	var id = parseInt(req.params.id, 10);
	if (playlist.length <= id) {
		res.end(JSON.stringify(false));
		return;
	}
	playlist.splice(id, 1);
	res.end(JSON.stringify(true));
});

// Prepare UDP socket
var cmdSocket = dgram.createSocket('udp4');
var recSocket = dgram.createSocket('udp4');

recSocket.bind(19112);
recSocket.on('message', function (msg) {
	console.log('Got notification from plugin.');
	if (playlist.length > 0 && !skipNotification) {
		console.log('Playing next song.');
		isPlaying = false;
		var track = playlist.shift();
		playById(track.id);
		isPlaying = true;
		currentlyPlaying = track.id;
	} else
	if (!skipNotification) {
		isPlaying = false;
	}
	skipNotification = false;
});

// Recursive Directory search
// http://stackoverflow.com/questions/5827612/node-js-fs-readdir-recursive-directory-search
var walk = function(dir, done) {
	var results = [];
	fs.readdir(dir, function(err, list) {
		if (err) return done(err);
		var pending = list.length;
		if (!pending) return done(null, results);
		list.forEach(function(file) {
			file = dir + '/' + file;
			fs.stat(file, function(err, stat) {
				if (stat && stat.isDirectory()) {
					walk(file, function(err, res) {
							results = results.concat(res);
							if (!--pending) done(null, results);
						});
				} else {
					results.push(file);
					if (!--pending) done(null, results);
				}
			});
		});
	});
};

// Get all files in that directory
walk(BASE_PATH, function(err, files) {
	if (err) {
		throw new Error('Could not find files in basePath. Aborting.');
	}
	files.forEach(function (file) {
		if(file.indexOf('.mp3', file.length - 4) !== -1 || file.indexOf('.ogg', file.length - 4) !== -1)
			tracks.push({ file: BASE_PATH + '/' + file, name: file });
	});
});

// Helper functions
var playById = function (id, direct) {
	if (tracks.length <= id) {
		console.log('Invalid track.');
		return;
	}
	var track = tracks[id];
	if (isPlaying && !direct) {
		playlist.push({
			id: id,
			name: track.name
		})
	} else {
		if (direct && isPlaying) {
			skipNotification = true;
		}
		isPlaying = true;
		currentlyPlaying = id;
		var cmd = new Buffer("/music " + track.file);
		cmdSocket.send(cmd, 0, cmd.length, 19111, '127.0.0.1');
	}
};

app.post('/api/savepl/:id', function (req, res) {
	if (!req.user.permissions.queue) {
		res.send(403, 'Not allowed.');
		return;
	}
	
	console.log('Saving playlist: ' + req.params.id);
	
	var plid = parseInt(req.params.id);
	if(plid < 1 || plid > 10) {
		console.log('Operation incorrecte.');
		res.send(500, 'Not allowed.');
		return;
	}
	pl = [];
	if(currentlyPlaying > -1 && currentlyPlaying < tracks.length)
		pl.push(tracks[currentlyPlaying].name);
	for(i = 0; i < playlist.length; i++) {
		pl.push(playlist[i].name);
	}
	try { fs.writeFileSync(BASE_PATH + '/_playlist.' + plid, JSON.stringify(pl)); }
	catch (err) {
		console.log('Impossible de sauvegarder la playlist.');
		res.send(500, 'Impossible de sauvegarder la playlist.');
		return;
	}
	
	res.end();
});

app.post('/api/loadpl/:id', function (req, res) {
	if (!req.user.permissions.queue) {
		res.send(403, 'Not allowed.');
		return;
	}
	
	console.log('Loading playlist: ' + req.params.id);
	
	playlist = [];
	
	var plid = parseInt(req.params.id);
	if(plid < 1 || plid > 10) {
		console.log('Operation incorrecte.');
		res.send(500, 'Not allowed.');
		return;
	}
	
	try { tmp = fs.readFileSync(BASE_PATH + '/_playlist.' + plid); }
	catch (e) {
		res.send(500, 'Playlist inconnue.');
		return;
	}
	
	try { lst = JSON.parse(tmp); }
	catch (e) {
		res.send(500, 'Playlist invalide.');
		return;
	}
	
	lst.forEach(function(item) {
		for(i = 0; i < tracks.length; i++) {
			if(item == tracks[i].name) {
				playlist.push({
					id: i,
					name: tracks[i].name
				});
				break;
			}
		}
	});
	
	if(playlist.length > 0) {
		// /stop will not emit a notification
		console.log('Stopping');
		skipNotification = false;
		isPlaying = false;
		var cmd = new Buffer("/stop");
		cmdSocket.send(cmd, 0, cmd.length, 19111, '127.0.0.1');
		
		var track = playlist.shift();
		playById(track.id);
		isPlaying = true;
		currentlyPlaying = track.id;
	}
	
	res.end();
});
