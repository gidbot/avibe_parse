var SC = require('node-soundcloud');
var https = require('https');
var fs = require('fs');
var CronJob = require('cron').CronJob;
var Parse = require('parse/node').Parse;
Parse.initialize("RdJVAvoHpmjpqxndp45yD7Ty56HJqM98r0Jt640I", "VdjZ4XIHO3W6Kfwj39S0pUHyTy04VhIAW436fvvX");

var request = require('request').defaults({ encoding: null });


// Initialize client 
SC.init({
  id: '59eb1477141bd5ebe585541570e6d9c8',
  secret: '16f66a79807d8981088dc416bea52ed7',
});

var download = function (playlist, callback) {
	if (playlist.artwork_url) {
		var url = playlist.artwork_url.replace("large", "t200x200");
		request.get(url, function (error, response, body) {
	    	if (!error && response.statusCode == 200) {
	        	var data = new Buffer(body).toString('base64');
	        	var toReturn = { 
	        		base64: data.toString() 
	        	} 
	        	callback(toReturn, playlist);
	    	}
		});
	} else { 
		callback(null, playlist);
	}
}

var trackAlreadyExists = function (track, playlist, user_id, callback) {
	var Playlist = Parse.Object.extend("Playlists");
	var query = new Parse.Query(Playlist);
	query.equalTo("user", user_id);
	query.equalTo("title", track.title);
	query.equalTo("name", playlist.title);
	query.first({
	  success: function(object) {
	  	var found = (object) ? true: false; 
	  	callback(found, track, playlist);
	  },
	  error: function(error) {
	  	console.log('Searching for Track Error');
	  	console.log(error); 
	    callback(true, track, playlist);
	  }
	});
}

var savePlaylist = function (playlist, callback) {
	playlist.save(null, {
	  success: function(playlistName) {
	    console.log('Added Playlist Name');
	  },
	  error: function(playlistName, error) {
	    console.log('Save Playlist Error');
	    console.log(error);
	  }
	});
}

var checkName = function (playlist, user_id, user_name) {
	var PlaylistName = Parse.Object.extend("PlaylistNames");
	var query = new Parse.Query(PlaylistName);
	query.equalTo("user", user_id);
	query.equalTo("name", playlist.title);
	query.first({
	  success: function(object) {
	  	var found = (object) ? true: false;
	  	if (!found) {
			var playlistName = new PlaylistName();
			playlistName.set("user", user_id); 
			playlistName.set("userName", user_name); 
			playlistName.set("name", playlist.title); 
			if (playlist.artwork_url) {
				download(playlist, function (image) {
					var parseFile = new Parse.File('artwork.png', image);
					parseFile.save().then(function() {
						playlistName.set("image", parseFile);
						savePlaylist(playlistName);
					}, function(error){	
						console.log('Error Saving Image');
					});
				}); 
			} else { 
				savePlaylist(playlistName);
			}	
	  	} 
	  },
	  error: function(error) {
	  	console.log('Searching for Playlist Error');
	  	console.log(error); 
	    callback(true, playlist);
	  }
	});
}

var getParseUser = function (sc_id, callback) {
	var User = Parse.Object.extend("User");
	var query = new Parse.Query(User);
	query.equalTo("soundcloudUsername", sc_id);
	query.first({
	  success: function(object) {
	  	var name = object.get('name');
	  	callback(object.id, name);
	  },
	  error: function(error) {
	  	console.log('Get User Error');
	  	console.log(error); 
	  }
	});

}

var run_post = function (sc_id) { 
	SC.get('/users/'+sc_id+'/tracks', function (err, tracks) {

	}); 
}; 

var run_playlist = function (sc_id) {
	SC.get('/users/'+sc_id+'/playlists', function (err, playlists) {
	  if ( err ) {
	  	console.log(err); 
	  } else {
	  	getParseUser(sc_id, function (parseUserId, parseUserName) {
		    var totalCheck = 0; 
		    function runTracks (i, j) {
		    	if (i < playlists.length) {
					if (j < playlists[i].tracks.length) {
						trackAlreadyExists(playlists[i].tracks[j], playlists[i], parseUserId, function (exists, track, playlist) {
							if (!exists) {
								var ParseTrack = Parse.Object.extend("Playlists");
								var parseTrack = new ParseTrack();
								parseTrack.set('artist', track.user.username); 
								parseTrack.set('name', playlist.title); 
								parseTrack.set('source', 'soundcloud'); 
								parseTrack.set('user', parseUserId); 
								parseTrack.set('title', track.title); 
								parseTrack.set('userName', parseUserName); 
								parseTrack.save(null, {
								  success: function(track) {
								    console.log('Success');
								    j = j+1; 
								    runTracks(i, j++);
								  },
								  error: function(track, error) {
								    console.log('Track Save Failure');
								    console.log(error);
								  }
								});
							} else {
								j = j+1; 
								runTracks(i, j);
							}
						}); 
					} else {
						console.log('new playlist'); 
						checkName(playlists[i], parseUserId, parseUserName); 
						i = i+1; 
						runTracks(i, 0);
					}
		    	} else {
		    		console.log('Done');
		    	}

			}
	  		runTracks(0, 0);  
	    });
	  }
	});
}

var sc_ids = [
	'mugatunesofficial', 
	'complexmag', 
	'highonmusic1', 
	'david_perkins14', 
	'gideon-rosenthal'
];

var fiveJob = new CronJob({
  cronTime: '00 00 17 * * *',
  onTick: function() {
  	console.log('running');
   	for (var i = 0; i < sc_ids.length; i++) {
		run_playlist(sc_ids[i]);
		run_post(sc_ids[i]);
	}
  },
  start: false,
  timeZone: 'America/Los_Angeles'
});

var eightJob = new CronJob({
  cronTime: '00 00 8 * * *',
  onTick: function() {
  	console.log('running');
   	for (var i = 0; i < sc_ids.length; i++) {
		run_playlist(sc_ids[i]);
		run_post(sc_ids[i]);
	}
  },
  start: false,
  timeZone: 'America/Los_Angeles'
});

console.log('Script Started');
fiveJob.start();
eightJob.start();


