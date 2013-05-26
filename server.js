var
	express = require('express'),
	dgram = require('dgram'),
	fs = require('fs');

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

// Prepare webserver
var app = express();
app.listen(8080);
app.use(express.static(__dirname + '/public'));

app.get('/api/tracks', function (req, res) {
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
	res.setHeader('Content-Type', 'application/x-json');
	if (isPlaying) {
		res.end(JSON.stringify({ id: currentlyPlaying, name: tracks[currentlyPlaying].name }));
	} else {
		res.end(JSON.stringify(false));
	}
});

app.get('/api/playlist', function (req, res) {
	res.setHeader('Content-Type', 'application/x-json');
	res.end(JSON.stringify(playlist));
});

app.post('/api/play/:id', function (req, res) {
	console.log('Playing: ' + req.params.id);
	playById(req.params.id);
	res.end();
});

// Prepare UDP socket
var cmdSocket = dgram.createSocket('udp4');
var recSocket = dgram.createSocket('udp4');

recSocket.bind(19112);
recSocket.on('message', function (msg) {
	console.log('Got notification from plugin.');
	isPlaying = false;
	if (playlist.length > 0) {
		var track = playlist.shift();
		playById(track.id);
		currentlyPlaying = track.id;
	}
});

// Get all files in that directory
fs.readdir(BASE_PATH, function (err, files) {
	if (err) {
		throw new Error('Could not find files in basePath. Aborting.');
	}
	files.forEach(function (file) {
		tracks.push({ file: BASE_PATH + '/' + file, name: file });
	});
});

// Helper functions
var playById = function (id) {
	if (tracks.length <= id) {
		console.log('Invalid track.');
		return;
	}
	var track = tracks[id];
	if (isPlaying) {
		playlist.push({
			id: id,
			name: track.name
		})
	} else {
		isPlaying = true;
		currentlyPlaying = id;
		var cmd = new Buffer("/music " + track.file);
		cmdSocket.send(cmd, 0, cmd.length, 19111, '127.0.0.1');
	}
};
