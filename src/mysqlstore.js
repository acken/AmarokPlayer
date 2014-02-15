var mysql = require('mysql'),
    config = require('./config.js');


exports.search = function (term, results) {
    var connection = getConnection();
    connection.connect();
    var query = '%'+term+'%';
    connection.query(
        'select * from artists where lower(name) like '+connection.escape(query)+' order by name limit 0,50; \
        select albums.id, albums.name, ifnull(albums.image, 0) as image,ifnull(artists.id, -1) as artistid, ifnull(artists.name, "") as artistname from albums left join artists on albums.artist=artists.id where lower(albums.name) like '+connection.escape(query)+' order by albums.name limit 0,50; \
        select tracks.id,tracks.title,artists.id as artistid, artists.name as artistname,albums.id as albumid, albums.name as albumname, ifnull(albums.image, 0) as image, tracks.length as tracklength, tracks.year as trackyear, tracks.genre, statistics.rating from tracks inner join artists on tracks.artist=artists.id inner join albums on tracks.album=albums.id inner join statistics on tracks.url=statistics.url where lower(title) like '+connection.escape(query)+' order by tracks.title limit 0,50;',
        function(err, resultSets, fields) {
            connection.destroy();
            if (err) {
                results(null, null, null, err);
                return;
            }
            results(resultSets[0], resultSets[1], resultSets[2], err);
    });
}

exports.pathFromFileId = function (fileId, response) {
    var connection = getConnection();
    connection.connect();
    connection.query(
        'select rpath from tracks inner join urls on urls.id=tracks.url where tracks.id='+connection.escape(fileId),
        function(err, resultSet, fields) {
            connection.destroy();
            if (err) {
                response(null, err);
                return;
            }
            response(resultSet[0].rpath, err);
    });
}

exports.getTrack = function (trackId, response) {
    var connection = getConnection();
    connection.connect();
    connection.query(
        'select tracks.id,tracks.title,artists.id as artistid, artists.name as artistname,albums.id as albumid, albums.name as albumname, ifnull(albums.image, 0) as image, tracks.length as tracklength, tracks.year as trackyear, tracks.genre, statistics.rating from tracks inner join artists on tracks.artist=artists.id inner join albums on tracks.album=albums.id inner join statistics on tracks.url=statistics.url where tracks.id='+connection.escape(trackId),
        function (err, resultSet, fields) {
            connection.destroy();
            if (err || resultSet.length == 0) {
                response(null, err);
                return;
            }
            response(resultSet[0], err);
    });
}

exports.getArtist = function (artistId, response) {
    var connection = getConnection();
    connection.connect();
    getArtistInternal(connection, artistId, function (artist, err) {
        connection.destroy();
        response(artist, err);
    });
}

exports.getAlbum = function (albumId, response) {
    var connection = getConnection();
    connection.connect();
    getAlbumInternal(connection, albumId, function (album, err) {
        connection.destroy();
        response(album, err);
    });
}

exports.getImage = function (id, response) {
    var connection = getConnection();
    connection.connect();
    connection.query(
        'select * from images where id='+connection.escape(id),
        function(err, resultSet, fields) {
            connection.destroy();
            if (err) {
                response(null, err);
                return;
            }
            if (resultSet.length === 0) {
                response(null, err);
                return;
            }
            response(resultSet[0].path, err);
        }
    );
}

exports.getGenres = function (response) {
    var connection = getConnection();
    connection.connect();
    connection.query(
        "select genres.*, count(tracks.id) as trackCount from genres left join tracks on tracks.genre=genres.id where not genres.name='' group by genres.id order by count(tracks.id) desc",
        function(err, resultSet, fields) {
            connection.destroy();
            if (err) {
                response(null, err);
                return;
            }
            response(resultSet, err);
        }
    );
}

