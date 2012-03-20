var startGame = function() {
  var token = 0;
  now.ready(function () {
    now.register(token);
    alert(now.room);
    setTimeout(function () {
      alert(now.room)
    }, 1000);
  });
};
