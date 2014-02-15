var currentPlaylist = [];
var currentTrack = -1;
var playlists = null;

$(document).ready(function() {
    $("#searchText").click(function () {
        $(this).select();
    });
    $(document.body).keyup(function(ev) {
        if (ev.which === 13) { // 13 is ENTER
            var content = $('#searchText').val();
            searchFor(content);
        }
    });

    $("#jquery_jplayer_1").jPlayer({
        solution:"flash, html",
        swfPath: "js/jQuery.jPlayer.2.5.0",
        supplied: "mp3"
    });
	
	$("#jquery_jplayer_1").bind($.jPlayer.event.ended, function(event) {
   		if (currentTrack !== -1) {
            $.ajax({
                type: "PATCH",
                url: '/tracks/'+currentPlaylist[currentTrack].id+'/increaseplaycount',
                data: {}
            }).done(function( msg ) {
            });
        }
        playNext();
  	});

	$('#playPrevious').click( function() {
		playPrevious();
	 });
	$('#playNext').click( function() {
		playNext();
	 });

    $.getJSON('/playlists/full', function(lists) {
        playlists = lists;
        showPlaylists();
    });

    setCurrentlyPlayingText("");
});

function compileTemplate(name, destination, data) {
    var source   = $(name).html();
    var template = Handlebars.compile(source);
    var html    = template(data);
    $(destination).html(html);
}

function compileTrackList(destination, tracks) {
    for (var i = 0; tracks.length > i; i++) {
        tracks[i].artistname = escapeTrackQuotes(tracks[i].artistname);
        tracks[i].albumname = escapeTrackQuotes(tracks[i].albumname);
        tracks[i].title = escapeTrackQuotes(tracks[i].title);
        tracks[i].tracktime = millisecondsToTime(tracks[i].tracklength);
    };
    compileTemplate(
        "#trackListTemplate",
        destination,
        { items: tracks });
}

function millisecondsToTime(milli) {
    var milliseconds = milli % 1000;
    var seconds = Math.floor((milli / 1000) % 60);
    var minutes = Math.floor((milli / (60 * 1000)) % 60);

    return minutes + ":" + padLeft(seconds.toString(), '00');
}

function padLeft(str, padString) {
    return padString.substring(0, padString.length - str.length) + str;
}

function searchFor(term) {
    search(term.toLowerCase(), function(result) {
        for (var i = 0; result.artists.length > i; i++) {
            result.artists[i].name = escapeTrackQuotes(result.artists[i].name);
        };
        for (var i = 0; result.albums.length > i; i++) {
            result.albums[i].artistname = escapeTrackQuotes(result.albums[i].artistname);
            result.albums[i].name = escapeTrackQuotes(result.albums[i].name);
        };
        
        compileTrackList(
            "#trackList",
            result.tracks);
        compileTemplate(
            "#albumListTemplate",
            "#albumList",
            { items: result.albums});
        compileTemplate(
            "#artistListTemplate",
            "#artistList",
            { items: result.artists});

        $('#searchResultList').removeClass('invisibleList').addClass('visibleContent');
    });
}

function addToPlaylist(id, title, artistId, artistName, albumId, albumName, image, tracklength, rating) {
    currentPlaylist.push({
        index: currentPlaylist.length,
        id: id,
        title: escapeTrackQuotes(title),
        artistid: artistId,
        artistname: escapeTrackQuotes(artistName),
        albumid: albumId,
        albumname: escapeTrackQuotes(albumName),
        image: image,
        tracklength: tracklength,
        tracktime: millisecondsToTime(tracklength),
        rating: rating
    });
    compileTemplate(
        "#currentPlaylistTemplate",
        "#currentPlaylist",
        { items: currentPlaylist});
    highlightPlayingTrack();
}

function removeFromPlaylist(index) {
    currentPlaylist.splice(index, 1);
    for (var i = currentPlaylist.length - 1; i >= 0; i--) {
        if (currentPlaylist[i].index > index)
            currentPlaylist[i].index--;
    };
    compileTemplate(
        "#currentPlaylistTemplate",
        "#currentPlaylist",
        { items: currentPlaylist});
    if (currentTrack === index)
        play(currentTrack);
    highlightPlayingTrack();
}

