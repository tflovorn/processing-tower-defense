var startGame = function() {
  var auth = 0;
  var token = 0;
  now.ready(function () {
    now.register(token, auth);
    alert(now.game);
    setTimeout(function () {
      alert(now.game)
    }, 1000);
  });
};
