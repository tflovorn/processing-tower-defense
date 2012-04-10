var express = require('express')
  , nowjs = require('now')
  , io = require('socket.io')
  , ioClient = require('socket.io-client')
  , fs = require('fs')
  , ams = require('ams')
  , clientDir = __dirname + '/client'
  , publicDir = __dirname + '/game_public'
  , depsDir = __dirname + '/deps'
  , gamePort = 3000
  , lobbyMessagePort = 3001
  , clients = []
  , games = []
  , tokenToGameId = {}
  , dbFrontEnd = "http://localhost:3003";

// Array Remove - By John Resig (MIT Licensed)
// http://ejohn.org/blog/javascript-array-remove/
Array.prototype.remove = function(from, to) {
  var rest = this.slice((to || from) + 1 || this.length);
  this.length = from < 0 ? this.length + from : from;
  return this.push.apply(this, rest);
};

// --- Object definitions. ---

// Client object constructor.
var Client = function (id, authToken, name) {
  var client = new Object();
  client.id = id;
  client.name = name;
  client.authToken = authToken;
  client.game = null; // client's game id

  return client;
}

// Game object constructor.
var Game = function (id, token) {
  var game = new Object();
  game.id = id;
  game.token = token;
  game.clients = [];
  game.state = null;

  // Get names of all clients in the game.
  game.clientNames = function () {
    var names = [];
    for (var i = 0; i < game.clients.length; i++) {
      names.push(clients[game.clients[i]].name);
    }
    return names
  };

  // Return information client needs to render the game.
  game.info = function () {
    return {id: game.id, token: game.token, clients: game.clientNames()};
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
  game.leave = function (leavingClient) {
    for (var i = 0; i < game.clients.length; i++) {
      var client = clients[game.clients[i]]
      if (client.id === leavingClient.id) {
        game.clients.remove(i);
        nowjs.getGroup(game.id).removeUser(client.id);
      }
    }
  };

  return game;
}

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
// Client also comes with an auth token - check if this is OK.
everyone.now.register = function (gameToken, authToken) {
  var self = this;
  // Check if auth object is ok
  checkUserAuth(authToken, function (response) {
    if (!response["ok"]) {
      return;
    }
    // authorized; let client into the game
    var client = Client(self.user.clientId, authToken, response["username"])
    clients[self.user.clientId] = client;
    var game = connectToGame(client, gameToken);
    // Send client back the data it needs to render the game.
    if (game !== null && game !== undefined) {
      self.now.receiveGameInfo(game.info());
    }
  });
};

// Client has left.
nowjs.on('disconnect', function() {
  disconnectFromGame(this.user.clientId);
});

// Connect the client with given id to the game with given token.
var connectToGame = function (client, token) {
  var gameId = tokenToGameId[token];
  if (gameId === undefined || isNaN(gameId)) {
    return null;
  }
  games[gameId].join(client);
  return games[gameId];
};

// Remove the client with given id from its game.
var disconnectFromGame = function (clientId) {
  var client = clients[clientId];
  if (client && client.game !== null) {
    games[client.game].leave(client);
  }
};

// --- Lobby to game communication ---
// start private server to communicate with lobby
// ~ will want to add access control to this channel ~
io = io.listen(lobbyMessagePort);

io.sockets.on('connection', function (socket) {
  socket.on('start game', function (token) {
    console.log("got token " + token);
    // is there already a game at this token?
    var newGame = true;
    var maybeId = tokenToGameId[token];
    if (maybeId !== undefined) {
      var maybeGame = games[maybeId];
      if (maybeGame && maybeGame.token === token) {
        newGame = false;
      }
    }
    // set up game if necessary
    if (newGame) {
      var id = games.length;
      var game = Game(id, token);
      games[id] = game;
      tokenToGameId[token] = id;
    }
    // done with setup
    socket.emit('game ready');
  });
});

// --- Database server communication ---

// Send the given (message, data) pair to the DB frontend.
// When a response is recieved, call the given callback.
// TODO: may need to hold on to socket to prevent it from being gc'd.
var sendDBMessage = function (message, data, callback) {
  // connect to database frontend
  var socket = ioClient.connect(dbFrontEnd);
  // prepare to recieve response
  var responded = false;
  socket.on("response", function (response) {
    if (!responded) {
      callback(response);
      responded = true;
    }
  });
  // send message
  socket.emit(message, data);
}

var checkUserAuth = function (authToken, callback) {
  sendDBMessage("auth user token", authToken, callback);
};

var reportGame = function (winner, loser, callback) {
  sendDBMessage("game outcome", {winner: winner, loser: loser}, callback);
};
