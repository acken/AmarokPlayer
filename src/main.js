var fileSystem = require('fs'),
    path = require('path');

var configFile = path.join(__dirname, 'config.js');
if (!fileSystem.existsSync(configFile)) {
    var configuration =
        "exports.mysql_config = {\n" +
        "    host     : 'localhost',\n" +
        "    port     : 3306,\n" +
        "    database : 'dbname',\n" +
        "    user     : 'username',\n" +
        "    password : 'password',\n" +
        "    multipleStatements: true\n" +
        "};\n" +
        "\n" +
        "exports.port = 8080;\n" +
        "exports.imagepath = '/path/to/directory/to/store/images/in';\n" +
        "exports.username = 'guest';\n" +
        "exports.password = 'guest';";
    fileSystem.writeFileSync(configFile, configuration);
}

var express = require('express'),
    http = require('http'),
    https = require('https'),
    easyimg = require('easyimage'),
    store = require('./mysqlstore.js'),
    config = require('./config.js');

process.on('uncaughtException', function(err) {
    console.log(err);
});

var acceptedStreamingTokens = [];
var app = express();
var server = http.createServer(app);

var auth = express.basicAuth(function(user, pass){
    var isAuthenticated = config.username == user & config.password == pass;
    return isAuthenticated;
});

app.use(function (req, res, next) {
    next();
});

app.use(express.bodyParser());

app.configure(function(){
    app.use("/player", auth, function(next) { next(); });
    app.use('/player', express.static(__dirname + '/client'));
});

app.get('/search/:term', auth, function(req, res) {
    var term = req.params.term;
    console.log('Handling: /search/' + term);
    store.search(term, function(artists, albums, tracks, err) {
        if (err) throw err;
        res.send({artists: artists, albums: albums, tracks: tracks});
    })
});

app.get('/tracks/:id', auth, function (req, res) {
    var id = req.params.id;
    store.getTrack(id, function(track, err) {
        if (err) throw err;
        res.send(track);
    });
});

app.get('/artists/:id', auth, function (req, res) {
    var id = req.params.id;
    store.getArtist(id, function(artist, err) {
        if (err) throw err;
        res.send(artist);
    });
});

app.get('/albums/:id', auth, function (req, res) {
    var id = req.params.id;
    store.getAlbum(id, function(album, err) {
        if (err) throw err;
        res.send(album);
    });
});

app.get('/image/:id', auth, function (req, res) {
    var id = req.params.id;
    store.getImage(id, function(filePath, err) {
        filePath = getImagePath(filePath);
        var stat = fileSystem.statSync(filePath);
        res.writeHead(200, {
            'Content-Length': stat.size
        });
        var readStream = fileSystem.createReadStream(filePath);
        readStream.on('data', function(data) {
            res.write(data);
        });
        readStream.on('end', function() {
            res.end();
        });
    });
});

app.get('/thumbnail/:id', auth, function (req, res) {
    var id = req.params.id;
    store.getImage(id, function(filePath, err) {
        filePath = getImagePath(filePath);
        var filename = path.basename(filePath);
        var dir = path.dirname(filePath);
        var thumb = path.join(dir, 'thumb_' + filename);
        if (!fileSystem.existsSync(thumb)) {
            easyimg.thumbnail({
                    src:filePath, dst:thumb,
                    width:50, height:50,
                    x:0, y:0
                },
                function(err, image) {
                    if (err) {
                        console.log('Make sure imagemagic is installed for thumbnails');
                        throw err;
                    }
                    respondImage(res, thumb);
                    return;
                }
            );
        } else {
            respondImage(res, thumb);
        }
    });
});

function respondImage(res, filePath) {
    var stat = fileSystem.statSync(filePath);
    res.writeHead(200, {
        'Content-Length': stat.size
    });
    var readStream = fileSystem.createReadStream(filePath);
    readStream.on('data', function(data) {
        res.write(data);
    });
    readStream.on('end', function() {
        res.end();
    });
}

app.get('/genres', auth, function (req, res) {
    store.getGenres(function (genres, err) {
        if (err) throw err;
        res.send(genres);
    });
});

app.get('/tracks/random/:genre/:minrating', auth, function (req, res) {
    var genre = parseInt(req.params.genre);
    var minRating = parseInt(req.params.minrating);
    store.getRandomTracks(genre, minRating, function (tracks, err) {
        if (err) throw err;
        res.send(tracks);
    });
});


