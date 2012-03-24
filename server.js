var express = require('express')
  , nowjs = require('now')
  , io = require('socket.io')
  , fs = require('fs')
  , ams = require('ams')
  , clientDir = __dirname + '/client'
  , publicDir = __dirname + '/public'
  , depsDir = __dirname + '/deps'
  , npmDir = __dirname + '/node_modules'
  , gamePort = 3000
  , lobbyPort = 3001
  , players = []
  , tokenToGameId = {};

// Constructor for Player; pulls data from a client's now namespace.
// (may want a separate file for Player object related things)
var Player = function(clientNow) {
  var p = new Object();
  p.game = clientNow.game;
  return p;
}

// use ams to build public filesystem
var buildStaticFiles = function () {
  // client script
  ams.build
    .create(publicDir)
    .add(clientDir + '/game.js')
    .combine({js: 'game.js'})
    .write(publicDir)
  .end();
  // other pages and dependencies
  ams.build
    .create(publicDir)
    .add(depsDir + '/headjs/src/load.js')
    .add(clientDir + '/game.html')
    .write(publicDir)
  .end();
};
buildStaticFiles();

// --- Game client communication ---

// start public-facing Express server, serving publicDir as static content
var app = express.createServer(
    express.logger()
  , express.static(publicDir)  // replace with connect-gzip later
);
app.listen(gamePort);

// start nowjs watching the public server
var everyone = nowjs.initialize(app);

everyone.now.register = function (token) {
  // "this" refers to the client's namespace in this scope
  this.now.game = connectToGame(this, token);
  nowjs.getGroup(this.now.game).addUser(this.user.clientId);
}

// client leaves
nowjs.on('disconnect', function() {
  // same as before, "this" refers to the client's namespace in this scope
  disconnectFromGame(this.user.clientId);
  nowjs.getGroup(this.now.game).removeUser(this.user.clientId);
});

// stubby
var connectToGame = function (client, token) {
  var id = client.user.clientId;
  var p = players[id];
  if (p === null || p === undefined) {
    players[id] = new Player(client.now);
  }
  var game = tokenToGameId[token];
  if (game === undefined || isNaN(game)) {
    // default again
    return 0;
  }
  return game;
};

// stub
var disconnectFromGame = function (clientId) {
  
};

// --- Lobby communication ---

// start private server to communicate with lobby
// ~ will want to add access control to this channel ~
io = io.listen(lobbyPort);

io.sockets.on('connection', function (socket) {
  socket.on('start game', function (token) {
    console.log("got token " + token);
    // set up game

    // done with setup
    socket.emit('game ready');
  });
});
