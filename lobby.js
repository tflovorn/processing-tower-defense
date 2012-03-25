var express = require('express')
  , nowjs = require('now')
  , io = require('socket.io-client')
  , ams = require('ams')
  , clientDir = __dirname + '/client'
  , publicDir = __dirname + '/lobby_public'
  , depsDir = __dirname + '/deps'
  , lobbyPort = 3002
  , clients = []
  , rooms = []
  , gameServers = [{message: "http://localhost:3001"
                  , game: "http://localhost:3000"}];

// Use ams to build public filesystem.
var buildLobbyStatic = function () {
  // client script
  ams.build
    .create(publicDir)
    .add(clientDir + '/lobby.js')
    .combine({js: 'lobby.js'})
    .write(publicDir)
  .end();
  // other pages and dependencies
  ams.build
    .create(publicDir)
    .add(depsDir + '/headjs/src/load.js')
    .add(clientDir + '/lobby.html')
    .write(publicDir)
  .end();

};
buildLobbyStatic();

// Start lobby public-facing server.
var app = express.createServer(
    express.logger()
  , express.static(publicDir)
);
app.listen(lobbyPort);

// Start nowjs watching the public server.
var everyone = nowjs.initialize(app);

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

// Client enters lobby.
// Comes in carrying an auth object from the login server (TODO: check this).
everyone.now.register = function (auth, name) {
  // check if auth object is ok

  // authorized; let client into the front room of the lobby
  var client = Client(this.user.clientId, name);
  clients[this.user.clientId] = client;
  var room = enterLobby(client);
  // Send client back the data it needs for the room.
  this.now.recieveRoomInfo(room.info());
};

var enterLobby = function (client) {
  var entryRoom = 0;
  rooms[entryRoom].join(client);
  return rooms[entryRoom];
};

// --- Game server communication. ---
// All players are reported ready on a game. Start it!
var readyGame = function (gameId) {
  // check if all clients are still ready

  // generate token
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

// Choose the most suitable game server.
var pickGameServer = function () {
  return gameServers[0][message];
}
