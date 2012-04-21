// Login+Lobby server.

// needs to respond to client disconnect from lobby!

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
  , entryRoomId = 0
  , gameServers = [{message: "http://localhost:3001"
                  , game: "http://localhost:3000"}]
  , dbFrontEnd = "http://localhost:3003";

// Array Remove - By John Resig (MIT Licensed)
// http://ejohn.org/blog/javascript-array-remove/
Array.prototype.remove = function(from, to) {
  var rest = this.slice((to || from) + 1 || this.length);
  this.length = from < 0 ? this.length + from : from;
  return this.push.apply(this, rest);
};

// --- Lobby objects ---
// Client object constructor.
var Client = function (id, authToken, name) {
  var client = new Object();
  client.id = id;
  client.authToken = authToken;
  client.name = name;
  client.room = null; // room id
  client.ready = false;

  // Remove this client from its room.
  client.leaveCurrentRoom = function () {
    if (client.room !== null && client.room !== undefined) {
      client.ready = false;
      var room = rooms[client.room]
      if (room !== null && room !== undefined) {
        room.leave(client);
      }
      client.room = null;
    }
  };

  return client;
};

// Lobby room object constructor.
var Room = function(id, name, canStartGame) {
  var room = new Object();
  room.id = id;
  room.name = name;
  room.canStartGame = canStartGame; // false for entry room
  room.clients = [];  // list of clientIds present in this room

  // Get names of all clients in the room.
  room.clientInfo = function () {
    // build list of client info from clientIds
    var names = []
      , ready = [];
    for (var i = 0; i < room.clients.length; i++) {
      var client = clients[room.clients[i]];
      names.push(client.name);
      ready.push(client.ready);
    }
    return [names, ready];
  };

  // Information client needs to render the room.
  room.info = function () {
    return {"name": room.name, "clients": room.clientInfo()};
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
  room.leave = function (leavingClient) {
    for (var i = 0; i < room.clients.length; i++) {
      var id = room.clients[i];
      if (id === leavingClient.id) {
        room.clients.remove(i);
        nowjs.getGroup(room.id).removeUser(id);
      }
    }
  };

  // Check if all clients are ready.
  room.allReady = function () {
    for (var i = 0; i < room.clients.length; i++) {
      var client = clients[room.clients[i]];
      if (!client.ready) {
        return false;
      }
    }
    return true;
  };

  // Send a chat message to all users in the room.
  room.sendChat = function (name, chatLine) {
    nowjs.getGroup(room.id).now.receiveChat(name, chatLine);
  };

  return room;
};
// Create entrance room.
rooms[entryRoomId] = Room(entryRoomId, "Entry Lobby", false);

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

everyone.now.registerNewUser = function (login, pass) {
  // TODO registration

  // if registration was ok, move user along
  this.now.authenticate(login, pass);
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
    var client = Client(self.user.clientId, authToken, response["username"]);
    clients[self.user.clientId] = client;
    var room = enterLobby(client);
    // Inform clients in the entrance about the new client.
    // Send client back the data it needs for the room.
    // These are kind of redundant.
    nowjs.getGroup(room.id).now.receiveRoomInfo(room.info(), false)
    self.now.receiveRoomInfo(room.info(), true);
    self.now.receiveRooms(roomNames());
  });
};

// Put client in the entry room.
var enterLobby = function (client) {
  rooms[entryRoomId].join(client);
  return rooms[entryRoomId];
};

// Return a list containing the name of each room.
var roomNames = function () {
  var names = [];
  for (var i = 0; i < rooms.length; i++) {
    names[i] = rooms[i].name;
  }
  return names;
};

// Client is creating a new room and joining it.
everyone.now.newRoom = function () {
  var client = clients[this.user.clientId];
  var oldRoom = rooms[client.room];
  client.leaveCurrentRoom();
  var room = Room(rooms.length, client.name + "'s room", true);
  room.join(client);
  rooms.push(room);
  everyone.now.receiveRooms(roomNames());
  nowjs.getGroup(oldRoom.id).now.receiveRoomInfo(oldRoom.info(), false)
  this.now.receiveRoomInfo(room.info(), true);
};

// Client is switching rooms.
everyone.now.joinRoom = function (roomId) {
  var client = clients[this.user.clientId];
  var oldRoom = rooms[client.room];
  client.leaveCurrentRoom();
  var room = rooms[roomId];
  if (!room) {
    return;
  }
  room.join(client);
  nowjs.getGroup(oldRoom.id).now.receiveRoomInfo(oldRoom.info(), false)
  nowjs.getGroup(room.id).now.receiveRoomInfo(room.info(), false)
  this.now.receiveRoomInfo(room.info(), true);
};

// Client is sending a chat line.
everyone.now.sendChat = function (chatLine) {
  var client = clients[this.user.clientId];
  var room = rooms[client.room];
  room.sendChat(client.name, chatLine);
};

// Client is ready to start game.
everyone.now.clientReady = function () {
  client = clients[this.user.clientId];
  if (client === null || client === undefined) {
    return;
  }
  roomId = client.room;
  if (roomId === null || roomId === undefined || roomId === entryRoomId) {
    return;
  }
  room = rooms[roomId];
  if (room === null || roomId === undefined) {
    return;
  }
  client.ready = true;
  nowjs.getGroup(room.id).now.receiveRoomInfo(room.info(), false)
  if (room.allReady()) {
    startGame(room);
  }
};

// --- Game server communication. ---
// All players are reported ready on a room. Start it!
var startGame = function (room) {
  // can a game be started from this room?
  if (!room.canStartGame) {
    return;
  }
  // check if all clients are still ready
  if (!room.allReady()) {
    return;
  }

  // TODO: generate token
  var token = "A";

  // get the best game server and connect to it
  var server = pickGameServer();
  var socket = io.connect(server["message"]);

  // schedule letting clients know when game is ready
  // Important question: are we sure that this will still happen even after
  // this socket goes out of scope?
  // If this socket will get garbage collected, we need to store it
  // (in a global list of open game server sockets?)
  var thisReady = false;
  socket.on('game ready', function () {
    if (!thisReady) {
      console.log("got game ready on token " + token);
      // tell clients wating on this game to start
      nowjs.getGroup(room.id).now.startGame(token, server["game"]);
      thisReady = true;
    }
  });

  // tell game server to start running a game with given token
  socket.emit('start game', token);
};

// TODO: Choose the most suitable game server.
var pickGameServer = function () {
  return gameServers[0];
}

// --- Database server communication ---

// Send the given (message, data) pair to the DB frontend.
// When a response is recieved, call the given callback.
// TODO: may need to hold on to socket to prevent it from being gc'd.
var sendDBMessage = function (message, data, callback) {
  // connect to database frontend
  var socket = io.connect(dbFrontEnd);
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

var checkUserLogin = function (login, pass, callback) {
  sendDBMessage("auth user login", {login: login, pass: pass}, callback);
};

var checkUserAuth = function (authToken, callback) {
  sendDBMessage("auth user token", authToken, callback);
};