function showCurrentPlaylist() {
    show('#currentPlaylist');
    maximizePlayer();
}

function maximizePlayer() {
    $('#player').removeClass().addClass('playerLarge');
    $('#playerImg').removeClass().addClass('playerImgLarge');
    $('#menuBar').removeClass('menuBarSmallPlayer');
    $(window).bind('scroll', function(){
        var playerImg = $('#playerImg');
        if($(window).scrollTop() > (playerImg.offset().top+playerImg.height())) {
            $(window).unbind('scroll');
            var details = $('#playerDetails');
            if (details.is(':visible'))
                details.toggle();
            minimizePlayer();
            $(window).bind('scroll', function(){
                if($(window).scrollTop() == 0) {
                    $(window).unbind('scroll');
                    maximizePlayer();
                }
            });
            
        }
    });
}

function minimizePlayer() {
    $('#playerImg').removeClass().addClass('playerImgSmall');
    $('#player').removeClass().addClass('playerSmall');
    $('#menuBar').addClass('menuBarSmallPlayer');
    $(window).unbind('scroll');
}

function showPlaylists() {
    show('#playlists');
    compileTemplate(
        "#playlistsTemplate",
        "#playlists",
        { items: playlists });
}

function showSearch() {
    $('#searchText').focus();
    show('#searchResult');
}

function showTop25(stats, type) {
    $.getJSON('/statistics/' + type + '/' + stats, function(items) {
        var title = '';
        if (stats == 'favorite')
            title = 'Favorite ';
        if (stats == 'mostplayed')
            title = 'Most Played ';
        if (stats == 'recent')
            title = 'Recently Played ';
        if (stats == 'new')
            title = 'New ';

        if (type === 'artists') {
            title += 'Artists';
            for (var a = 0; items.length > a; a++) {
                items[a].name = escapeTrackQuotes(items[a].name);
            };
            compileTemplate(
                "#artistListTemplate",
                "#top25List",
                { items: items});
        }
        if (type === 'albums') {
            title += 'Albums';
            for (var a = 0; items.length > a; a++) {
                items[a].name = escapeTrackQuotes(items[a].name);
            };
            compileTemplate(
                "#albumListTemplate",
                "#top25List",
                { items: items });
        }
        if (type === 'tracks') {
            title += 'Tracks';
            compileTrackList(
                "#top25List",
                items);
        }
        
        $('#top25Title').text(title);
        show('#top25');
    });
}

function showRandom() {
    $.getJSON('/genres', function(items) {
        var title = 'Random Tracks';
        compileTemplate(
            "#randomTrackTemplate",
            "#top25List",
            { items: items });

        $('#top25Title').text(title);
        show('#top25');
    });
}

function showArtist(id, onListed) {
    $.getJSON("/artists/" + id, function(artist) {
        artist.name = escapeTrackQuotes(artist.name);
        for (var i = 0; artist.albums.length > i; i++) {
            artist.albums[i].name = escapeTrackQuotes(artist.albums[i].name);
            artist.albums[i].artistname = artist.name;
            for (var a = 0; artist.albums[i].tracks.length > a; a++) {
                artist.albums[i].tracks[a].artistid = artist.id;
                artist.albums[i].tracks[a].artistname = artist.name;
                artist.albums[i].tracks[a].title = escapeTrackQuotes(artist.albums[i].tracks[a].title);
            };
        };
        
        compileTemplate(
            "#artistTemplate",
            "#artistInfo",
            { items: artist });
        if (onListed !== null)
            onListed();
    });
    show('#artistInfo');
}

function showAlbum(artistId, albumId) {
    if (artistId !== -1) {
        showArtist(artistId, function () {
            expandTrackList(albumId);
            var offset = $('#tracks'+albumId).offset();
            offset.left -= 20;
            offset.top -= 120;
            $('html, body').animate({
                scrollTop: offset.top,
                scrollLeft: offset.left
            });
        });
        return;
    }

    $.getJSON("/albums/" + albumId, function(album) {
        album.name = escapeTrackQuotes(album.name);
        for (var a = album.tracks.length - 1; a >= 0; a--) {
            album.tracks[a].artistname = escapeTrackQuotes(album.tracks[a].artistname);
            album.tracks[a].title = escapeTrackQuotes(album.tracks[a].title);
            album.tracks[a].albumid = album.id;
            album.tracks[a].albumname = album.name;
            album.tracks[a].image = album.image;
        };

        compileTemplate(
            "#albumTemplate",
            "#albumInfo",
            { items: album });
        show('#albumInfo');
    });
}

