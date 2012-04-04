var startLobby = function () {
  var auth = "A";
  now.ready(function() {
    now.register(auth);
  }); 
};

now.receiveRoomInfo = function(info) {
  alert(info);
}
