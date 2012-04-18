/*
Processed Tower Defense by Will Larson lethain@gmail.com

### Processed Tower Defense

PTD is a simple game I decided to make to get used to
the Processing.js library, and also to consider the
feasibility of writing Processing-like code, but
using Javascript instead of Java 1.3 style syntax for
all control code.

I began prototyping the game, the first game I had
tried developing, and I got fairly far but realized
that my lack of knowledge about games had led me to
make some organizational mistakes that were making
the code increasingly incoherent and piecemeally.
So, I decided to rewrite the code to be clearer,
with the hope that it might serve as an useful
example for others.
*/

/*
  Douglas Crockford's cycle-restorer for deserialization.
  From: https://github.com/douglascrockford/JSON-js/blob/master/cycle.js
*/

retrocycle = function retrocycle($) {
    'use strict';

// Restore an object that was reduced by decycle. Members whose values are
// objects of the form
//      {$ref: PATH}
// are replaced with references to the value found by the PATH. This will
// restore cycles. The object will be mutated.

// The eval function is used to locate the values described by a PATH. The
// root object is kept in a $ variable. A regular expression is used to
// assure that the PATH is extremely well formed. The regexp contains nested
// * quantifiers. That has been known to have extremely bad performance
// problems on some browsers for very long strings. A PATH is expected to be
// reasonably short. A PATH is allowed to belong to a very restricted subset of
// Goessner's JSONPath.

// So,
//      var s = '[{"$ref":"$"}]';
//      return JSON.retrocycle(JSON.parse(s));
// produces an array containing a single element which is the array itself.

    var px =
        /^\$(?:\[(?:\d+|\"(?:[^\\\"\u0000-\u001f]|\\([\\\"\/bfnrt]|u[0-9a-zA-Z]{4}))*\")\])*$/;

    (function rez(value) {

// The rez function walks recursively through the object looking for $ref
// properties. When it finds one that has a value that is a path, then it
// replaces the $ref object with a reference to the value that is found by
// the path.

        var i, item, name, path;

        if (value && typeof value === 'object') {
            if (Object.prototype.toString.apply(value) === '[object Array]') {
                for (i = 0; i < value.length; i += 1) {
                    item = value[i];
                    if (item && typeof item === 'object') {
                        path = item.$ref;
                        if (typeof path === 'string' && px.test(path)) {
                            value[i] = eval(path);
                        } else {
                            rez(item);
                        }
                    }
                }
            } else {
                for (name in value) {
                    if (typeof value[name] === 'object') {
                        item = value[name];
                        if (item) {
                            path = item.$ref;
                            if (typeof path === 'string' && px.test(path)) {
                                value[name] = eval(path);
                            } else {
                                rez(item);
                            }
                        }
                    }
                }
            }
        }
    }($));
    return $;
};

// Don't sync these properties with the server. (extend ignores)
var saveAttrs = ["state", "bg_colors", "bg_color", "grid_color"
               , "entrance_color", "exit_color", "killzone_color"
               , "creep_color", "color", "fill_color"];

// The following implements the jQuery extend method, modified to ignore
// functions. To deep copy: extend(true, target, object).
// Obtained from https://github.com/jquery/jquery/blob/master/src/core.js

var isFunction = function (obj) {
  return typeof(obj) === "function";
};

var isWindow = function (obj) {
  return obj != null && obj == obj.window;
};

var isPlainObject =  function( obj ) {
    // Must be an Object.
    // Because of IE, we also have to check the presence of the constructor property.
    // Make sure that DOM nodes and window objects don't pass through, as well
    if ( !obj || typeof(obj) !== "object" || obj.nodeType || isWindow( obj ) ) {
      return false;
    }

    try {
      // Not own constructor property must be Object
      if ( obj.constructor &&
        !hasOwn.call(obj, "constructor") &&
        !hasOwn.call(obj.constructor.prototype, "isPrototypeOf") ) {
        return false;
      }
    } catch ( e ) {
      // IE8,9 Will throw exceptions on certain host objects #9897
      return false;
    }

    // Own properties are enumerated firstly, so to speed up,
    // if last one is own, then all properties are own.

    var key;
    for ( key in obj ) {}

    return key === undefined || hasOwn.call( obj, key );
}

var isArray = function (obj) {
  return typeof(obj) === "array";
};

var jqExtend = function() {
  var options, name, src, copy, copyIsArray, clone,
    target = arguments[0] || {},
    i = 1,
    length = arguments.length,
    deep = false;

  // Handle a deep copy situation
  if ( typeof target === "boolean" ) {
    deep = target;
    target = arguments[1] || {};
    // skip the boolean and the target
    i = 2;
  }

  // Handle case when target is a string or something (possible in deep copy)
  if ( typeof target !== "object" && isFunction(target) ) {
    target = {};
  }

  // extend jQuery itself if only one argument is passed
  if ( length === i ) {
    target = this;
    --i;
  }

  for ( ; i < length; i++ ) {
    // Only deal with non-null/undefined values
    if ( (options = arguments[ i ]) != null ) {
      // Extend the base object
      for ( name in options ) {
        // Ignore names in saveAttrs
        if (saveAttrs.indexOf(name) !== -1) {
          continue;
        }

        src = target[ name ];
        copy = options[ name ];

        // Prevent never-ending loop
        if ( target === copy ) {
          continue;
        }

        // Ignore functions
        if (isFunction(copy)) {
          continue;
        }

        // Recurse if we're merging plain objects or arrays
        if ( deep && copy && ( isPlainObject(copy) || (copyIsArray = isArray(copy)) ) ) {
          if ( copyIsArray ) {
            copyIsArray = false;
            clone = src && isArray(src) ? src : [];

          } else {
            clone = src && isPlainObject(src) ? src : {};
          }

          // Never move original objects, clone them
          target[ name ] = extend( deep, clone, copy );

        // Don't bring in undefined values
        } else if ( copy !== undefined ) {
          target[ name ] = copy;
        }
      }
    }
  }

  // Return the modified object
  return target;
};

/*
  Object life cycle.
 */

// assign @obj to render at @depth until it dies.
// 0 is the topmost layer, and thus something at
// layer 1 will render before something at layer 0.
// Something at layer 10 will render before something
// at layer 4, and so on. This means that something
// rendered at layer 0 will draw itself ontop of anything
// rendered before layer 0.
var assign_to_depth = function(SET, obj,depth) {
  //console.log(SET);
  //console.log(obj);
  //console.log(depth);
  var rendering_group = SET.rendering_groups[depth];
  if (rendering_group == undefined) SET.rendering_groups[depth] = [obj];
  else rendering_group.push(obj);
}

// updates any groups
var update_groups = function(groups) {
  var obj_update = function(x) {
    if (x != undefined && x.update !== undefined) x.update();
  };
  var obj_is_alive = function(x) {
    if ( x == undefined || (x.is_dead !== undefined && x.is_dead())) {
      return false;
    }
    return true;
  };
  var obj_draw = function(x) { if (x.draw !== undefined) x.draw(); };
  for (var i=groups.length-1;i>=0;i--) {
    var group = groups[i];
    if (group != undefined) {
      group.forEach(obj_update);
      var alive = group.filter(obj_is_alive);
      alive.forEach(obj_draw);
      groups[i] = alive;
    }
  }
}

/*
  Configuration & settings.
 */

var default_set = function(x_offset, y_offset) {
  var set = {};

  // constants
  set.x_offset = x_offset;
  set.y_offset = y_offset;
  set.pixels_per_square = 25;
  set.half_pixels_per_square = (1.0 * set.pixels_per_square) / 2;
  set.height = 450;
  set.width = 600;
  set.framerate = 60;
  set.gheight = Math.floor(set.height / set.pixels_per_square);
  set.gwidth = Math.floor(set.width / set.pixels_per_square);

  /*
    ### Grid Cache

    This is a place to store any data that should be associated
    with a specific grid square. For example, each grid square
    will have the Terrain occupying it stored there, and a grid
    square's tower could be retrieved this way as well.

    ### Using the Grid Cache

    The Grid Cache is, as it is named, intended to be
    used as a cache. This means it shouldn't be relied upon as the
    definitive answer to a question, but should be used to store
    answers to frequently answered questions.

    For example, the find_tower_at(gx,gy) method is used to find
    any towers existing at (gx,gy). That method should first check
    the cache for a key of 'tower', and use it if it exists, but
    should be able to find the tower without the cache as well
    (by scanning through all towers looking for the correct
    one).

    ### Invalidating Entries in Grid Cache

    Entries in the Grid Cache will be cleared out each time the
    game is reset, and beyond that invalidating of key/value pairs
    must be done manually.

    For example, upon selling a tower the value of the tower stored
    in the cache should be extinguished.
   */
  set.grid_cache = {};


  set.grid_cache_at = function(gx,gy) {
    var gx_cache = set.grid_cache[gx];
    if (!gx_cache) {
      gx_cache = {};
      set.grid_cache[gx] = gx_cache;
    }
    var gy_cache = gx_cache[gy];
    if (!gy_cache) {
      gy_cache = {};
      gx_cache[gy] = gy_cache;
    }
    return gy_cache;
  }

  set.grid_cache_reset_all_values_for_key = function(key) {
    for(gx in set.grid_cache) {
      for (gy in set.grid_cache[gx]) {
        delete set.grid_cache[gx][gy][key];
      }
    }
  }

  // colors
  set.bg_colors = {neutral:color(90,80,70),
                   positive:color(60,80,250),
                   negative:color(250,80,60)};
  set.bg_color = set.bg_colors.neutral;
  set.grid_color = color(255,255,255);
  set.entrance_color = color(100,255,100);
  set.exit_color = color(255,100,50);
  set.killzone_color = color(200,50,50,0.5);
  set.creep_color = color(255,255,0);

  // rendering groups
  set.rendering_groups = [];
  for (var i=0;        i <= 7; i++) set.rendering_groups.push([]);
  set.system_render_level = 7;
  set.square_render_level = 6;
  set.killzone_render_level = 5;
  set.grid_render_level = 4;
  set.tower_render_level = 3;
  set.build_zone_render_level = 2;
  set.creep_render_level = 1;
  set.bullet_render_level = 0;

  // game state
  set.state = undefined;

  // game values
  set.creep_variety = "Normal Creeps";
  set.creep_size = 10;
  set.creep_hp = 10;
  set.creep_value = 1;
  set.creep_speed = 50;
  set.missile_blast_radius = 5;
  set.missile_damage = 100;
  set.gold = 200;
  set.creeps_spawned = 0;
  set.max_creeps = 1;
  set.score = 0;
  set.lives = 20;
  set.nukes = 3;
  set.bomb_cost = 50;

  // pathfinding
  set.known_best_paths = undefined;

  // timekeeping
  set.now = 0;
  set.fastforward = false;
  set.frame = 0;

  return set
};
var SETS = [];

var fetch_ui_widgets = function() {
  var w = {};
  // status bar widgets
  w.score = document.getElementById("score");
  w.gold = document.getElementById("gold");
  w.lives = document.getElementById("lives");
  w.nukes_left = document.getElementById("nukes_left");
  w.creep_variety = document.getElementById("creep_variety");
  w.wave = document.getElementById("wave");
  w.till_next_wave = document.getElementById("till_next_wave");
  w.bomb_cost = document.getElementById("bomb_cost");

  // tower widgets
  w.tower = document.getElementById("tower");
  w.tower_type = document.getElementById("tower_type");
  w.tower_range = document.getElementById("tower_range");
  w.tower_damage = document.getElementById("tower_damage");
  w.tower_rate = document.getElementById("tower_rate");
  w.tower_upgrade_button = document.getElementById("tower_upgrade_button");
  w.tower_sell_button = document.getElementById("tower_sell_button");

  // creep widgets
  w.creep = document.getElementById("creep");
  w.creep_type = document.getElementById("creep_type");
  w.creep_hp = document.getElementById("creep_hp");
  w.creep_value = document.getElementById("creep_value");

  return w;
};
var WIDGETS;

/*
  Drawable objects (grid, towers, creeps, everything).
 */

// prototype for grid lines and colored squares
var InertDrawable = new Object();
Object.extend(InertDrawable, {
      update:function() {},
      is_dead:function() { return false; },
      draw:function() {}
  });


// responsible for updating settings in SET
// at the very beginning of a rendering cycle
var SettingUpdater = function(SET) {
  var su = new Object();
  Object.extend(su, InertDrawable);
  su.update = function() {
    SET.frame += 1;
    if (SET.fastforward) {
      // is this the best way to set the frame time?
      SET.now += 1000.0 / SET.framerate;
    } else {
      // Changed from millis() to allow for easier syncing of frames from
      // different machines.
      SET.now += 1000.0 / SET.framerate;
    }
  }
  assign_to_depth(SET, su, SET.system_render_level);
  return su;
};

var UIUpdater = function(SET) {
  var uiu = new Object();
  Object.extend(uiu, InertDrawable);

  uiu.update = function() {
    WIDGETS.creep_variety.innerHTML = SET.creep_variety;
    WIDGETS.score.innerHTML = SET.score;
    WIDGETS.gold.innerHTML = SET.gold;
    WIDGETS.lives.innerHTML = SET.lives;
    WIDGETS.nukes_left.innerHTML = SET.nukes + " left";
    WIDGETS.till_next_wave.innerHTML = Math.floor(((SET.creep_wave_controller.last + SET.creep_wave_controller.delay) - SET.now) / 1000)
  };
  assign_to_depth(SET, uiu, SET.system_render_level);
  return uiu;
}


var Grid = function(SET) {
  var grid = new Object();
  Object.extend(grid, InertDrawable);
  grid.draw = function() {
    stroke(SET.grid_color);
    var p = SET.pixels_per_square;
    var xo = SET.x_offset;
    var yo = SET.y_offset;
    var w = SET.width;
    var h = SET.height;
    for (i = xo; i<w+xo; i+=p) {
      line(i, 0, i, h);
    }
    for (i = yo; i<h+yo; i+=p) {
      line(0,i,w,i);
    }
  };
  assign_to_depth(SET, grid, SET.grid_render_level);
  return grid;
};


var GridSquare = function(SET,gx,gy,color) {
  var square = new Object();
  Object.extend(square, InertDrawable);
  square.gx = gx;
  square.gy = gy;
  square.x = grid_to_pixel(SET,gx);
  square.y = grid_to_pixel(SET,gy);
  var mid = center_of_square(SET,gx,gy);
  square.x_mid = mid.x;
  square.y_mid = mid.y;
  return square;
}

var Square = function(SET,gx,gy,color) {
  var square = GridSquare(SET,gx,gy,color);
  square.color = color;
  square.draw = function() {
    noStroke();
    fill(this.color);
    draw_square_in_grid(SET,this.gx,this.gy);
  }
  assign_to_depth(SET, square, SET.square_render_level);
  return square;
};
var ExitSquare = function(SET,gx,gy) {
  var square = Square(SET,gx,gy,SET.exit_color);
  square.type = "exit";
  square.draw = function() {
    noStroke();
    fill(SET.exit_color);
    draw_square_in_grid(SET,this.gx,this.gy);
    noFill();
    stroke("black");
    draw_circle_in_grid(SET,this.gx,this.gy);
  }
  return square;
}


var spawn_wave = function(SET) {
  if (!SET.state ||
      (SET.state.name() != "GameOverMode" &&
       SET.state.name() != "PauseMode")) {
    //a bonus for bravery, to be paid when the creep wave thus spawned is done
    var bonus = Math.floor(((SET.creep_wave_controller.last + SET.creep_wave_controller.delay) - SET.now) / 100);
    SET.creep_wave_controller.spawn_wave(bonus);
  }
}

var nuke_creeps = function(SET) {
  if (SET.nukes > 0) {
    var creeps = SET.rendering_groups[SET.creep_render_level];
    creeps.forEach(function(x) {
      x.hp = -1;
      x.value = 0; // no gold for nuked creeps
    });
    play_sound("nuke");
    SET.nukes--;
  }
  else {error("You're all out of nukes!")}
};


var pause_resume = function(SET) {
  if (SET.state) {
    var state_name = SET.state.name();
    if (state_name == "GameOverMode")
      ;
    else if (state_name == "PauseMode") {
      unselect(SET);
    }
    else {
      unselect(SET);
      SET.state = new PauseMode(SET);
      SET.state.set_up();
    }
  }
  else {
    SET.state = new PauseMode(SET);
    SET.state.set_up();
  }
};

var game_lost = function(SET) {
  unselect(SET);
  attempt_to_enter_ui_mode(SET, new GameOverMode(SET));
}

/*
  Game level functions. Starting, resetting, etc.
 */

var generate_map = function(SET) {
  SET.entrance = Square(SET, 0, random(SET.gheight-1), SET.entrance_color);
  SET.entrance.type = "entrance";
  SET.exit = ExitSquare(SET, SET.gwidth-1, random(SET.gheight-1));
  populate_terrains(SET);
}

var reset_game = function() {
  SETS[0] = default_set(0, 0);
  SETS[1] = default_set(700, 0);
  WIDGETS = fetch_ui_widgets();
  WIDGETS.bomb_cost.innerHTML = SETS[0].bomb_cost;
  SettingUpdater(SETS[0]);
  SettingUpdater(SETS[1]);
  UIUpdater(SETS[0]);
  //UIUpdater(SETS[1]); // need widgets for second player
  //Grid();
  generate_map(SETS[0]);
  generate_map(SETS[1]);
  setTowerModePrototypes(SETS[0]);
  SETS[0].creep_wave_controller = CreepWaveController(SETS[0]);
  SETS[1].creep_wave_controller = CreepWaveController(SETS[1]);
  reset_pathfinding(SETS[0]);
  reset_pathfinding(SETS[1]);
  $('').trigger("game_over",false);
};

/*
  Mouse functions.
 */

var on_mouse_moved = function() {
  var SET = SETS[0];
  if (SET.state && SET.state.draw) {
    var pos = mouse_pos();
    SET.state.draw(pos.x + SET.x_offset, pos.y + SET.y_offset);
  }
};

// user-interface modes that can be entered by clicking within
// the game canvas (i.e. this does not include states reached
// by clicking an html button)
var UI_MODES_FROM_CLICK = [TowerSelectMode, CreepSelectMode];

var on_mouse_press = function() {
  var SET = SETS[0];
  var pos = mouse_pos();
  pos.x += SET.x_offset;
  pos.y += SET.y_offset;
  if (SET.state) {
    if (SET.state.is_legal(pos.x,pos.y)) {
      SET.state.action(pos.x,pos.y);
    }
    if (SET.state.can_leave_mode(pos.x,pos.y)) {
      unselect(SET);
    }
  }
  if (!SET.state) {
    var len = UI_MODES_FROM_CLICK.length;
    for (var i=0;i<len;i++) {
      var modeFunc = UI_MODES_FROM_CLICK[i];
      var mode = new modeFunc(SET);
      if (mode.can_enter_mode(pos.x,pos.y)) {
        SET.state = mode;
        SET.state.set_up(pos.x,pos.y);
        break;
      }
    }
  }
}


var message = function(msg) {
  $('').trigger("message", msg);
}

var unselect = function(SET) {
  if (SET.state) SET.state.tear_down();
  SET.state = undefined;
  $('').trigger("no_mode");
}

var error = function(msg) {
  $('').trigger("error", msg);
}

/*
   Server interaction.
 */

// Called upon loading the page.
var start_tower_defense = function() {
  var gameToken = loadPageVar("game");
  var authToken = loadPageVar("auth");
  now.ready(function () {
    now.register(gameToken, authToken);
  });
}

// Recieve meta-game information from the game server.
now.receiveGameInfo = function (info) {
  //alert(info["clients"]);
};

// Copy properties of source into dest, ignoring functions and saveAttrs.
var copySet = function (dest, source) {
  jqExtend(true, dest, source);
};

// Main game loop:
// Begin a game of tower defense using the given sets.
now.startGame = function (mySET, otherSET) {
  mySET = retrocycle(mySET);
  otherSET = retrocycle(mySET);
  setup = function() {
    $('#pause_button').html("Pause");
    set_canvas("tower_defense");
    reset_game();
    copySet(SETS[0], mySET);
    copySet(SETS[1], otherSET);
    size(SETS[1].x_offset + SETS[1].width
       , SETS[1].y_offset + SETS[1].height);
    frameRate(SETS[0].framerate);
    mouseMoved(on_mouse_moved);
    mousePressed(on_mouse_press);
    initProcessing();
  }
  draw = function() {
    if (SETS[0].state) {
      var state_name = SETS[0].state.name();
      if (state_name == "GameOverMode" || state_name == "PauseMode") return
    }
    background(SETS[0].bg_color);
    update_groups(SETS[0].rendering_groups);
    update_groups(SETS[1].rendering_groups);
  }
  setup();
};

// Update ffSET until its time matches comparisonSET.
var fastforwardSet = function (ffSET, comparisonSET) {
  ffSET.fastforward = true;
  while (ffSET.frame < comparisonSET.frame) {
    update_groups(ffSET.rendering_groups);
  }
  ffSET.fastforward = false;
};

// Synchronize the local SETS with the ones provided by the server.
now.syncSets = function (mySET, otherSET) {
  mySET = retrocycle(mySET);
  otherSET = retrocycle(mySET);
  fastforwardSet(mySET, SETS[0]);
  fastforwardSet(otherSET, SETS[1]);
  copySet(SETS[0], mySET);
  copySet(SETS[1], otherSET);
};
