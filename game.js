var express = require('express')
  , nowjs = require('now')
  , io = require('socket.io')
  , fs = require('fs')
  , ams = require('ams')
  , clientDir = __dirname + '/client'
  , publicDir = __dirname + '/game_public'
  , depsDir = __dirname + '/deps'
  , gamePort = 3000
  , lobbyMessagePort = 3001
  , clients = []
  , games = []
  , tokenToGameId = {};

// --- Object definitions. ---
// Client object constructor.
var Client = function (id, name) {
  var client = new Object();
  client.id = id;
  client.name = name;
  client.game = null;

  return client;
}

// Game object constructor.
var Game = function (id, token) {
  var game = new Object();
  game.id = id;
  game.token = token;
  game.clients = [];

  // Get names of all clients in the game.
  // stub
  game.clientNames = function () {
    var names = [];
    for (var i = 0; i < game.clients.length; i++) {
      names.push(clients[game.clients[i]].name);
    }
    return names
  };

  // Return information client needs to render the game.
  game.info = function () {
    return [game.clientNames()];
  };

  // Add a client to this game.
  game.join = function (client) {
    // Don't allow a client to swap games.
    if (client.game && client.game !== game.id) {
      return null;
    }
    // If the client is new, add them.
    if (client.game === null) {
      client.game = game.id;
      if (game.clients.indexOf(client.id) === -1) {
        game.clients.push(client.id);
      }
      nowjs.getGroup(game.id).addUser(client.id);
    }
  };

  // Remove a client from this game.
  // stub
  game.leave = function (client) {
    
  };

  return game;
}
games[0] = Game(0, 0);
tokenToGameId[0] = 0;

// --- Start the server. ---
// Use ams to build public filesystem for game.
var buildGameStatic = function () {
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
buildGameStatic();

// start public-facing Express server, serving publicDir as static content
var app = express.createServer(
    express.logger()
  , express.static(publicDir)  // replace with connect-gzip later
);
app.listen(gamePort);

// start nowjs watching the public server
var everyone = nowjs.initialize(app);

// --- Game to client communication ---
// Client wants to enter the game associated with the given token.
// Also comes with an auth object; TODO: check this with login server.
everyone.now.register = function (token, auth, name) {
  // Check if auth object is ok

  // authorized; let client into the game
  // "this" refers to the client's namespace in this scope
  var client = Client(this.user.clientId, name);
  clients[this.user.clientId] = client;
  var game = connectToGame(client, token);
  // Send client back the data it needs to render the game.
  this.now.recieveGameInfo(game.info());
}

// client leaves
nowjs.on('disconnect', function() {
  // same as before, "this" refers to the client's namespace in this scope
  disconnectFromGame(this.user.clientId);
  nowjs.getGroup(this.now.game).removeUser(this.user.clientId);
});

// Connect the client with given id to the game with given token.
// stubby
var connectToGame = function (client, token) {
  var gameId = tokenToGameId[token];
  if (gameId === undefined || isNaN(gameId)) {
    // default again
    gameId = 0;
  }
  games[gameId].join(client);
  return games[gameId];
};

// Remove the client with given id from its game.
// stub
var disconnectFromGame = function (clientId) {
  
};

// --- Lobby to game communication ---
// start private server to communicate with lobby
// ~ will want to add access control to this channel ~
io = io.listen(lobbyMessagePort);

io.sockets.on('connection', function (socket) {
  socket.on('start game', function (token) {
    console.log("got token " + token);
    // set up game

    // done with setup
    socket.emit('game ready');
  });
});