exports.getRandomTracks = function (genre, minRating, response) {
    var connection = getConnection();
    connection.connect();
    var select = getTrackStatisticsSELECT();
    var where = 'where ';
    if (genre > 0)
        where += 'tracks.genre='+connection.escape(genre);
    if (minRating > 0) {
        if (where.length > 6)
            where += ' and ';
        where += 'statistics.rating >= '+connection.escape(minRating);
    }
    if (where == 'where ')
        where = '';
    var orderBy = 'RAND()';
    var groupBy = 'tracks.id';
    getStatistics(connection, select, where, groupBy, orderBy, function(tracks, err) {
        connection.destroy();
        if (err) {
            response(null, err);
            return;
        }
        response(tracks, err);
    });
}

exports.getLastPlayedTracks = function (response) {
    var orderBy = 'statistics.accessdate';
    var connection = getConnection();
    connection.connect();
    getTracksStatistics(connection, orderBy, function(status, err) {
        connection.destroy();
        response(status, err);
    });
}

exports.getMostPlayedTracks = function (response) {
    var orderBy = 'statistics.playcount';
    var connection = getConnection();
    connection.connect();
    getTracksStatistics(connection, orderBy, function(status, err) {
        connection.destroy();
        response(status, err);
    });
}

exports.getFavoriteTracks = function (response) {
    var orderBy = 'statistics.rating';
    var connection = getConnection();
    connection.connect();
    getTracksStatistics(connection, orderBy, function(status, err) {
        connection.destroy();
        response(status, err);
    });
}

exports.getLastPlayedAlbums = function (response) {
    var orderBy = 'max(statistics.accessdate)';
    var connection = getConnection();
    connection.connect();
    getAlbumsStatistics(connection, orderBy, function(status, err) {
        connection.destroy();
        response(status, err);
    });
}

exports.getMostPlayedAlbums = function (response) {
    var orderBy = 'sum(statistics.playcount)';
    var connection = getConnection();
    connection.connect();
    getAlbumsStatistics(connection, orderBy, function(status, err) {
        connection.destroy();
        response(status, err);
    });
}

exports.getFavoriteAlbums = function (response) {
    var orderBy = 'sum(statistics.rating)';
    var connection = getConnection();
    connection.connect();
    getAlbumsStatistics(connection, orderBy, function(status, err) {
        connection.destroy();
        response(status, err);
    });
}

exports.getLastPlayedArtists = function (response) {
    var orderBy = 'max(statistics.accessdate)';
    var connection = getConnection();
    connection.connect();
    getArtistsStatistics(connection, orderBy, function(status, err) {
        connection.destroy();
        response(status, err);
    });
}

exports.getMostPlayedArtists = function (response) {
    var orderBy = 'sum(statistics.playcount)';
    var connection = getConnection();
    connection.connect();
    getArtistsStatistics(connection, orderBy, function(status, err) {
        connection.destroy();
        response(status, err);
    });
}

exports.getFavoriteArtists = function (response) {
    var orderBy = 'sum(statistics.rating)';
    var connection = getConnection();
    connection.connect();
    getArtistsStatistics(connection, orderBy, function(status, err) {
        connection.destroy();
        response(status, err);
    });
}

exports.getNewAlbums = function (response) {
    var connection = getConnection();
    connection.connect();
    connection.query(
        'select albums.id, albums.name, ifnull(artists.id, -1) as artistid, ifnull(albums.image, 0) as image, artists.name as artistname from tracks inner join albums on tracks.album=albums.id left join artists on albums.artist=artists.id group by albums.id order by createdate desc limit 0, 100',
        function(err, resultSet, fields) {
            connection.destroy();
            if (err) {
                response(null, err);
                return;
            }
            response(resultSet, err);
        }
    );
}

