// --- Utility functions ---

// Get the value of a single window.location.search key
// https://developer.mozilla.org/en/DOM/window.location
function loadPageVar (sVar) {
  return unescape(window.location.search.replace(new RegExp("^(?:.*[&\\?]" + escape(sVar).replace(/[\.\+\*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), "$1"));
}

// --- Game server interaction ---

// Client loads the page. Get started!
var startGame = function() {
  var gameToken = loadPageVar("game");
  var authToken = loadPageVar("auth");
  now.ready(function () {
    now.register(gameToken, authToken);
  });
};

now.receiveGameInfo = function (info) {
  alert(info["clients"]);
};
