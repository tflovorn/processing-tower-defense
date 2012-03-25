var startLobby = function () {
  var auth = 0;
  now.ready(function() {
    now.register(auth, "Test user");
  }); 
};

now.recieveRoomInfo = function(info) {
  alert(info);
}
