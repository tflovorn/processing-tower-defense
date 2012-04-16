// --- Utility functions ---

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

// Fill the roomList with given room names.
// http://www.mredkj.com/tutorials/tutorial005.html
var fillRoomList = function (roomNames) {
  var roomList = document.getElementById('roomList');
  // remove existing list (bugged unless iteration starts at the end)
  // (might be able to start iteration at 0 using Resig's Array.remove)
  var i;
  for (i = roomList.length-1; i >= 0; i--) {
    roomList.remove(i);
  }
  // fill with roomNames
  for (i = 0; i < roomNames.length; i++) {
    var room = document.createElement('option');
    room.text = roomNames[i];
    room.value = i;
    try {
      roomList.add(room, null); // standards compliant; doesn't work in IE
    }
    catch(ex) {
      roomList.add(room); // IE only
    }
  }
};

// Write a line to the chatDisplay textarea.
var writeText = function (text) {
  var chat = document.getElementById('chatDisplay');
  chat.value += text + "\n";
};

// --- Server interaction ---

// Enter the lobby page.
var startLobby = function () {
  var auth = readCookie("authToken");
  now.ready(function() {
    now.register(auth);
  }); 
};

// Joined a new room: accept room info.
// (end up here after registration, room creation, or basic room join)
now.receiveRoomInfo = function (myRoomInfo, roomNames) {
  fillRoomList(roomNames);
  writeText("--- Joined room: " + myRoomInfo["name"]);
};

// Recieve a chat message.
now.receiveChat = function (user, chatLine) {
  writeText(user + ": " + chatLine);
};

// Send a chat message.
var sendChat = function () {
  var chatLine = document.getElementById('chatWrite').value;
  now.ready(function () {
    now.sendChat(chatLine);
  });
};

// Create a new room for this client.
var newRoom = function () {
  now.ready(function () {
    now.newRoom();
  });
};

// Join an existing room.
var joinRoom = function () {
  var selectedRoom = document.getElementById('roomList').selectedIndex;
  now.ready(function () {
    now.joinRoom(selectedRoom);
  });
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
    , url = gameServer + "/ptd.html?auth=" + auth + "&game=" + gameToken;
  window.location = url;
};