app.get('/statistics/tracks/recent', auth, function (req, res) {
    store.getLastPlayedTracks(function (tracks, err) {
        if (err) throw err;
        res.send(tracks);
    });
});

app.get('/statistics/tracks/mostplayed', auth, function (req, res) {
    store.getMostPlayedTracks(function (tracks, err) {
        if (err) throw err;
        res.send(tracks);
    });
});

app.get('/statistics/tracks/favorite', auth, function (req, res) {
    store.getFavoriteTracks(function (tracks, err) {
        if (err) throw err;
        res.send(tracks);
    });
});

app.get('/statistics/albums/recent', auth, function (req, res) {
    store.getLastPlayedAlbums(function (albums, err) {
        if (err) throw err;
        res.send(albums);
    });
});

app.get('/statistics/albums/mostplayed', auth, function (req, res) {
    store.getMostPlayedAlbums(function (albums, err) {
        if (err) throw err;
        res.send(albums);
    });
});

app.get('/statistics/albums/favorite', auth, function (req, res) {
    store.getFavoriteAlbums(function (albums, err) {
        if (err) throw err;
        res.send(albums);
    });
});

app.get('/statistics/artists/recent', auth, function (req, res) {
    store.getLastPlayedArtists(function (artists, err) {
        if (err) throw err;
        res.send(artists);
    });
});

app.get('/statistics/artists/mostplayed', auth, function (req, res) {
    store.getMostPlayedArtists(function (artists, err) {
        if (err) throw err;
        res.send(artists);
    });
});

app.get('/statistics/artists/favorite', auth, function (req, res) {
    store.getFavoriteArtists(function (artists, err) {
        if (err) throw err;
        res.send(artists);
    });
});

app.get('/statistics/albums/new', auth, function (req, res) {
    store.getNewAlbums(function (albums, err) {
        if (err) throw err;
        res.send(albums);
    });
});

app.get('/playlists/full', auth, function (req, res) {
    store.getPlaylists(function (list, err) {
        if (err) throw err;
        res.send(list);
    })
});

app.get('/years', auth, function (req, res) {
    store.getYears(function (years, err) {
        if (err) throw err;
        res.send(years);
    });
});

app.patch('/tracks/:id/increaseplaycount', auth, function (req, res) {
    var id = req.params.id;
    store.updatePlayCount(id);
});

app.post('/albums/:id/assignimage', auth, function (req, res) {
    var id = req.params.id;
    var url = req.body.imageurl;
    var filePath = path.join(config.imagepath, (new Date()).getTime().toString());
    var file = fileSystem.createWriteStream(filePath);
    try {
        var request = http.get(url, function(response) {
            response.pipe(file);
        });
    } catch (ex) {
        try {
            var request = https.get(url, function(response) {
                response.pipe(file);
            });
        } catch (ex2) {
            res.status(500);
            res.end();
            return;
        }
    }
    store.setAlbumCover(id, filePath, function(err) {
        if (err) throw err;
        res.status(204);
        res.end();
    });
});

app.post('/tracks/:id/rating/:rating', auth, function (req, res) {
    var id = req.params.id;
    var rating = req.params.rating;
    store.updateRating(id, rating, function (err) {
        if (err) throw err;
        res.status(204);
        res.end();
    });
});

app.get('/streamingtoken/:trackId', auth, function (req, res) {
    var id = req.params.trackId;
    var now = new Date();
    // 5 hours
    now.setSeconds(now.getSeconds() + 18000);
    var entry = {
        token: guid(),
        address: req.socket.remoteAddress,
        trackId: id,
        expiry: now
    };
    acceptedStreamingTokens.push(entry);
    res.send({ token: entry.token });
});

