var sys = require('sys')
  , io = require('socket.io')
  , mysql = require('mysql-libmysqlclient')
  , dbFrontPort = 3003;

// Database object encapsulates DB library connection API.
var Database = function (host, user, password, database) {
  var conn = mysql.createConnectionSync();
  conn.connectSync(host, user, password, database);
  if (!conn.connectedSync()) {
    sys.puts("Connection error " + conn.connectErrno + ": " +
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
  socket.on("auth user login", function (login, pass) {
    // TODO: check user login info
    var ok = true;
    var authToken = "A";
    // user ok
    socket.emit("response", {ok: ok, authToken: authToken});
  });

  socket.on("auth user token", function (authToken) {
    // TODO: check user token
    var ok = true;
    // user ok
    socket.emit("response", {ok: ok});
  });
});