function expandTrackList(id) {
    $('#tracks'+id).toggle(400);
}

function expandPlayList(id) {
    $('#playlist'+id).toggle(400);
}

function imageClicked(imageId, albumId, artistname, albumname, trackname) {
    if (imageId > 0) {
        showImage(imageId, albumId, artistname, albumname, trackname);
        return;
    }
    showAssignImage(imageId, albumId, artistname, albumname, trackname);
}

function showImage(imageId, albumId, artistname, albumname, trackname) {
    $('#fullSizeImageId').val(imageId);
    $('#fullSizeImagealbumId').val(albumId);
    $('#fullSizeImagealbumName').val(albumname);
    $('#fullSizeImageartistName').val(artistname);
    $('#fullSizeImagetrackName').val(trackname);
    $('#fullSizeImageDisplay').attr('src', '/image/'+imageId);
    $('#albumShowImage').modal('show');
}

function replaceImage() {
    var imageId = $('#fullSizeImageId').val();
    var albumId = $('#fullSizeImagealbumId').val();
    var albumname = $('#fullSizeImagealbumName').val();
    var artistname = $('#fullSizeImageartistName').val();
    var trackname = $('#fullSizeImagetrackName').val();
    $('#albumShowImage').modal('hide');
    showAssignImage(imageId, albumId, artistname, albumname, trackname);
}

function showAssignImage(imageId, albumId, artistname, albumname, trackname) {
    var pattern = artistname.replace(' ', '+');
    pattern += '+'+albumname.replace(' ', '+');
    if (trackname !== null)
        pattern += '+'+trackname.replace(' ', '+');
    $('#assignImageAlbumId').val(albumId);
    $('#assignImageOriginalImageId').val(imageId);
    $('#assignImageUrl').val('');
    $('#assignImageSuggestions').attr('href', 'https://www.google.no/search?q='+pattern+'&source=lnms&tbm=isch');
    $('#albumAssignImage').modal('show');
    $('#assignImageUrl').focus();
}

function assignImage() {
    var albumId = $('#assignImageAlbumId').val();
    var url = $('#assignImageUrl').val();
    var originalImage = $('#assignImageOriginalImageId').val();
    $.post('/albums/'+albumId+'/assignimage', { imageurl: url }, function( data ) {
        $.getJSON("/albums/" + albumId, function(album) {
            window.setTimeout(function() {
                $('img[name="' + albumId + '"]').each(function() {
                    this.src = '/thumbnail/'+album.image;
                });
            },500);
            
        });
    });
    $('#albumAssignImage').modal('hide');
}

function ratingNoUpdateClick(e, me, name) {
    var position = e.clientX - me.offsetLeft;
    var starWidth = 13;
    var rating = Math.round(position / starWidth).toFixed(0);
    $('#' + name + 'Value').val(rating);
    setUIRating($('#'+name), rating);
}

function ratingClick(e, me, trackId) {
    var position = e.clientX - me.offsetLeft;
    setRating(position, trackId, function (rating) {
        setUIRating($('#goldStar'+trackId), rating);
    });
}

function setRating(offset, trackId, uiUpdate) {
    var starWidth = 13;
    var rating = Math.round(offset / starWidth).toFixed(0);
    $.post('/tracks/'+trackId+'/rating/'+rating, {}, function (data) {
        uiUpdate(rating)
    });
}

function setUIRating(control, rating) {
    control.removeClass().addClass('goldStar rating'+rating);
}

function show(name) {
    hideAll();
    $(name).removeClass('invisibleList').addClass('visibleList');
    $('#mnu'+name.substring(1)).addClass('active');
}