exports.getPlaylists = function (response) {
    var connection = getConnection();
    connection.connect();
    connection.query(
        'select playlists.id, playlists.name as playlistname, playlist_tracks.id as playlisttrackid, playlist_tracks.track_num as playlist_tracknum, ifnull(albums.id, 0) as albumid, albums.name as albumname, ifnull(albumartists.id, ifnull(artists.id,-1)) as artistid, ifnull(albums.image, 0) as image, ifnull(albumartists.name, artists.name) as artistname, tracks.id as trackid, tracks.title, tracks.tracknumber, tracks.length as tracklength, tracks.year as trackyear, tracks.genre, statistics.rating from playlists inner join playlist_tracks on playlists.id=playlist_tracks.playlist_id inner join urls on playlist_tracks.uniqueid=urls.uniqueid inner join tracks on urls.id=tracks.url inner join statistics on urls.id=statistics.url left join albums on tracks.album=albums.id left join artists albumartists on albums.artist=albumartists.id left join artists on tracks.artist=artists.id order by playlists.id, playlist_tracks.track_num',
        function(err, rows, fields) {
            connection.destroy();
            if (err) {
                response(null, err);
                return;
            }
            var list = [];
            var playlist = null;
            for (var i = 0; i < rows.length; i++) {
                if (playlist === null || playlist.id !== rows[i].id) {
                    if (playlist !== null)
                        list.push(playlist);
                    playlist = {
                        id: rows[i].id,
                        name: rows[i].playlistname,
                        tracks: []
                    }; 
                }

                playlist.tracks.push({
                    listtrackid: rows[i].playlisttrackid,
                    listnumber: rows[i].playlist_tracknum,
                    albumid: rows[i].albumid,
                    albumname: rows[i].albumname,
                    artistid: rows[i].artistid,
                    image: rows[i].image,
                    artistname: rows[i].artistname,
                    id: rows[i].trackid,
                    title: rows[i].title,
                    tracknumber: rows[i].tracknumber,
                    tracklength: rows[i].tracklength,
                    trackyear: rows[i].trackyear,
                    genre: rows[i].genre,
                    rating: rows[i].rating
                });
            };
            if (playlist !== null)
                list.push(playlist);
            response(list, err);
        }
    );
}

exports.getYears = function (response) {
    var connection = getConnection();
    connection.connect();
    connection.query(
        'select * from years',
        function(err, resultSet, fields) {
            connection.destroy();
            if (err) {
                response(null, err);
                return;
            }
            response(resultSet, err);
        }
    );
}

exports.updatePlayCount = function (id) {
    var connection = getConnection();
    connection.connect();
    connection.query(
        'update statistics set createdate = ifnull(createdate, UNIX_TIMESTAMP()), accessdate = UNIX_TIMESTAMP(), playcount = playcount + 1 where url = (select url from tracks where id=' + connection.escape(id) + ')',
        function(err, resultSet, fields) {
            connection.destroy();
        }
    );
}

exports.updateRating = function (id, rating, response) {
    var connection = getConnection();
    connection.connect();
    connection.query(
        'update statistics set rating='+connection.escape(rating)+' where url = (select url from tracks where id=' + connection.escape(id) + ')',
        function(err, resultSet, fields) {
            connection.destroy();
            response(err);
        }
    );
}

exports.setAlbumCover = function (id, filePath, response) {
    var connection = getConnection();
    connection.connect();
    connection.query(
        'insert into images (path) values (' + connection.escape(filePath) + '); update albums set image=LAST_INSERT_ID() where id=' + connection.escape(id),
        function(err, resultSet, fields) {
            connection.destroy();
            response(err);
        }
    );
}

exports.newPlaylist = function (name, artists, albums, tracks, response) {
    var connection = getConnection();
    connection.connect();
    var sql = 'insert into playlists (parent_id, name) values (-1, ' + connection.escape(name) + '); SELECT LAST_INSERT_ID() as newid';
    connection.query(
        sql,
        function(err, resultSet, fields) {
            connection.destroy();
            if (err) throw err;
            var playlistId = resultSet[0].insertId;
            appendToPlaylist(playlistId, artists, albums, tracks);
            connection.destroy();
            response(err);
        }
    );
}

