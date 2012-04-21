var host = "localhost:3002";

// Create a cookie with the given parameters. Expires on browser closing.
// Code derived from http://www.quirksmode.org/js/cookies.html
// May want to use https://github.com/carhartl/jquery-cookie instead.
var createCookie = function (name, value, days) {
  if (days) {
    var date = new Date();
    date.setTime(date.getTime()+(days*24*60*60*1000));
    var expires = "; expires="+date.toGMTString();
  }
  else var expires = "";
  document.cookie = name+"="+value+expires+"; path=/";
};

var eraseCookie = function (name) {
  createCookie(name, "", -1, "localhost");
};

// Action initiated by clicking login button.
var doLogin = function (form) {
  var login = form.login.value;
  var pass = form.pass.value;
  now.ready(function () {
    now.authenticate(login, pass);
  });
};

// Recieve login authorization from the server.
now.receiveLoginInfo = function (ok, authToken, lobbyPath) {
  if (!ok) {
    return;
  }
  // Save authToken in a cookie.
  // TODO: domain shouldn't be hard-coded.
  createCookie("authToken", authToken, 1);
  // Move the client to the lobby page.
  window.location = "http://" + host + "/lobby.html";
};

// Action initiated by clicking the register button.
var doRegister = function (form) {
  var login = form.login.value;
  var pass = form.pass.value;
  if (pass !== form.passConfirm.value) {
    return;
  }
  now.ready(function () {
    now.registerNewUser(login, pass);
  });
};
