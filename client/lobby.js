// Read the cookie with given name.
// Code pulled directly from http://www.quirksmode.org/js/cookies.html
var readCookie = function (name) {
  var nameEQ = name + "=";
  var ca = document.cookie.split(';');
  for(var i=0;i < ca.length;i++) {
    var c = ca[i];
    while (c.charAt(0)==' ') c = c.substring(1,c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
  }
  return null;
};

// Enter the lobby page.
var startLobby = function () {
  var auth = readCookie("authToken");
  alert(auth);
  now.ready(function() {
    now.register(auth);
  }); 
};

// Registration is done; get room info.
now.receiveRoomInfo = function (info) {
  alert(info);
};

// This client is ready to start the game.
var clientReady = function () {
  now.ready(function () {
    now.clientReady();
  });
};

// The game this client was waiting on is starting!
// Move over to the game page. Transfer auth and game tokens in the url.
// (game server may be on a different domain, so these can't go in a cookie)
now.startGame = function (gameToken, gameServer) {
  var auth = readCookie("authToken")
    , url = gameServer + "/game.html?auth=" + auth + "&game=" + gameToken;
  window.location = url;
};
