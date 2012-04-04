var express = require('express')
  , nowjs = require('now')
  , io = require('socket.io-client')
  , ams = require('ams')
  , clientDir = __dirname + '/client'
  , publicDir = __dirname + '/lobby_public'
  , depsDir = __dirname + '/deps'
  , lobbyPath = clientDir + '/lobby.html'
  , loginLobbyPort = 3002
  , clients = []
  , rooms = []
  , gameServers = [{message: "http://localhost:3001"
                  , game: "http://localhost:3000"}]
  , dbFrontEnd = "http://localhost:3003";

// --- Lobby objects ---
// Client object constructor.
var Client = function (id, name) {
  var client = new Object();
  client.id = id;
  client.name = name;
  client.room = null;

  // Remove this client from its room.
  client.leaveCurrentRoom = function () {
    if (client.room !== null && client.room !== undefined) {
      var room = rooms[client.room]
      if (room !== null && room !== undefined) {
        room.leave(client);
      }
    }
  };

  return client;
};

// Lobby room object constructor.
var Room = function(id, name) {
  var room = new Object();
  room.id = id;
  room.name = name;
  room.clients = [];
  room.chat = [];

  // Get names of all clients in the room.
  // stub
  room.clientNames = function () {
    // build list of client names from clientIds
    var names = [];
    return names;
  };

  // Information client needs to render the room.
  room.info = function () {
    return [room.name, room.clientNames(), room.chat];
  };

  // Add a client to this room.
  room.join = function (client) {
    // if client is already in a room, leave it
    client.leaveCurrentRoom();
    // join this room
    client.room = room.id;
    room.clients.push(client.id);
    nowjs.getGroup(room.id).addUser(client.id);
  };

  // Remove a client from this room.
  // stub
  room.leave = function (client) {

  };

  return room;
};
// Create entrance room.
rooms[0] = Room(0, "Entry Lobby");

// --- Start login + lobby server ---
// Use ams to build public filesystem.
var buildLobbyStatic = function () {
  // page scripts
  ams.build
    .create(publicDir)
    .add(clientDir + '/login.js')
    .add(clientDir + '/lobby.js')
    .write(publicDir)
  .end();
  // other pages and dependencies
  ams.build
    .create(publicDir)
    .add(depsDir + '/headjs/src/load.js')
    .add(clientDir + '/index.html')
    .add(lobbyPath)
    .write(publicDir)
  .end();

};
buildLobbyStatic();

// Start express server.
var app = express.createServer(
    express.logger()
  , express.static(publicDir)
);
app.listen(loginLobbyPort);

// Start nowjs watching the public server.
var everyone = nowjs.initialize(app);

// --- Login ---
// Take user login information; return (ok, authToken, lobbyPath)
// login/pass are probably unencrypted here - should encrypt them!
everyone.now.authenticate = function (login, pass) {
  var self = this;
  checkUserLogin(login, pass, function (response) {
    self.now.receiveLoginInfo(response["ok"], response["authToken"]
                            , lobbyPath);
  });
};

// --- Lobby management ---
// Client enters lobby, carrying an auth object from the login server.
everyone.now.register = function (authToken) {
  var self = this;
  // check if auth object is ok
  checkUserAuth(authToken, function (response) {
    if (!response["ok"]) {
      return;
    }
    // authorized; let client into the front room of the lobby
    var client = Client(self.user.clientId, authToken);
    clients[self.user.clientId] = client;
    var room = enterLobby(client);
    // Send client back the data it needs for the room.
    self.now.receiveRoomInfo(room.info());
  });
};

var enterLobby = function (client) {
  var entryRoom = 0;
  rooms[entryRoom].join(client);
  return rooms[entryRoom];
};

// --- Game server communication. ---
// All players are reported ready on a game. Start it!
var readyGame = function (gameId) {
  // TODO: check if all clients are still ready

  // TODO: generate token
  var token = 0;

  // get the best game server and connect to it
  var server = pickGameServer();
  var socket = io.connect(server);

  // schedule letting clients know when game is ready
  // Important question: are we sure that this will still happen even after
  // this socket goes out of scope?
  // If this socket will get garbage collected, we need to store it
  // (in a global list of open game server sockets?)
  socket.on('game ready', function () {
    console.log("got game ready on token " + token);
    // tell clients wating on this game to start

  });

  // tell game server to start running a game with given token
  socket.emit('start game', token);
};

// TODO: Choose the most suitable game server.
var pickGameServer = function () {
  return gameServers[0][message];
}

// --- Database server communication ---

// Send the given (message, data) pair to the DB frontend.
// When a response is recieved, call the given callback.
// TODO: may need to hold on to socket to prevent it from being gc'd.
var sendDBMessage = function (message, data, callback) {
  // connect to database frontend
  var socket = io.connect(dbFrontEnd);
  // prepare to recieve response
  socket.on("response", function (response) {
    callback(response);
  });
  // send message
  socket.emit(message, data);
}

var checkUserLogin = function (login, pass, callback) {
  sendDBMessage("auth user login", {login: login, pass: pass}, callback);
};

var checkUserAuth = function (authToken, callback) {
  sendDBMessage("auth user token", authToken, callback);
};
