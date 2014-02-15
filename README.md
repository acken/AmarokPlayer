AmarokPlayer
============

A web audio streaming player hooking into the Amarok music player

Dependencies:
    node v0.8
    imagemagic

AmarokPlayer consists of a backend integrating with the Amarok mysql database and filesystem and a web frontend.

Getting started
First of all pull down the source from github. You will need to have installed node.js (sudo apt-get install node) for anything to work. Start the server using "node src/main.js". The first time you run it it will generate a template config file. Go into src/config.js and adjust the config to fit your system. When done just run "node src/main.js" and open a browser on http://localhost:8080/player.

When used on Android Opera seems to be the browser that supports HTML5 audio the best. It also supports playing music in the background after turning the screen off.