function hideAll() {
    $('#currentPlaylist').removeClass('visibleList').addClass('invisibleList');
    $('#playlists').removeClass('visibleList').addClass('invisibleList');
    $('#searchResult').removeClass('visibleList').addClass('invisibleList');
    $('#top25').removeClass('visibleList').addClass('invisibleList');
    $('#artistInfo').removeClass('visibleList').addClass('invisibleList');
    $('#albumInfo').removeClass('visibleList').addClass('invisibleList');
    $('[id^=mnu]').removeClass('active');
    minimizePlayer();
}

function search(term, callback) {
    $.getJSON("/search/" + term, function(data) {
        callback(data);
    });
}

function chooseTrackAction(id,title,artistId,artistName,albumId,albumName,image,tracklength,rating) {
    $('#tracksActionType').val('track');
    $('#tracksActionValue').val(id);
    $('#tracksAction').modal('show');
}

function chooseAlbumAction(id) {
    $('#tracksActionType').val('album');
    $('#tracksActionValue').val(id);
    $('#tracksAction').modal('show');
}

function chooseArtistAction(id) {
    $('#tracksActionType').val('artist');
    $('#tracksActionValue').val(id);
    $('#tracksAction').modal('show');
}

function choosePlaylistAction(id) {
    $('#tracksActionType').val('playlist');
    $('#tracksActionValue').val(id);
    $('#tracksAction').modal('show');
}

function chooseRandomTracksAction(genre, minrating) {
    $('#tracksActionType').val('random');
    $('#tracksActionValue').val(genre);
    $('#tracksActionValue2').val(minrating);
    $('#tracksAction').modal('show');
}

function handleTracksAction(action) {
    var type = $('#tracksActionType').val();
    var id = $('#tracksActionValue').val();
    var id2 = $('#tracksActionValue2').val();
    if (type === 'track') {
        $.getJSON("/tracks/" + id, function(track) {
            if (action === 'enqueue' || action === 'replace') {
                if (action === 'replace') {
                    currentPlaylist = [];
                    currentTrack = -1;
                }
                playTrack(track.id, track.title, track.artistid, track.artistname, track.albumid, track.albumname, track.image, track.tracklength, track.rating);
            }
        });
    }
    if (type === 'album') {
        if (action === 'enqueue' || action === 'replace') {
            if (action === 'replace') {
                currentPlaylist = [];
                currentTrack = -1;
            }
            playAlbum(id);
        }
    }
    if (type === 'artist') {
        if (action === 'enqueue' || action === 'replace') {
            if (action === 'replace') {
                currentPlaylist = [];
                currentTrack = -1;
            }
            playArtist(id);
        }
    }
    if (type === 'playlist') {
        if (action === 'enqueue' || action === 'replace') {
            if (action === 'replace') {
                currentPlaylist = [];
                currentTrack = -1;
            }
            playPlaylist(parseInt(id));
        }
    }
    if (type === 'random') {
        if (action === 'enqueue' || action === 'replace') {
            if (action === 'replace') {
                currentPlaylist = [];
                currentTrack = -1;
            }
            playRandom(parseInt(id), parseInt(id2));
        }
    }
    $('#tracksAction').modal('hide');
}

function replaceTracks() {

}

function playTrack(id,title,artistId,artistName,albumId,albumName,image,tracklength,rating) {
    addToPlaylist(id,title,artistId,artistName,albumId,albumName,image,tracklength,rating);
    if (currentPlaylist.length === 1)
        play(0);
}

function highlightPlayingTrack() {
    $("[id^=currentList]").removeClass('currentlyPlaying');
    $("#currentList"+currentTrack).addClass('currentlyPlaying');
    if (currentTrack >= 0 && currentTrack < currentPlaylist.length && currentPlaylist.length > 0) {
        var image = $('#playerImg');
        image.attr('src', '/image/' + currentPlaylist[currentTrack].image);
        image.attr('name', currentPlaylist[currentTrack].albumid);
        compileTemplate(
            "#trackDetailsTemplate",
            "#playerDetails",
            currentPlaylist[currentTrack]);
    }
}

