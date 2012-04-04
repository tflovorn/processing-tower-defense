// Create a cookie with the given parameters. Expires on browser closing.
// Code derived from http://www.quirksmode.org/js/cookies.html
// May want to use https://github.com/carhartl/jquery-cookie instead.
var createCookie = function(name, value, domain) {
  document.cookie = name+"="+value+"; domain="+domain+"; path=/";
};

// Action initiated by clicking login button.
var doLogin = function(form) {
  var login = form.login.value;
  var pass = form.pass.value;
  now.ready(function () {
    now.authenticate(login, pass);
  });
}

// Recieve login authorization from the server.
now.receiveLoginInfo = function(ok, authToken, lobbyPath) {
  if (!ok) {
    return
  }
  // Save authToken in a cookie.
  // TODO: domain shouldn't be hard-coded.
  createCookie("authToken", authToken, "localhost");
  // Move the client to the lobby page.
  window.location.pathname = "/lobby.html";
};
