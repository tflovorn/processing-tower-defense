var startGame = function() {
  var token = 0;
  now.ready(function () {
    now.register(token);
    alert(now.game);
    setTimeout(function () {
      alert(now.game)
    }, 1000);
  });
};
