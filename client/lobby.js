// Read the cookie with given name.
// Code pulled directly from http://www.quirksmode.org/js/cookies.html
var readCookie = function(name) {
  var nameEQ = name + "=";
  var ca = document.cookie.split(';');
  for(var i=0;i < ca.length;i++) {
    var c = ca[i];
    while (c.charAt(0)==' ') c = c.substring(1,c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
  }
  return null;
};

var startLobby = function () {
  var auth = readCookie("authToken");
  alert(auth);
  now.ready(function() {
    now.register(auth);
  }); 
};

now.receiveRoomInfo = function(info) {
  alert(info);
}
