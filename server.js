var express = require('express')
  , nowjs = require('now')
  , ams = require('ams')
  , clientDir = __dirname + '/client'
  , publicDir = __dirname + '/public'
  , depsDir = __dirname + '/deps'
  , npmDir = __dirname + '/node_modules';


var app = express.createServer();

app.listen(3000);

var everyone = nowjs.initialize(app);

var players = []
  , tokenToRoomId = {};

// construct a Player object by pulling data from a client's now namespace
var Player = function(clientNow) {
  var p = new Object();
  p.token = clientNow.token;
  p.room = clientNow.room;
  return p;
}

// client enters with token
nowjs.on('connect', function() {
  // "this" refers to the client's namespace in this scope
  this.now.room = connectToGame(this.user.clientId, token);
  players[this.user.clientId] = new Player(this.now);
  nowjs.getGroup(this.now.room).addUser(this.user.clientId);
});

// client leaves
nowjs.on('disconnect', function() {
  // same as before, "this" refers to the client's namespace in this scope
  disconnectFromGame(this.user.clientId);
  nowjs.getGroup(this.now.room).removeUser(this.user.clientId);
});

// stubby
var connectToGame = function (clientId) {
  var t = players[clientId].token;
  if (t === null || t === undefined) {
    // default room
    return 0;
  }
  var room = tokenToRoomId[t];
  if (room === undefined || isNaN(room)) {
    // default again
    return 0;
  }
  return room;
};

// stub
var disconnectFromGame = function (clientId) {
  
};

// use ams to build web filesystem
var buildStaticFiles = function () {
  // client script
  ams.build
    .create(publicDir)
    .add(clientDir + '/client.js')
    .combine({js: 'client.js'})
    .write(publicDir)
  .end();
  // other pages and dependencies
  ams.build
    .create(publicDir)
    .add(depsDir + '/headjs/src/load.js')
    .add(clientDir + '/index.html')
    .write(publicDir)
  .end();
};
buildStaticFiles();
