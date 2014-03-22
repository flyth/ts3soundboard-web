$(document).ready(function () {
	$(document).on('click', '#logout', function () {
		$.ajax({
			type: 'POST',
			username: 'logout',
			url: '/',
			success: function () {
				window.location.href = '/';
			},
			error: function () {
				window.location.href = '/';	
			}
		});
		return false;		
	});
	$(document).on('click', '#stop', function () {
		$.ajax({
			type: 'POST',
			url: '/api/stop',
			success: function () {
				refresh();
			},
			error: function () {
				alert('You are not allowed to do that, sorry.');
			}
		});
		return false;		
	});
	$(document).on('click', '#tracks li', function () {
		$.ajax({
			type: 'POST',
			url: '/api/play/' + $(this).attr('data-id'),
			success: function () {
				refresh();
			},
			error: function () {
				alert('You are not allowed to do that, sorry.');
			}
		});
		return false;
	});
	/*
	$(document).on('dblclick', '#tracks li', function () {
		$.ajax({
			type: 'POST',
			url: '/api/playDirect/' + $(this).attr('data-id'),
			success: function () {
				refresh();
			}
		});
		return false;
	});
	*/
	$(document).on('click', '#playlist li', function () {
		$.ajax({
			type: 'POST',
			url: '/api/unqueue/' + $(this).attr('data-id'),
			success: function () {
				refresh();
			},
			error: function () {
				alert('You are not allowed to do that, sorry.');
			}
		});
		return false;
	});
	$(document).on('click', '#savepl', function () {
		$.ajax({
			type: 'POST',
			url: '/api/savepl/' + $('#lstpl').val(),
			success: function () {
				refresh();
				alert('Playlist savegardee');
			},
			error: function (result) {
				if(result.status == 500)
					alert('Erreur lors de la sauvegarde.');
				else
					alert('You are not allowed to do that, sorry.');
			}
		});
		return false;
	});
	$(document).on('click', '#loadpl', function () {
		$.ajax({
			type: 'POST',
			url: '/api/loadpl/' + $('#lstpl').val(),
			success: function () {
				refresh();
				alert('Playlist chargee');
			},
			error: function (result) {
				if(result.status == 500)
					alert('Playlist inexistante.');
				else
					alert('You are not allowed to do that, sorry.');
			}
		});
		return false;
	});
	$(document).on('click', '#reload', function () {
		$.ajax({
			type: 'POST',
			url: '/api/reload',
			success: function () {
				refresh();
			},
			error: function () {
				alert('You are not allowed to do that, sorry.');
			}
		});
		return false;
	});
	$(document).on('click', '#random', function () {
		$.ajax({
			type: 'POST',
			url: '/api/random',
			success: function () {
				refresh();
			},
			error: function () {
				alert('You are not allowed to do that, sorry.');
			}
		});
		return false;
	});
	$(document).on('click', '#randomcurrent', function () {
		$.ajax({
			type: 'POST',
			url: '/api/randomcurrent',
			success: function () {
				refresh();
			},
			error: function () {
				alert('You are not allowed to do that, sorry.');
			}
		});
		return false;
	});
	$(document).on('click', '#clear', function () {
		$.ajax({
			type: 'POST',
			url: '/api/clear',
			success: function () {
				refresh();
			},
			error: function () {
				alert('You are not allowed to do that, sorry.');
			}
		});
		return false;
	});
	$(document).on('click', '#next', function () {
		$.ajax({
			type: 'POST',
			url: '/api/next',
			success: function () {
				refresh();
			},
			error: function () {
				alert('You are not allowed to do that, sorry.');
			}
		});
		return false;
	});
	
	$.ajax({
		cache: false,
		url: '/api/tracks',
		dataType: 'json',
		success: function (data) {
			data.forEach(function (track) {
				$('<li/>').appendTo('#tracks').attr('data-id', track.id).text(nameFromPath(track.name));
			});
		}
	});
	var refresh = function () {
		$.ajax({
			cache: false,
			url: '/api/playlist',
			dataType: 'json',
			success: function (data) {
				$('#playlist').html('');
				data.forEach(function (track, index) {
					track.name = track.name.split("/"); // Keep clam and fuck windows
					track.name = track.name[track.name.length-1];
					$('<li/>').appendTo('#playlist').attr('data-id', index).text(nameFromPath(track.name));
				});
			}
		});
		$.ajax({
			cache: false,
			url: '/api/playing',
			dataType: 'json',
			success: function (data) {
				if (data) {
					$('#playing').text(nameFromPath(data.name));
				} else {
					$('#playing').text('Nothing');
				}
			}
		});
	};
	setInterval(function () {
		refresh();
	}, 5000);
	refresh();

	//Make the tracklist searchable
	//http://kilianvalkhof.com/2010/javascript/how-to-build-a-fast-simple-list-filter-with-jquery/

	jQuery.expr[':'].Contains = function(a,i,m){
	    return (a.textContent || a.innerText || "").toUpperCase().indexOf(m[3].toUpperCase())>=0;
	};

	listFilter = function(header, list) {
		// create and add the filter form to the header
		var form = $("<form>").attr({"class":"filterform","action":"#"}),
			input = $("<input>").attr({"class":"filterinput","type":"text"});

		$(form).append(input).appendTo(header);

		$(input).change( function () {
			var filter = $(this).val();
			if(filter)
			{
				$(list).find("li:not(:Contains(" + filter + "))").slideUp();
				$(list).find("li:Contains(" + filter + ")").slideDown();
			} else {
				$(list).find("li").slideDown();
			}
		}).keyup( function () {
			// fire the above change event after every letter
			$(this).change();
	  });
	}

	listFilter("#trackshead", "#tracks")

	//Get the filename from a path
	nameFromPath = function(name)
	{
		name = name.split("/"); // Keep clam and fuck windows
		return name[name.length-1];
	}
});