app.get('/stream/:token', function (req, res) {
    var token = req.params.token;
    var foundToken = getValidStreamingToken(req, token);
    if (foundToken === null) {
        console.log("Invalid token " + token);
        res.status(404);
        res.end();
        return;
    }

    var fileId = foundToken.trackId;
    store.pathFromFileId(fileId, function(filePath) {
        filePath = filePath.substring(1); // Remove . from the start of the string
        if (!fileSystem.existsSync(filePath))
            return;
        var contentType = contentTypeFromFile(filePath);
        var header = {};
        var range = req.headers.range; 
        if (range !== undefined) {
            fileSystem.readFile(filePath, 'binary', function(err, file) {
                var parts = range.replace(/bytes=/, "").split("-"); 
                var partialstart = parts[0]; 
                var partialend = parts[1]; 

                var total = file.length; 

                var suggestedEnd = total-1;
                if (isDesktopChrome(req)) {
                    // Workaround since chrome hangs when sending all when
                    // asked to send 0- ...
                    var chunksize = 1024 * 1000;
                    var start = parseInt(partialstart, 10); 
                    suggestedEnd = total - start > chunksize ? start + chunksize : total-1;
                }
                var end = partialend ? parseInt(partialend, 10) : suggestedEnd;
                console.log(getTimestamp() + ' Playing: ' + filePath + ' ' + start + ' to ' + end);

                header["Connection"] = "keep-alive";
                header["Content-Length"]= (end-start)+1;
                header["Content-Range"] = "bytes " + start + "-" + end + "/" + (total);
                header["Content-Type"] = contentType;
                header["Accept-Ranges"] = "bytes";

                res.writeHead(206, header); 
                res.write(file.slice(start, end)+'0', "binary");
                res.end();
            });
        } else {
            console.log(getTimestamp() + ' Playing: ' + filePath);
            var stat = fileSystem.statSync(filePath);
            res.writeHead(200, {
                'Content-Type': contentType, 
                'Content-Length': stat.size
            });
            var readStream = fileSystem.createReadStream(filePath);
            readStream.on('data', function(data) {
                res.write(data);
            });
            readStream.on('end', function() {
                res.end();
            });
        }
    });
});

app.post('/playlists/addnew', auth, function (req, res) {
    var name = req.body.name;
    var artists = req.body.artists;
    var albums = req.body.albums;
    var tracks = req.body.tracks;

    store.newPlaylist(name, artists, albums, tracks, function(err) {
        if (err) throw err;
        res.status(204);
        res.end();
    });
});

app.post('/playlists/:id/append', auth, function (req, res) {
    var id = req.params.id;
    var artists = req.body.artists;
    var albums = req.body.albums;
    var tracks = req.body.tracks;

    store.appendToPlaylist(id, artists, albums, tracks);
    res.status(204);
    res.end();
});

function getImagePath(filePath) {
    if (filePath === null) {
        filePath = path.join(__dirname, 'placeholder.png');
    }
    // Fallback to config path when not finding image
    if (!fileSystem.existsSync(filePath)) {
        filePath = path.join(config.imagepath, path.basename(filePath));
        if (!fileSystem.existsSync(filePath))
            filePath = path.join(__dirname, 'placeholder.png');
    }
    return filePath;
}

function isDesktopChrome(req) {
    var agent = req.headers['user-agent'];
    return agent.indexOf('Chrome') !== -1 && agent.indexOf('Mobile') === -1;
}

function getTimestamp() {
    var date = new Date(Date.now());
    var options = {
        weekday: "long", year: "numeric", month: "short",
        day: "numeric", hour: "2-digit", minute: "2-digit"
    };

    return date.toLocaleTimeString("en-us", options);
}

function getValidStreamingToken(req, token) {
    var validTokens = [];
    var now = new Date();
    var foundToken = null;
    for (var i = acceptedStreamingTokens.length - 1; i >= 0; i--) {
        if (now > acceptedStreamingTokens[i].expiry) {
            continue;
        }
        if (acceptedStreamingTokens[i].token !== token) {
            validTokens.push(acceptedStreamingTokens[i]);
            continue;
        }
        if (acceptedStreamingTokens[i].address !== req.socket.remoteAddress) {
            validTokens.push(acceptedStreamingTokens[i]);
            continue;
        }
        validTokens.push(acceptedStreamingTokens[i]);
        foundToken = acceptedStreamingTokens[i];
    };
    acceptedStreamingTokens = validTokens;
    return foundToken;
}

function s4() {
  return Math.floor((1 + Math.random()) * 0x10000)
             .toString(16)
             .substring(1);
};

function guid() {
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
         s4() + '-' + s4() + s4() + s4();
}

function contentTypeFromFile(filePath) {
    var ext = getExtension(filePath);
    if (ext === 'mp3')
        return 'audio/mp3';
    if (ext === 'ogg')
        return 'audio/ogg';
    if (ext === 'flac')
        return 'audio/flac';
    return 'application/binary'
}

function getExtension(filename) {
    var ext = path.extname(filename||'').split('.');
    return ext[ext.length - 1];
}

server.listen(config.port);
console.log('AmarokClient started on port %s', server.address().port);
