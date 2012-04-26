# processing-tower-defense-(multiplayer!)

Derived from [processing-tower-defense](https://github.com/rictic/processing-tower-defense).

Details of the multiplayer implementation inspired by [setgame](https://github.com/vincentwoo/setgame) and [nowjs-multiplayer-map](https://github.com/rockhowse/nowjs-multiplayer-map).

# Dependencies

Requires Node.js and npm ([install instructions here](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager)).

[mysql-libmysqlclient](http://sannis.github.com/node-mysql-libmysqlclient/index.html) requires libmysqlclient. On Ubuntu, this is installed with

    sudo apt-get install libmysqlclient-dev

(see link for other distributions)

To install npm dependencies, do:

    npm i

The npm dependencies are:

[express](http://expressjs.com/)

[socket.io](http://socket.io/)

[socket.io-client](https://github.com/LearnBoost/socket.io-client)

[now](http://nowjs.com/)

[ams](https://github.com/kof/node-ams)

[mysql-libmysqlclient](http://sannis.github.com/node-mysql-libmysqlclient/index.html)

Contains [headjs](http://headjs.com/) as a submodule. To obtain submodules after cloning this repository, do:

    git submodule init
    git submodule update