exports.appendToPlaylist = function (playlistId, artists, albums, tracks) {
    for (var i = 0; i < tracks.length; i++) {
        addPlaylistTrack(playlistId, tracks[i]);
    };
    for (var i = 0; i < albums.length; i++) {
        getAlbumInternal(albums[i], function (album, err) {
            if (err) throw err;
            for (var t = 0; t < album.tracks.length; t++) {
                addPlaylistTrack(playlistId, album.tracks[t].id);
            }
        });
    };
    for (var i = 0; i < artists.length; i++) {
        getArtistInternal(artists[i], function (artist, err) {
            if (err) throw err;
            for (var a = 0; a < artist.albums.length; a++) {
                for (var t = 0; t < artist.albums[a].tracks.length; t++) {
                    addPlaylistTrack(playlistId, artist.albums[a].tracks[t].id);
                }
            }
        });
    };
}

function getArtistInternal(connection, artistId, response) {
    connection.query(
        'select artists.id, artists.name, tracks.album as albumid, ta.name as albumname, ifnull(ta.image, 0) as image, tracks.id as trackid, ifnull(tracks.title, "") as tracktitle, tracks.tracknumber, tracks.length as tracklength, tracks.year as trackyear, tracks.genre, statistics.rating from artists left join albums on artists.id=albums.artist left join tracks on artists.id=tracks.artist left join albums ta on tracks.album=ta.id left join statistics on tracks.url=statistics.url where artists.id='+connection.escape(artistId)+' group by artists.id, artists.name, tracks.album, ta.name, tracks.id, tracks.title, tracks.tracknumber order by ta.name desc, tracks.tracknumber asc ',
        function(err, resultSet, fields) {
            connection.destroy();
            if (err) {
                response(null, err);
                return;
            }
            var artistname = resultSet[0].name;
            if (artistname  == null || artistname.trim() === "")
                artistname = 'Unknown';
            var artist = { id: resultSet[0].id, name: artistname, albums: [] };
            var currentAlbum = -1;
            var album = null;
            for (var i = 0; resultSet.length > i; i++) {
                var row = resultSet[i];
                if (row.albumid !== currentAlbum) {
                    if (album !== null)
                        artist.albums.push(album);
                    currentAlbum = row.albumid;
                    var albumname = row.albumname;
                    if (albumname == null || albumname.trim() === "")
                        albumname = artistname;
                    album = { id: row.albumid, name: albumname, image: row.image, tracks: [] };
                }
                album.tracks.push({
                    id: row.trackid,
                    title: row.tracktitle,
                    number: row.tracknumber,
                    tracklength: row.tracklength, 
                    trackyear: row.trackyear,
                    genre: row.genre,
                    rating: row.rating
                });
            };
            if (album !== null)
                artist.albums.push(album);
            response(artist, err);
    });
}

function getAlbumInternal(connection, albumId, response) {
    connection.query(
        'select albums.id, albums.name, ifnull(albums.artist, -1) as artistid, ifnull(albums.image, 0) as image, artists.name as artistname, tracks.id as trackid, tracks.title as tracktitle, tracks.tracknumber, trackartists.id as trackartistid, trackartists.name as trackartistname, tracks.length as tracklength, tracks.year as trackyear, tracks.genre, statistics.rating from albums left join artists on albums.artist=artists.id left join tracks on albums.id=tracks.album left join artists trackartists on tracks.artist = trackartists.id inner join statistics on tracks.url=statistics.url where albums.id='+connection.escape(albumId)+' group by albums.id, albums.name, albums.artist, artists.name, tracks.id, tracks.title, tracks.tracknumber order by tracks.tracknumber',
        function(err, resultSet, fields) {
            if (err) {
                response(null, err);
                return;
            }
            var artistname = resultSet[0].artistname;
            if (artistname  == null || artistname.trim() === "")
                artistname = 'Unknown';
            var albumname = resultSet[0].name;
            if (albumname  == null || albumname.trim() === "")
                albumname = 'Unknown';
            var album = { artistid: resultSet[0].artistid, artistname: artistname, id: resultSet[0].id, name: albumname, image: resultSet[0].image, tracks: [] };
            for (var i = 0; resultSet.length > i; i++) {
                var row = resultSet[i];
                var track = { id: row.trackid, name: row.tracktitle, tracks: [] };
                album.tracks.push({
                    id: row.trackid,
                    title: row.tracktitle,
                    number: row.tracknumber,
                    artistid: row.trackartistid,
                    artistname: row.trackartistname,
                    tracklength: row.tracklength, 
                    trackyear: row.trackyear,
                    genre: row.genre,
                    rating: row.rating
                });
            };
            response(album, err);
    });
}

