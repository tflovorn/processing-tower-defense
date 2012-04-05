var io = require('socket.io')
  , mysql = require('mysql-libmysqlclient')
  , dbFrontPort = 3003;

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

// TODO
// Does this have the necessary input params / outputs?
var dbQuery = function (dbConnection, query, callback) {
  // TODO: actual db connection
  // in setup:
  // conn = mysql.createConnectionSync();
  // conn.connectSync(host, user, password, database);
  // if (!conn.connectedSync()) {
  // sys.puts("Connection error " + conn.connectErrno + ": " + conn.connectError);
  // process.exit(1);
  // }
  // here:
  // dbConnection.query(query, callback);
  // on program exit:
  // process.on('exit', function () {
  //  conn.closeSync();
  // }
  callback(result);
}
