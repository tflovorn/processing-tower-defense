var util = require('util')
  , io = require('socket.io')
  , mysql = require('mysql-libmysqlclient')
  , dbFrontPort = 3003;

// Database object encapsulates DB library connection API.
var Database = function (host, user, password, database) {
  var conn = mysql.createConnectionSync();
  conn.connectSync(host, user, password, database);
  if (!conn.connectedSync()) {
    util.puts("Connection error " + conn.connectErrno + ": " +
             conn.connectError);
    process.exit(1);
  }

  // Run a database query. When a result is recieved, call the given callback.
  // callback should be a function taking two parameters (error, result).
  // The result API is detailed at
  // https://github.com/Sannis/node-mysql-libmysqlclient/wiki/Quick-overview
  // and 
  // http://sannis.github.com/node-mysql-libmysqlclient/api.html
  this.query = function (query, callback) {
    conn.query(query, callback);
  }

  this.close = function () {
    conn.closeSync();
  }

  return this;
};

// Create the global database connection.
// TODO: create database setup script (commented due to no db to test on)
// TODO: get rid of hard-coded Database parameters.

// var db = Database("localhost", "dbUser", "dbPass", "ptdef");
// process.on('exit', function () {
//   db.close();
// });

io = io.listen(dbFrontPort);

io.sockets.on('connection', function (socket) {
  // TODO: when actual DB calls are here, will need to use callbacks containing
  // the socket.emit("reponse", ...) to isolate IO delay.

  // Check if user login info is OK. Return a unique token for this user.
  socket.on("auth user login", function (login, pass) {
    // TODO: check user login info
    var ok = true;
    var authToken = "A";
    // user ok
    socket.emit("response", {ok: ok, authToken: authToken});
  });

  // Check if user's token is OK. Return the user's name.
  socket.on("auth user token", function (authToken) {
    // TODO: check user token
    var ok = true;
    var username = "Bob";
    // user ok
    socket.emit("response", {ok: ok, username: username});
  });

  // Report the outcome of a game. Increment winner's win-count by 1; increment
  // loser's lose-count by 1.
  // TODO: (winner, loser) could be names or auth tokens. Decide which.
  socket.on("game outcome", function (winner, loser) {
    var ok = true;

    socket.emit("response", {ok: ok});
  });

  // Get the user with given name's statistics.
  // TODO: other stats?
  socket.on("user stats", function (username) {
    var ok = true;
    var stats = {wins: 0, losses: 0};

    socket.emit("response", {ok: ok, stats: stats});
  });

  // May want to implement persisting a game.
  // TODO: what parts of the game are relevant?
  socket.on("game persist", function (gameData) {
    var ok = true;
    var gameId = "A";

    socket.emit("response", {ok: ok, gameId: gameId});
  });
});