function getTracksStatistics(connection, orderBy, response) {
    var select = getTrackStatisticsSELECT();
    var groupBy = 'tracks.id';
    getStatistics(connection, select, '', groupBy, orderBy, function(tracks, err) {
        if (err) {
            response(null, err);
            return;
        }
        response(tracks, err);
    });
}

function getAlbumsStatistics(connection, orderBy, response) {
    var select = 'select albums.id, albums.name, ifnull(artists.id, -1) as artistid, ifnull(albums.image, 0) as image, artists.name as artistname';
    var groupBy = 'albums.id';
    var where = 'where not albums.name = ""';
    getStatistics(connection, select, where, groupBy, orderBy, function(albums, err) {
        if (err) {
            response(null, err);
            return;
        }
        response(albums, err);
    });
}

function getArtistsStatistics(connection, orderBy, response) {
    var select = 'select artists.id, artists.name';
    var groupBy = 'artists.id';
    var where = 'where not artists.name = ""';
    getStatistics(connection, select, where, groupBy, orderBy, function(artists, err) {
        if (err) {
            response(null, err);
            return;
        }
        response(artists, err);
    });
}

function getStatistics(connection, select, where, groupBy, orderBy, response) {
    connection.query(
        select + ' from statistics inner join tracks on statistics.url=tracks.url inner join artists on tracks.artist=artists.id inner join albums on tracks.album=albums.id ' +
        where + ' ' +
        'group by ' + groupBy + ' ' +
        'order by ' + orderBy + ' desc ' +
        'limit 0, 100',
        function(err, resultSet, fields) {
            if (err) {
                response(null, err);
                return;
            }
            response(resultSet, err);
        }
    );
}

function getTrackStatisticsSELECT() {
    return 'select ifnull(albums.id, 0) as albumid, albums.name as albumname, ifnull(artists.id, -1) as artistid, ifnull(albums.image, 0) as image, artists.name as artistname, tracks.id, tracks.title, tracks.tracknumber, tracks.length as tracklength, tracks.year as trackyear, tracks.genre, statistics.rating';
}

function addPlaylistTrack(playlistId, trackId) {
    var connection = getConnection();
    connection.connect();
    var sql = 'insert into playlist_tracks (playlist_id, track_num, url, title, album, artist, length, uniqueid) select '+connection.escape(playlistId)+' as playlistid, (select ifnull(max(track_num + 1), 1) from playlist_tracks where playlist_id='+connection.escape(playlistId)+') as nexttracknum, urls.uniqueid, t.title, albums.name, artists.name, t.length, urls.uniqueid from tracks t inner join urls on urls.id=t.url inner join albums on albums.id=t.album inner join artists on artists.id=albums.artist where t.id='+connection.escape(trackId);
    connection.query(
        sql,
        function(err, resultSet, fields) {
            connection.destroy();
            if (err) throw err;
        }
    );
}

function getConnection() {
    return mysql.createConnection(config.mysql_config);
}