function play(index) {
    if (index < 0 || index >= currentPlaylist.length) {
        if ($('#jquery_jplayer_1').data().jPlayer.status.paused)
            setCurrentlyPlayingText("");
        return;
    }
    $.getJSON("/streamingtoken/"+currentPlaylist[index].id, function(response) {
        currentTrack = index;
        $("#jquery_jplayer_1").jPlayer("setMedia", {
            mp3: '/stream/' + response.token
        });
        $("#jquery_jplayer_1").jPlayer("play");
        setCurrentlyPlayingText(currentPlaylist[index].artistname + " - " + currentPlaylist[index].title)
        highlightPlayingTrack();
    });
}

function setCurrentlyPlayingText(text) {
    $("#currentTrackInfo").text(text);
}

function playerDetailsClick(e, details) {
    var me = $('#greyStarCurrentlyPlaying')[0];
    var position = e.clientX - details.parentNode.offsetLeft;
    var positionY = e.clientY - me.offsetTop;
    if (position < 0 || position > me.width)
        return;
    if (positionY < 0 || positionY > me.height)
        return;
    setRating(position, currentPlaylist[currentTrack].id, function (rating) {
        setUIRating($('#goldStarCurrentlyPlaying'), rating);
        setUIRating($('#goldStar'+currentPlaylist[currentTrack].id), rating);
    });
}

function playerImageClick(e, me) {
    var left = e.clientX - me.offsetLeft;
    var position = Math.round((left * 100) / me.width).toFixed(0);
    if (position < 20)
        playPrevious();
    else if (position > 80)
        playNext();
    else
        togglePlay();
}

function playNext() {
    play(currentTrack + 1);
}

function playPrevious() {
    play(currentTrack - 1)
}

function togglePlay() {
    if (currentPlaylist.length == 0)
        return;
    var controls = $('#playerControlsPause');
	if ($('#jquery_jplayer_1').data().jPlayer.status.paused) {
        $("#jquery_jplayer_1").jPlayer("play");
        controls.attr('src', 'img/playerControlsPause.png');
    } else {
        $("#jquery_jplayer_1").jPlayer("pause");
        controls.attr('src', 'img/playerControlsPlay.png');
    }
}

function showPlayerControls() {
    if (currentPlaylist.length == 0)
        return;
	
    $('#playerDetails').fadeIn("fast", function() {
    });
    setTimeout(function() {
        hidePlayerControls();
    },
    4000);
}

function hidePlayerControls() {
    $('#playerDetails').fadeOut("slow", function() {
    });
}

function playAlbum(id) {
    $.getJSON("/albums/" + id, function(album) {
        for (var i = 0; album.tracks.length > i; i++) {
            playTrack(album.tracks[i].id, album.tracks[i].title, album.tracks[i].artistid, album.tracks[i].artistname, album.id, album.name, album.image,album.tracks[i].tracklength,album.tracks[i].rating);
        };
    });
}

function playArtist(id) {
    $.getJSON("/artists/" + id, function(artist) {
        for (var i = 0; artist.albums.length > i; i++) {
            for (var a = 0; artist.albums[i].tracks.length > a; a++) {
                playTrack(artist.albums[i].tracks[a].id, artist.albums[i].tracks[a].title, artist.id, artist.name, artist.albums[i].id, artist.albums[i].name, artist.albums[i].image,artist.albums[i].tracks[a].tracklength,artist.albums[i].tracks[a].rating);
            };
        };        
    });
}

function playPlaylist(id) {
    for (var i = 0; i < playlists.length; i++) {
        if (playlists[i].id === id) {
            for (var a = 0; a < playlists[i].tracks.length; a++) {
                var track = playlists[i].tracks[a];
                playTrack(track.id, track.title, track.artistid, track.artistname, track.albumid, track.albumname, track.image,track.tracklength,track.rating);
            }
            break;
        }
    }
}

function playRandom(genre, minrating) {
    $.getJSON("/tracks/random/" + genre + "/" + minrating, function(tracks) {
        for (var i = 0; tracks.length > i; i++) {
            playTrack(tracks[i].id, tracks[i].title, tracks[i].artistid, tracks[i].artistname, tracks[i].albumid, tracks[i].albumname, tracks[i].image, tracks[i].tracklength, tracks[i].rating);
        };
    });
}

function escapeTrackQuotes(title) {
    if (title == null)
        return '';
    return title.replace(/'/g, '`');
}
