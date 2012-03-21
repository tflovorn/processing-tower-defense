var io = require('socket.io-client')
  , games = []
  , gameServers = ["http://localhost:3001"];

// stub
var pickGameServer = function () {
  return gameServers[0];
}

// mostly unimplemented
var readyGame = function (gameId) {
  // check if all clients are ready

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

  });

  // tell game server to start
  socket.emit('start game', token);
};

readyGame(0);
