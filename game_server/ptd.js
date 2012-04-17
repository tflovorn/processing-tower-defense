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

// start_tower_defense forms the API for use with game.js server.
// Input = callback to use here for reporting game outcome.
// Output = functions to use in game.js for:
//    check game state
//    build a tower
//    spawn a wave
exports.start_tower_defense = start_tower_defense;

/*
  Changes to basic JS objects
*/

// Object.extend borrowed from Prototype javascript library.
Object.extend = function(destination, source) {
  for (var property in source) {
    destination[property] = source[property];
  }
  return destination;
};

Array.prototype.equals = function(testArr) {
    if (this.length != testArr.length) return false;
    for (var i = 0; i < testArr.length; i++) {
        if (this[i].equals) { 
            if (!this[i].equals(testArr[i])) return false;
        }
        if (this[i] != testArr[i]) return false;
    }
    return true;
}

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
  var rendering_group = SET.rendering_groups[depth];
  if (rendering_group == undefined) SET.rendering_groups[depth] = [obj];
  else rendering_group.push(obj);
}

// updates any groups
var update_groups = function(groups) {
  var obj_update = function(x) {
    if (x != undefined) x.update();
  };
  var obj_is_alive = function(x) {
    if ( x == undefined || x.is_dead()) return false;
    return true;
  };
  for (var i=groups.length-1;i>=0;i--) {
    var group = groups[i];
    if (group != undefined) {
      group.forEach(obj_update);
      var alive = group.filter(obj_is_alive);
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
  set.now = millis();
  set.fastforward = false;
  set.frame = 0;

  return set
};
var SETS = [];

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
};

var message = function(msg) {
}

var unselect = function(SET) {
  if (SET.state) SET.state.tear_down();
  SET.state = undefined;
}

var error = function(msg) {
}

/*
   Main game loop.
 */

var start_tower_defense = function(reportOutcome) {
  var intervalId;
  var draw = function() {
    // TODO integrate reportOutcome
    if (SETS[0].state) {
      var state_name = SETS[0].state.name();
      if (state_name == "GameOverMode" || state_name == "PauseMode") return
    }
    update_groups(SETS[0].rendering_groups);
    update_groups(SETS[1].rendering_groups);
  }
  var setup = function() {
    reset_game();
    intervalId = setInterval(draw, 1000.0 / SETS[0].framerate);
  }
  setup();
  // TODO clearInterval(intervalId) when game is done

  var hooks = new Object();
  hooks.checkSets = function () {
    return SETS;
  };

  // TODO build a tower on SETS[player] of given type at given position
  hooks.buildTower = function(player, type, gx, gy) {

  };

  // TODO start a wave on the opposite player (SETS[target])
  hooks.startWave = function(player) {
    var target;
    if (player == 0) {
      target = 1;
    } else {
      target = 0;
    }

  };

  return hooks;
}

/*
  creeps.js
*/

/*
  Used in by the Creep method "display stats" to
  support constantly updated hp for the specific
  selected creep. Conceivably one might move into
  another state immediately without transitioning
  into normal state before that. Preferably some
  kind of state cleanup function will be added to
  the state API, but at the moment it will function
  correctly anyway, because the creep div will either
  be invisible, or the most recent creephpupdater
  will be the last one called, meaning that the
  correct hp will be displayed even if there are
  multiple existing creephpupdaters in the
  system rendering level.
 */
var CreepHpUpdater = function(SET, creep) {
  var chp = new Object();
  Object.extend(chp, InertDrawable);
  chp.update = function() {
    WIDGETS.creep_hp.innerHTML = creep.hp;
  }
  chp.should_die = false;
  chp.is_dead = function() {
    if (chp.should_die || !creep || !SET.state || SET.state.name() != "CreepSelectMode" || creep.is_dead()) {
      unselect(SET);
      if (chp.kz)
        chp.kz.is_dead = function() { return true; };
      return true;
    }
    else return false;
  }
  chp.draw = function() {
    if (chp.kz) chp.kz.is_dead = function() { return true; };
    chp.kz = KillZone(SET,creep.x,creep.y,15);
  }

  assign_to_depth(SET, chp, SET.system_render_level);
  return chp;
}


/*
  ### Types of creeps

  Creeps interact with terrain in a variety of ways.
  Some types of creeps will be much faster on certain
  squares, and much slower on others. Some types will
  be ignore towers and fly over them.

  #### Terrain baseline (how a non-modified creep reacts
  to certain types of terrain):

  1. Mountains: 3/4 speed.
  2. Water: 1/2 speed.
  3. Neutral: 1/1 speed.
  4. Power Plant: 2/1 speed.

  #### Creep mixins

  1. FlyingMixin: ignore standard pathfinding, and go in a straight line to exit.
  2. WaterAdverseMixin: very slow walking through water.
  3. WaterLovingMixin: very quick walking in water.
  4. MoutainAdverseMixin: very slow crossing mountains.
  5. MountainLovingMixin: very quick crossing mountains.
  6. ImmuneMixin: ignores terrain effects completely.


  ### Implementation

  Each creep has an object named terrain, the keys of which
  are the varying types of terrain. The value stored for each
  key is a decimal which is used as a multiplier against the
  creep's base speed in that type of terrain.

 */

/* Creep Mixins */

var FlyingMixin = function(creep) {
  creep.creep_type = "Flying " + creep.creep_type;
  creep.terrain['water'] = 1.0;
  creep.terrain['mountain'] = 1.0;
  creep.ignores_towers = true;
  return creep;
}

var WaterAdverseMixin = function(creep) {
  creep.terrain['water'] = 0.25;
  creep.creep_type = "Water-Hating " + creep.creep_type;
  return creep;
}

var WaterLovingMixin = function(creep) {
  creep.terrain['water'] = 2.0;
creep.creep_type = "Water-Loving " + creep.creep_type;
  return creep;
}

var MountainAdverseMixin = function(creep) {
  creep.terrain['mountain'] = 0.25;
creep.creep_type = "Mountain-Hating " + creep.creep_type;
  return creep;
}

var MountainLovingMixin = function(creep) {
  creep.terrain['mountain'] = 1.25;
creep.creep_type = "Mountain-Loving " + creep.creep_type;
  return creep;
}

var ImmuneMixin = function(creep) {
  creep.terrain['mountain'] = 1.0;
  creep.terrain['neutral'] = 1.0;
  creep.terrain['water'] = 1.0;
  creep.terrain['mountain'] = 1.0;
  creep.terrain['power plant'] = 1.0;
  creep.creep_type = "Immune " + creep.creep_type;
  return creep;
}

var StrongMixin = function(creep) {
  creep.color = color(0,255,255);
  creep.size = creep.size * 1.3;
  creep.hp = Math.floor(creep.hp * 2);
  creep.value = Math.floor(creep.value * 1.5);
  creep.creep_type = "Strong " + creep.creep_type;
  return creep;
}

var QuickMixin = function(creep) {
  creep.creep_type = "Quick " + creep.creep_type;
  creep.color = color(200,150,50);
  creep.speed = creep.speed * 1.5;
  creep.hp = Math.floor(creep.hp * .75);
  creep.size = creep.size * 0.9;
  creep.value = Math.floor(creep.value * 1.25);
  return creep;
}

var BossMixin = function(creep) {
  creep.creep_type = "Boss " + creep.creep_type;
  creep.color = color(255,100,150);
  creep.size = creep.size * 1.5;
  creep.hp = Math.floor(creep.hp * 10);
  creep.value = Math.floor(creep.value * 20);
  return creep;
}

var Creep = function(SET, wave) {
  var cp = SET.creeps_spawned;
  var c = new Object();
  c.terrain = {"entrance":1.0,"exit":1.0,"mountain":0.75,"water":0.5,"neutral":1.0,"power plant":2.0};

  c.x = SET.entrance.x_mid;
  c.y = SET.entrance.y_mid;
  c.color = SET.creep_color;
  c.size = SET.creep_size;
  c.hp = Math.floor(SET.creep_hp * Math.pow(1.4,wave));
  c.value = SET.creep_value + wave;
  c.speed = SET.creep_speed;
  c.last = SET.now;
  c.is_dead = function() {
    if (this.hp <= 0) {
      SET.gold += this.value;
      SET.score += this.value;
      return true;
    }
    return false;
  }
  c.terrain_modified_speed = function() {
    var terrain = get_terrain_at(SET,this.gx,this.gy);
    if (terrain) {
      var terrain_type = terrain.type;
      var terrain_modifier = c.terrain[terrain_type];
    }
    else {
      var terrain_modifier = 1.0;
    }
    return c.speed * terrain_modifier;
  }

  c.ignores_towers = false;

  c.update = function() {
    var gpos = pixel_to_grid(SET, this);
    this.gx = gpos.gx;
    this.gy = gpos.gy;
    // if it reaches the exit, kill it, but reduce the players
    // lives and reduce its value to 0 (it will be collected
    // and destroyed in the is_dead phase.
    if (this.gx == SET.exit.gx && this.gy == SET.exit.gy) {
      this.hp = -1;
      this.value = 0;
      SET.lives--;
      if (SET.lives < 1) game_lost(SET);
    }
    else if(!this.ignores_towers) {
      var elapsed = SET.now - this.last;
      var terrain_modified_speed = this.terrain_modified_speed();
      var speed = (elapsed/1000) * terrain_modified_speed;
      this.last = SET.now;

      var next_block = pathfind(SET, gpos);
      if (next_block == undefined){
        game_lost(SET);
        error("Pathfinding failed.  Erroring hard so that we catch these bugs.");
        log("creep",this);
        return;
      }

      var coords = center_of_square(SET, next_block.gx, next_block.gy)
      move_towards(SET,this,this.x,this.y,coords.x,coords.y,speed);
    }
    else if (this.ignores_towers) {
      var elapsed = SET.now - this.last;
      var terrain_modified_speed = this.terrain_modified_speed();
      var speed = (elapsed/1000) * terrain_modified_speed;
      move_towards(SET,this, this.x,this.y,SET.exit.x_mid,SET.exit.y_mid,speed)
      this.last = SET.now;
    }
  }
  c.draw = function() {
    noStroke();
    fill(this.color);
    ellipse(this.x,this.y,this.size,this.size);
  }
  c.creep_type = "Normal Creep";
  c.display_stats = function() {
    WIDGETS.creep_type.innerHTML = this.creep_type;
    WIDGETS.creep_hp.innerHTML = this.hp;
    WIDGETS.creep_value.innerHTML = this.value + " gold";
    WIDGETS.creep.style.display = "block";
  }
  SET.creeps_spawned++;
  assign_to_depth(SET, c, SET.creep_render_level);
  return c;
};

/* pathfinding */

var reset_pathfinding = function(SET, new_value) {
  if (new_value == undefined){
    var coords = [SET.exit.gx, SET.exit.gy];
    new_value = {};
    SET.grid_cache_reset_all_values_for_key("valid_tower_location");
    new_value[coords] = {}; //The actual value doesn't really matter
  }
  var previous = SET.known_best_paths;
  SET.known_best_paths = new_value;
  return previous;
}

//Could a creep occupy this square?
var valid_path_location = function(SET, gx, gy) {
  //out of bounds
  if (gx < 0 || gy < 0) return false;
  if (gx >= SET.gwidth || gy >= SET.gheight) return false;
  //a tower is present
  if (get_tower_at(SET,gx,gy) != false)
    return false;
  //a hypothetical tower is present (when selecting a space for a new tower)
  if (SET.considering_location && SET.considering_location.gx == gx && SET.considering_location.gy == gy)
      return false;
  return true;
}

var pathfind = function(SET, start_block) {
//   log("pathfinding [from, to]", [start_block, SET.exit]);
  if ([start_block.gx, start_block.gy] in SET.known_best_paths) {
//     log("path found from cache", start_block);
    return SET.known_best_paths[[start_block.gx, start_block.gy]].next_block.gpos;
  }


  var successors = function(block) {
    var candidates = [];
    var normal_dist = 10;
    [[0,1],[1,0],[-1,0],[0,-1]].forEach(function(pair) {
      var gpos = {gx:block.gpos.gx + pair[0], gy: block.gpos.gy + pair[1], dist:normal_dist};
      if (valid_path_location(SET, gpos.gx, gpos.gy))
        candidates.push(gpos);
    });

    var diag_dist = 14; //sqrt(2) * 10
    [[1,1],[-1,-1],[1,-1],[-1,1]].forEach(function(pair){
      var gpos = {gx:block.gpos.gx + pair[0], gy: block.gpos.gy + pair[1], dist:diag_dist};
      if (valid_path_location(SET, gpos.gx, gpos.gy) &&
          valid_path_location(SET, block.gpos.gx, gpos.gy) &&
          valid_path_location(SET, gpos.gx, block.gpos.gy))
        candidates.push(gpos);
    })
    return candidates;
  }


  //Heuristic assumes that we move at a 45˚ angle until we've got a
  //horizontal or vertical path to the goal, then we move straight
  //to the goal.  This is the actual behavior when there are no obstructions.
  var heuristic = function(gpos) {
    var dx = Math.abs(gpos.gx - SET.exit.gx);
    var dy = Math.abs(gpos.gy - SET.exit.gy);
    var dist = Math.min(dx,dy) * 14;
    dist += (Math.max(dx,dy) - Math.min(dx,dy)) * 10
    return dist
  }


  var closed = {};
  var pqueue = [{gpos:start_block, f:heuristic(start_block), g:0}];
  while (pqueue.length > 0) {
    var block = pqueue[0];
    pqueue = pqueue.slice(1);
//     log("looking at", block)
    if (closed[[block.gpos.gx, block.gpos.gy]] == true){
//       log("in closed, skipping", closed)
      continue;
    }
    if ([block.gpos.gx, block.gpos.gy] in SET.known_best_paths){
      //logging:
//       rpath = [];
      
      while ("ancestor" in block) {
        block.ancestor.next_block = block;
        SET.known_best_paths[[block.ancestor.gpos.gx, block.ancestor.gpos.gy]] = block.ancestor
//         rpath.push({gx:block.gx, gy:block.gy});
        block = block.ancestor;
      }
//       rpath.push({gx:block.gx, gy:block.gy});
//       rpath.reverse();
//       log("known_best_paths", known_best_paths);
      var result = SET.known_best_paths[[start_block.gx, start_block.gy]].next_block.gpos;
//       log("path found!", rpath);
      return result;
    }
    closed[[block.gpos.gx, block.gpos.gy]] = true;
//     log("closed", closed);
    successors(block).forEach(function(s) {
      var suc = {gpos:s, g:s.dist + block.g, ancestor:block};
      suc.f = suc.g + heuristic(suc.gpos);

      pqueue = insert_sorted(pqueue, suc, function(bl) {
        return bl.f
      });
    })

//     log("pqueue", pqueue);
  }
//   log("---------pathfinding failed!----------");
}

/*
  creep_waves.js
*/

var CreepWaveController = function(SET) {
  var cwc = new Object();
  Object.extend(cwc, InertDrawable);
  cwc.delay = 25000;
  cwc.last = SET.now-20000;
  cwc.wave = 1;
  cwc.spawn_wave = function(bonus) {
    WIDGETS.wave.innerHTML = this.wave;
    var settings = {wave:this.wave, bonus:bonus};
    var mixins = [];

    var n = Math.random();
    if (n < 0.1)
      mixins.push(WaterAdverseMixin);
    else if (n < 0.2) 
      mixins.push(WaterLovingMixin);
    else if (n < 0.3) 
      mixins.push(MountainAdverseMixin);    
    else if (n < 0.4) 
      mixins.push(MountainLovingMixin);
    else if (n < 0.5) 
      mixins.push(ImmuneMixin);
    else if (n < 0.6) 
      mixins.push(FlyingMixin);

    if (this.wave % 15 == 0) {
      mixins.push(BossMixin);
      settings.remaining = 1;
    }
    else if (this.wave % 5 == 0) mixins.push(StrongMixin);
    else if (this.wave % 3 == 0) mixins.push(QuickMixin);

    create_creep_wave_with_mixins(SET, settings, mixins);

    this.wave++;
    cwc.last = SET.now;
  };
  cwc.update = function() {
    if (SET.now - cwc.last > cwc.delay) {
      this.spawn_wave();
    }
  }
  assign_to_depth(SET, cwc, SET.system_render_level);
  return cwc;
};

var CreepWave = function(SET, settings) {
  var cw = new Object();
  Object.extend(cw, InertDrawable);
  cw.remaining = 20;
  cw.wave = 1;
  cw.last = 0;
  cw.interval = 1000;
  Object.extend(cw, settings);
  cw.spawn_creep = function() { Creep(SET, this.wave); };
  cw.spawn = function() {
    this.remaining--;
    this.spawn_creep();
    this.last = SET.now;    
    if (this.remaining < 1) {
      this.is_dead = function() { return true; };
      if (this.bonus)
        SET.score += this.bonus;
    }
  }

  cw.update = function() {
    if (SET.now - this.last > this.interval) {
      this.spawn();
    }
  }
  assign_to_depth(SET, cw, SET.system_render_level);
  SET.creep_variety = "Normal Creeps";
  return cw;
};

var create_creep_wave_with_mixins = function(SET, settings, mixins) {
  if (!mixins) mixins = [];
  var cw = CreepWave(SET, settings);
  cw.knows_creep_variety = false;
  cw.spawn_creep = function() {
    var c = Creep(SET, cw.wave);
    mixins.forEach(function(mixin) { mixin(c); });
    if (cw.knows_creep_variety == false) {
      SET.creep_variety = c.creep_type + "s";
      cw.knows_creep_variety = true;
    }
  }
  return cw;
}

/*
  terrain.js
*/

/* File to contain Terrain implementation.  */

var NeutralTerrain = function(SET,gx,gy) {
  var terrain_color = color(200,200,200);
  var t = Square(SET,gx,gy,terrain_color);
  t.type = "neutral";
  t.tower_range_modifier = 1.0;
  t.tower_damage_modifier = 1.0;
  t.tower_frequency_modifier = 1.0;
  return t;
}

var WaterTerrain = function(SET,gx,gy) {
  var t = NeutralTerrain(SET,gx,gy);
  t.color = color(78,150,236);
  t.type = "water";
  return t;
}
  
var MountainTerrain = function(SET,gx,gy) {
  var t = NeutralTerrain(SET,gx,gy);
  t.color = color(228,51,51);
  t.type = "mountain";
  t.tower_range_modifier = 1.25;
  return t;
}

var PowerPlantTerrain = function(SET,gx,gy) {
  var t = NeutralTerrain(SET,gx,gy);
  t.color = color(189,194,78);
  t.type = "power plant";
  t.tower_damage_modifier = 2.0;
  return t;
}

var populate_terrains = function(SET) {
  var p_mountains = SET.terrain_percent_mountains || 0.05;
  var p_water = SET.terrain_percent_water || 0.1;
  var p_power_plant = SET.terrain_percent_power_plant || 0.01;
  // remainder is neutral terrain

  var range_mountain = p_mountains;
  var range_water = p_mountains + p_water;
  var range_power_plant = p_power_plant + range_water;
  // remainder is neutral terrain

  var entrance = SET.entrance;
  var exit = SET.exit;
  var gwidth = SET.gwidth;
  var gheight = SET.gheight;
  
  // column with entrance & exit squares
  // are all neutral terrain
  for (var gy=0; gy<gheight; gy++) {
    if ( gy != entrance.gy ) {
      NeutralTerrain(SET,0,gy);
    }
    if ( gy != exit.gy ) {
      NeutralTerrain(SET,gwidth-1,gy);
    }
  }

  for (var gx=1; gx<gwidth-1; gx++) {
    for (var gy=0; gy<gheight; gy++) {
      var n = Math.random();
      if (n <= range_mountain)
        MountainTerrain(SET,gx,gy);
      else if (n <= range_water)
        WaterTerrain(SET,gx,gy);
      else if (n <= range_power_plant)
        PowerPlantTerrain(SET,gx,gy);
      else
        NeutralTerrain(SET,gx,gy);
    }
  }


}

/*
  ui_modes.js
*/

/*
  User-interface functions.
 */

var UserInterfaceMode = function() {
 this.action = function(x,y) {
    // called when the mouse is clicked, if is_legal
 };
 this.is_legal = function(x,y) {
    // returns true,false or undefined.
    // if true, then the UI mode's action can be undertaken
    // at @x, @y. If false, then it cannot be undertaken.
    // Otherwise, the UI has no concept of legality.
    // The distinction between undefined and true lies in
    // visual cues presented to the user.
    return undefined;
 };
 this.draw = function(x,y) {
    // draw any relevant graphics at the mouse's location
 };
 this.set_up = function() {
    // do any setup before entering the UI mode
 };
 this.tear_down = function() {
    // perform any clean up before exiting the UI mode.
 };
 this.can_leave_mode = function(x,y) {
    // used to check if the the UI mode can be left
    return true;
 };
 this.can_enter_mode = function(x,y) {
    // used for checking if a UI can be invoked
    return true;
 };
 this.name = function() {
    return "UserInterfaceMode";
 };
};

var attempt_to_enter_ui_mode = function(SET, mode, error_msg) {
  /*
    This is only necessary for button based UI modes. This
    logic is already handled for UI modes invoked by mouse
    clicks in the game canvas.
   */
  if (!SET.state || SET.state.can_leave_mode()) {
    unselect(SET);
    if (mode.can_enter_mode()) {
      SET.state = mode;
      var pos = mouse_pos();
      SET.state.set_up(pos.x,pos.y);
    }
    else if (!error_msg)
      {error("Not enough gold, you need at least " + mode.cost)};
  }
};

var BuildTowerMode = function(SET) {
  var is_blocking_paths = function(gpos) {
    //if the proposed tower isn't along any known path, it's not in
    //the way
    pathfind(SET, {gx:SET.entrance.gx, gy:SET.entrance.gy});
    if (!([gpos.gx,gpos.gy] in SET.known_best_paths)) {
      var safe = true;
//       log("looking at diagonals of",gpos);
      [[1,1],[-1,-1],[1,-1],[-1,1]].forEach(function(pair) {
//         log("diagonal",{gx:gpos.gx + pair[0], gy:gpos.gy + pair[1]});
        if (!valid_path_location(SET, gpos.gx + pair[0], gpos.gy + pair[1])){
//           log("diagonal disqualified from free is_blocking call",gpos);
          safe = false;
        }
      });
      if (safe)
        return true;
    }

//     log("pathfinding on behaf of", gpos);

    //check that we can pathfind from the entrance
    //to the exit, and from each creep to the exit
    SET.considering_location = gpos;
    var previous_pathfinding = reset_pathfinding(SET);
    var valid = pathfind(SET, {gx:SET.entrance.gx, gy:SET.entrance.gy});
    var creeps = SET.rendering_groups[SET.creep_render_level];
    creeps.forEach(function(creep){
      valid = valid && pathfind(SET, pixel_to_grid(SET, creep));
    });
    SET.considering_location = undefined;
    reset_pathfinding(SET, previous_pathfinding);
    if (!valid)
      return false;
    return true;
  }

  this.is_legal = function(x,y) {
    var gpos = pixel_to_grid(SET,x,y);
    if (can_build_here(SET,gpos.gx,gpos.gy) == false) return false;

    var cache = SET.grid_cache_at(gpos.gx, gpos.gy);
    if (cache["valid_tower_location"] == undefined){
//       log("grid grid miss");
      cache["valid_tower_location"] = is_blocking_paths(gpos);
//       log("placing tower ok?", cache["valid_tower_location"]);
    }
//     else log("in grid cache");

    return cache["valid_tower_location"];
  };
  this.draw = function(x,y) {
    var gpos = pixel_to_grid(SET,x,y);
    var mid = center_of_square(SET,gpos);
    var radius = SET.half_pixels_per_square;
    if (this.br)
      this.br.is_dead = function() { return true; }
    this.br = BuildRadius(SET,mid.x,mid.y,radius);
    if (this.is_legal(x,y))
      this.br.color = SET.bg_colors.positive;
    else
      this.br.color = SET.bg_colors.negative;

  };
  this.set_up = function(x,y) {
    this.draw(x,y);
  };
  this.tear_down = function() {
    if (this.br) {
      this.br.is_dead = function() { return true; };
    }
  };
  this.action = function(x,y) {
    var gpos = pixel_to_grid(SET,x,y);
    this.tower(SET,gpos.gx,gpos.gy);
    SET.gold -= this.cost;
    reset_pathfinding(SET);
  };
  this.can_enter_mode = function(x,y) {
    if (SET.gold >= this.cost) return true;
    else return false;
  };
  this.can_leave_mode = function() {
    //if we don't have enough money, we can't keep building
    if (SET.gold < this.cost) return true;
    //remain in build mode if shift is held down
    return !shift_down;
  };
  this.name = function() {
    return "BuildTowerMode";
  };
};
BuildTowerMode.prototype = new UserInterfaceMode();

var BuildMissileTowerMode = function() {
  this.cost = 100;
  this.tower = MissileTower;
  this.name = function() {
    return "BuildMissileTowerMode";
  };
};

var build_missile_tower = function() {
  attempt_to_enter_ui_mode(SETS[0], new BuildMissileTowerMode());
};

var BuildCannonTowerMode = function() {
  this.cost = 75;
  this.tower = CannonTower;
  this.name = function() {
    return "BuildCannonTowerMode";
  };
};

var build_cannon_tower = function() {
  attempt_to_enter_ui_mode(SETS[0], new BuildCannonTowerMode());
};

var BuildLaserTowerMode = function() {
  this.cost = 25;
  this.tower = LaserTower;
  this.name = function() {
    return "BuildLaserTowerMode";
 };
};

var build_laser_tower = function() {
  attempt_to_enter_ui_mode(SETS[0], new BuildLaserTowerMode());
};

var BuildGatlingTowerMode = function() {
  this.cost = 50;
  this.tower = GatlingTower;
  this.name = function() {
    return "BuildGatlingTowerMode";
  }
};

var build_gatling_tower = function() {
  attempt_to_enter_ui_mode(SETS[0], new BuildGatlingTowerMode());
}

var setTowerModePrototypes = function (SET) {
  BuildMissileTowerMode.prototype = new BuildTowerMode(SET);
  BuildCannonTowerMode.prototype = new BuildTowerMode(SET);
  BuildLaserTowerMode.prototype = new BuildTowerMode(SET);
  BuildGatlingTowerMode.prototype = new BuildTowerMode(SET);
};

/* TowerSelectMode */

var TowerSelectMode = function(SET) {
  this.set_up = function(x,y) {
    var gpos = pixel_to_grid(SET,x,y);
    this.tower = get_tower_at(SET,gpos.gx,gpos.gy);
    if (this.tower) {
      this.tower.display_stats();
      this.killzone = KillZone(SET,this.tower.x_mid,
      this.tower.y_mid,
      this.tower.range*SET.pixels_per_square);
      WIDGETS.tower.style.display = "block";
    }
  };
  this.tear_down = function() {
    WIDGETS.tower.style.display = "none";
    if (this.killzone)
      this.killzone.is_dead = function() { return true; };
  };
  this.can_enter_mode = function(x,y) {
    var gpos = pixel_to_grid(SET,x,y);
    var tower = get_tower_at(SET,gpos.gx,gpos.gy);
    return (tower == false) ? false : true;
  }

};
TowerSelectMode.prototype = new UserInterfaceMode();

var select_tower = function(SET) {
  SET.state = new TowerSelectMode(SET);
};

/* CreepSelectMode */

var CreepSelectMode = function(SET) {
  this.set_up = function(x,y) {
    this.creep = get_creep_nearest(SET,x,y);
    if (this.creep) {
      this.creep.display_stats();
      WIDGETS.creep.style.display = "block";
      this.hp_updater = CreepHpUpdater(SET, this.creep);
    }
  };
  this.tear_down = function() {
    WIDGETS.creep.style.display = "none";
    if (this.hp_updater) {
      this.hp_updater.should_die = true;
    }
  };
  this.name = function() {
    return "CreepSelectMode";
  };
};
CreepSelectMode.prototype = new UserInterfaceMode();

var select_creep = function(SET) {
  SET.state = CreepSelectMode(SET);
};

/* AimBombMode */

var AimBombMode = function(SET) {
  this.cost = SET.bomb_cost;
  this.radius = SET.missile_blast_radius * SET.pixels_per_square * 1.0;
  this.draw = function(x,y) {
    if (this.mr) this.mr.is_dead = function() { return true; };
    this.mr = MissileRadius(SET,x,y,this.radius);
  }
  this.set_up = function(x,y) {
    this.draw(x,y);
  }
  this.tear_down = function() {
    if (this.mr) this.mr.is_dead = function() { return true; };
  }
  this.can_enter_mode = function(x,y) {
    if (SET.gold >= this.cost) return true;
    else return false;
  };
  this.name = function() {
    return "AimBombMode";
  };
  this.is_legal = function() { return true; };
  this.action = function(x,y) {
    var creeps = SET.rendering_groups[SET.creep_render_level];
    var l = creeps.length;
    var range = Math.floor(this.radius);
    for (var i=0;i<l;i++) {
      var creep = creeps[i];
      var d = Math.floor(dist(x,y,creep.x,creep.y));
      if (d <= range)
        creep.hp = Math.floor(creep.hp / 2);
    }
    SET.gold -= this.cost;
    var cost_increase = SET.bomb_cost * 0.25;
    if (cost_increase < 25) cost_increase = 25;
    SET.bomb_cost = Math.floor(SET.bomb_cost + cost_increase);
    WIDGETS.bomb_cost.innerHTML = SET.bomb_cost;
  }
}
AimBombMode.prototype = new UserInterfaceMode();

var aim_bomb = function(x,y) {
  attempt_to_enter_ui_mode(SETS[0], new AimBombMode(SETS[0]));
};

var PauseMode = function(SET) {
  this.name = function() { return "PauseMode" };
  this.can_leave_mode = function(x,y) {
    return false;
  };
  this.set_up = function() {
    this.began_at = SET.now;
  }
  this.tear_down = function() {
// remove this section since time won't change during pause
/*
    var elapsed = SET.now - this.began_at;
    SET.rendering_groups.forEach(function(group) {
      group.forEach(function(member) {
      if (member.last)
        member.last += elapsed;
      });
    });
*/
  }
  this.name = function() { return "PauseMode"; };
};
PauseMode.prototype = new UserInterfaceMode();

var GameOverMode = function(SET) {
  this.set_up = function(x,y) {
    SET.score += SET.gold;
    SET.gold = 0;
  }
  this.name = function() { return "GameOverMode"; };
  this.can_leave_mode = function(x,y) { return false; };
};
GameOverMode.prototype = new UserInterfaceMode();

/*
  util.js
*/

/* Coordinate System
  
There are two coordinate systems in effect that need 
to be taken into consideration. The first is the pixel
coordinate system, and the second is a coordinate system
formed by a grid of veritical and horizontal lines.
The grid's size is determined by three settings.

1. *pixels_per_square* determines the number of pixels per grid square.
2. *height* determines the overall height of the board.
3. *width* determines the overall width of the board.

Thus the board will create as many squares as possible within
the constraints of the height and width that it is given.

Within the code, positions within the grid coordinate
system are always referred to as (gx,gy) and positions
in the pixel coordinate system are always referred to
as (x,y). This is a very important distinction, and
mixing the two together can cause ample confusion.

*/

/*
  General utility functions.
 */
// return a random number (0 <= n <= max)
var random = function(max) {
  return Math.floor(Math.random()*(max+1));
};

//given a start point, and end point, and a speed at which to travel,
//return the point that the entity should go to in the next draw
var calc_path = function(x1,y1,x2,y2,speed) {
  var ac = y2 - y1;
  var bc = x2 - x1;
  var ab = Math.sqrt(Math.pow(ac,2) + Math.pow(bc,2));
  var de = (1.0 * speed * ac) / ab;
  var be = (1.0 * speed * bc) / ab;
  return {y:de,x:be};
};

var dist = function(x1,y1,x2,y2) {
  var ac = y2 - y1;
  var bc = x2 - x1;
  return Math.sqrt(Math.pow(ac,2) + Math.pow(bc,2));
}

/*
  Coordinate systems utilities.
 */

// return pixel coordinates of top left corner
// of square at grid coordinates (gx,gy)
var grid_to_pixel = function(SET,gx,gy) {
  if (gy == undefined) {
    gy = gx.gy;
    gx = gx.gx;
  }
  return {x:SET.x_offset + gx*SET.pixels_per_square
        , y:SET.y_offset + gy*SET.pixels_per_square};
};

// return grid coordinates of square containing pixel
// coordinate (x,y)
var pixel_to_grid = function(SET,x,y) {
  if (y == undefined) {
    y = x.y;
    x = x.x;
  }
  var grid_x = Math.floor((x - SET.x_offset) / SET.pixels_per_square);
  var grid_y = Math.floor((y - SET.y_offset) / SET.pixels_per_square);
  return {gx:grid_x, gy:grid_y};
};

// return pixel coordinates for the center of
// square at grid coordinates (gx,gy)
var center_of_square = function(SET,gx,gy) {
  if (gy == undefined) {
    gy = gx.gy;
    gx = gx.gx;
  }
  var coords = grid_to_pixel(SET,gx,gy);
  return {x:coords.x + SET.half_pixels_per_square,
      y:coords.y + SET.half_pixels_per_square};
};

/*
  Drawing functions.
 */

// draw a square filling square (gx,gy)
var draw_square_in_grid = function(SET,gx,gy) {
  var pos = grid_to_pixel(SET,gx,gy);
  rect(pos.x,pos.y,SET.pixels_per_square,SET.pixels_per_square);
}

// draw a circle filling (gx,gy)
var draw_circle_in_grid = function(SET,gx,gy) {
  var pos = grid_to_pixel(SET,gx,gy);
  var h = SET.half_pixels_per_square;
  var l = SET.pixels_per_square;
  ellipse(pos.x+h,pos.y+h,l-1,l-1);
};

/*
  Various game utility functions.
 */
  
var can_build_here = function(SET,gx,gy) {
  if ( get_tower_at(SET,gx,gy) != false) return false;
  if ((gx == SET.entrance.gx) && (gy == SET.entrance.gy)) return false;
  if ((gx == SET.exit.gx) && (gy == SET.exit.gy)) return false;
  
  return true;
};

var get_tower_at = function(SET,gx,gy) {
  var cached = SET.grid_cache_at(gx,gy);
  if (cached.tower) return cached.tower;

  var towers = SET.rendering_groups[SET.tower_render_level];
  for (var i=0;i<towers.length;i++) {
    var tower = towers[i];
    if (tower.gx == gx && tower.gy == gy) {
      cached.tower = tower;
      return tower;      
    }
  }
  return false;
};

var get_terrain_at = function(SET,gx,gy) {
  var cached = SET.grid_cache_at(gx,gy);
  if (cached.terrain) return cached.terrain;

  var squares = SET.rendering_groups[SET.square_render_level];
  for (var i=0;i<squares.length;i++) {
    var square = squares[i];
    if (square.gx == gx && square.gy == gy) {
      cached.terrain = square;
      return square;
    }
  }
  return;
}

var get_creep_nearest = function(SET,x,y,sensitivity) {
  if (!sensitivity) sensitivity = 10;
  var creeps = SET.rendering_groups[SET.creep_render_level];
  var len = creeps.length;
  var nearest_creep;
  var distance = sensitivity;
  for (var i=0;i<len;i++) {
    var creep = creeps[i];
    var d = dist(x,y,creep.x,creep.y);
    if (d < distance) {
      distance = d;
      nearest_creep = creep;
    }
  }
  return (distance < sensitivity) ? nearest_creep : undefined;
}


// Pretty-printing of objects
var pp = function(obj, depth) {
  if (depth == undefined) depth = 4;
  depth -= 1;
  if (depth <= 0)
    return '' + obj;
  if (obj instanceof Array) {
    var str = "[";
    obj.forEach(function(i){
      str += pp(i,depth) + ", ";
    });
    return str + "]";
  }
  if (obj instanceof String)
    return '"'+str+'"';
  if (obj instanceof Object){
    var str="{"; //variable which will hold property values
    for(prop in obj){
      if (prop == "ancestor")
        depth = 0;
      str+= pp(prop,depth) + ":" + pp(obj[prop],depth) +", ";
    }
    return str + "}";
  }


  return '' + obj;
    
  
}

var log = function(label, thing) {

}



var insert_sorted = function(array, value, sortKey) {
  var vkey = sortKey(value);
  var min=0;
  var max=array.length;
  var mid=-1;
  while(true){
    if (max<=min) {
      break;
    }
    mid = Math.floor((max+min)/2);
    if (mid >= array.length || mid < 0) {
      log("outofbounds in insert sorted");
      break;
    }
    if (vkey <= sortKey(array[mid]))
      max = mid-1;
    else
      min = mid+1;
  }
  mid = Math.floor((max+min)/2);
  if (array[mid])
    if (vkey > sortKey(array[mid]))
      mid += 1;
  mid = Math.max(0,mid);
  
  var result = array.slice(0,mid).concat([value]).concat(array.slice(mid))
//   log("inserting", [mid,vkey,array.map(sortKey), result.map(sortKey)]);
//   var rm = result.map(sortKey);
//   if (!rm.equals(rm.slice().sort(function(a,b){return a-b})))
//     log("insert_sorted failed inserting",[vkey,rm]);
  return result;
}

//moves the given object towards the target at speed
//also ensures that the given object doesn't go outside of the bounds
//of the map
var move_towards = function(SET,obj, x,y,tx,ty,speed) {
  var path = calc_path(x,y,tx,ty,speed);
  obj.x += path.x;
  obj.y += path.y;
  obj.x = Math.max(0, Math.min(SET.x_offset + SET.width , obj.x));
  obj.y = Math.max(0, Math.min(SET.y_offset + SET.height, obj.y));
}

// Get the value of a single window.location.search key
// https://developer.mozilla.org/en/DOM/window.location
function loadPageVar (sVar) {
  return unescape(window.location.search.replace(new RegExp("^(?:.*[&\\?]" + escape(sVar).replace(/[\.\+\*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), "$1"));
}

/*
  weapons.js
*/

var CircleZone = function(SET,x,y,r) {
  var cz = new Object();
  Object.extend(cz, InertDrawable);
  var d = 2*r;
  cz.color = SET.killzone_color;
  cz.draw = function() {
    fill(this.color);
    stroke(255);
    ellipse(x,y,d,d);
  };
  return cz
}

var KillZone = function(SET,x,y,r) {
  var kz = new CircleZone(SET,x,y,r);
  assign_to_depth(SET, kz, SET.killzone_render_level);
  return kz;
};

var BuildRadius = function(SET,x,y,r) {
  var br = KillZone(SET,x,y,r);
  assign_to_depth(SET, br, SET.build_zone_render_level);
  return br;
};

var MissileRadius = function(SET,x,y,r) {
  var mr = KillZone(SET,x,y,r);
  mr.color = color(0, 40,40,0.5);
  return mr;
}

var Tower = function(SET,settings) {
  var tower = GridSquare(SET,settings.gx,settings.gy,settings.color);
  Object.extend(tower, settings);
  // note, range is in terms of grid squares
  // and is calculated from center of tower
  tower.set_range = function(range) {
    tower.range = range;
    tower.prange = range * SET.pixels_per_square;
  };
  tower.account_for_terrain = function() {
    var terrain = get_terrain_at(SET,this.gx,this.gy);
    this.damage = this.damage * terrain.tower_damage_modifier;
    this.set_range(this.range * terrain.tower_range_modifier);
    this.reload_rate = this.reload_rate * terrain.tower_frequency_modifier;
  };
  tower.set_range(3.5);
  tower.damage = 5.0;
  tower.attack = function(creep) {};
  var mid = center_of_square(SET,tower.gx,tower.gy);
  tower.x_mid = mid.x;
  tower.y_mid = mid.y;
  tower.fired_at = 0;
  tower.reload_rate = 1000;
  tower.weapon_ready = function() {
    if (SET.now - tower.fired_at > tower.reload_rate) {
      tower.fired_at = SET.now;
      return true;
    }
    return false;
  };
  tower.update = function() {
    var creeps = SET.rendering_groups[SET.creep_render_level];
    if (creeps.length == 0) return;
    var closest_creep;
    var closest_distance;
    creeps.forEach(function(creep) {
      var distance = dist(tower.x_mid,tower.y_mid,creep.x,creep.y);
      if (distance < tower.prange) {
        if (!closest_creep) {
          closest_creep = creep;
          closest_distance = distance;
        }
        else {
          if (distance < closest_distance) {
            closest_creep = creep;
            closest_distance = distance;
          }
        }
      }
    });
    if (closest_creep && tower.weapon_ready() == true)
      tower.attack(closest_creep);
  }
  tower.sale_value = 50;
  tower.sell = function() {
    SET.gold += Math.floor(this.sale_value * 0.75);
    this.is_dead = function() { return true; };
    SET.grid_cache_at(this.gx,this.gy).tower = undefined;

    unselect(SET);
  }
  tower.display_stats = function() {
    WIDGETS.tower_type.innerHTML = this.type;
    WIDGETS.tower_range.innerHTML = this.range;
    WIDGETS.tower_damage.innerHTML = this.damage;
    WIDGETS.tower_rate.innerHTML = this.reload_rate;
    WIDGETS.tower_sell_button.innerHTML = "Sell tower for " + Math.floor(this.sale_value * 0.75) + " gold!";
    WIDGETS.tower_upgrade_button.innerHTML = "<u>U</u>pgrade for " + Math.floor(this.upgrade_cost) + " gold!";

    WIDGETS.tower_upgrade_button.onclick = function() {
      tower.upgrade();
    }
    WIDGETS.tower_sell_button.onclick = function() {
      tower.sell();
      reset_pathfinding();
    }
    WIDGETS.tower.style.display = "block";
  };
  tower.draw = function() {
    noStroke();
    fill(this.color);
    draw_circle_in_grid(SET,this.gx,this.gy);
  }
  assign_to_depth(SET, tower, SET.tower_render_level);
  return tower;
};

var MissileTower = function(SET,gx,gy) {
  var mt = Tower(SET, {gx:gx,gy:gy,color:color(250,150,50)});
  mt.type = "Missile Tower";
  mt.damage = 5000;
  mt.upgrade_cost = 100;
  mt.sale_value = 100;
  mt.set_range(5.5);
  mt.reload_rate = 2000;
  mt.attack = function(creep) {
    assign_to_depth(SET, Missile(SET,this,creep),SET.bullet_render_level);
  }
  mt.upgrade = function() {
    if (SET.gold >= this.upgrade_cost) {
      SET.gold -= this.upgrade_cost;
      this.sale_value = Math.floor(this.sale_value + this.upgrade_cost);
      this.upgrade_cost = Math.floor(this.upgrade_cost * 1.5);
      this.damage = Math.floor(this.damage * 2.5);
      this.set_range(this.range + 0.5);

      unselect(SET);
      SET.state = new TowerSelectMode(SET);
      SET.state.set_up(this.x_mid,this.y_mid);
    }
    else error("You don't have enough gold to upgrade, you need " + (this.upgrade_cost - SET.gold) + " more.");
  }
  mt.account_for_terrain();
  return mt;
}

var LaserTower = function(SET,gx,gy) {
  var lt = Tower(SET,{gx:gx,gy:gy,color:color(90,150,50)});
  lt.type = "Laser Tower";
  lt.attack = function(creep) {
    assign_to_depth(SET,Laser(SET,this,creep),SET.bullet_render_level);
  };
  lt.upgrade_cost = 25;
  lt.sale_value = 13;
  lt.upgrade = function() {
    if (SET.gold >= this.upgrade_cost) {
      SET.gold -= this.upgrade_cost;
      this.sale_value = Math.floor(this.sale_value + this.upgrade_cost);
      this.upgrade_cost = Math.floor(this.upgrade_cost * 1.5);
      this.damage = Math.floor(this.damage * 2.0);
      this.set_range(this.range + 0.25);
      this.reload_rate = this.reload_rate - 10;

      unselect(SET);
      SET.state = new TowerSelectMode(SET);
      SET.state.set_up(this.x_mid,this.y_mid);
    }
    else error("You don't have enough gold to upgrade, you need " + (this.upgrade_cost - SET.gold) + " more.");
  }
  lt.damage = 10;
  lt.set_range(4);
  lt.reload_rate = 250;
  lt.account_for_terrain();
  return lt;
};

var CannonTower = function(SET,gx,gy) {
  var lt = Tower(SET,{gx:gx,gy:gy,color:color(100,120,140)});
  lt.type = "Cannon Tower";
  lt.attack = function(creep) {
    assign_to_depth(SET,CannonBall(SET,this,{x:creep.x, y:creep.y, hp:1}),SET.bullet_render_level);
  };
  lt.upgrade_cost = 75;
  lt.sale_value = 50;
  lt.upgrade = function() {
    if (SET.gold >= this.upgrade_cost) {
      SET.gold -= this.upgrade_cost;
      this.sale_value = Math.floor(this.sale_value + this.upgrade_cost);
      this.upgrade_cost = Math.floor(this.upgrade_cost * 1.5);
      this.damage = Math.floor(this.damage * 2.0);
      this.set_range(this.range + 0.25);
      this.reload_rate = this.reload_rate - 10;

      unselect(SET);
      SET.state = new TowerSelectMode(SET);
      SET.state.set_up(this.x_mid,this.y_mid);
    }
    else error("You don't have enough gold to upgrade, you need " + (this.upgrade_cost - SET.gold) + " more.");
  }
  lt.damage = 100;
  lt.set_range(4);
  lt.reload_rate = 1000;
  lt.account_for_terrain();
  return lt;
};

var GatlingTower = function(SET,gx,gy) {
  var gt = Tower(SET,{gx:gx,gy:gy,color:color(250,250,50)});
  gt.type = "Gatling Tower";
  gt.damage = 50;
  gt.upgrade_cost = 25;
  gt.sale_value = 50;
  gt.set_range(3.5);

  gt.reload_rate = 100;
  gt.shots_per_volley = 12;
  gt.shots_left_in_volley = gt.shots_per_volley;
  gt.pause_after_volley = 2000;
  gt.finish_reload_at = 0;
  gt.reloading = false;
  gt.fire_next_at = 0;

  gt.weapon_ready = function() {
    if (gt.reloading && gt.finish_reload_at < SET.now) {
      gt.shots_left_in_volley = gt.shots_per_volley;
      gt.reloading = false;
    }
    if (!gt.reloading && gt.fire_next_at < SET.now) {
      return true;
    }
    return false;
  };

  gt.attack = function(creep) {
    assign_to_depth(SET,Bullet(SET,this,creep),SET.bullet_render_level);
    gt.shots_left_in_volley--;
    gt.fire_next_at = SET.now + gt.reload_rate;
    if (gt.shots_left_in_volley < 1) {
      gt.reloading = true;
      gt.finish_reload_at = SET.now + gt.pause_after_volley;
    }
  }

  gt.upgrade = function() {
    if (SET.gold >= this.upgrade_cost) {
      SET.gold -= this.upgrade_cost;
      this.sale_value = Math.floor(this.sale_value + this.upgrade_cost);
      this.upgrade_cost = Math.floor(this.upgrade_cost * 1.5);
      this.damage = Math.floor(this.damage * 2.5);
      this.set_range(this.range + 0.5);
      this.reload_rate = Math.floor(this.reload_rate * 0.95);
      unselect(SET);
      SET.state = new TowerSelectMode(SET);
      SET.state.set_up(this.x_mid,this.y_mid);
    }
    else error("You don't have enough gold to upgrade, you need " + (this.upgrade_cost - SET.gold) + " more.");
  }
  gt.account_for_terrain();
  return gt;
}

var Weapon = function(SET,tower,target) {
  var w = new Object();
  w.x = tower.x_mid;
  w.y = tower.y_mid;
  w.target = target;
  w.tower = tower;
  w.proximity = 7;
  w.damage = tower.damage;
  w.last = SET.now;
  w.impact = function(target) {
    this.is_dead = function() { return true; };
    target.hp -= this.damage;
  }
  w.update = function() {
    var distance = dist(this.x,this.y,this.target.x,this.target.y);
    if (distance < this.proximity) {
      this.impact(this.target);
    }
    else {
      var elapsed = 1.0 * (SET.now - this.last);
      var speed = this.speed * (elapsed/1000);
      this.last = SET.now;
      move_towards(SET, this, this.x,this.y,target.x,target.y,this.speed);
    }
  }
  w.is_dead = function() {
    if (!target || target.hp <= 0) return true;
    return false;
  };
  return w;
};

var Bullet = function(SET, tower, target) {
  var b = new Object();
  Object.extend(b, Weapon(SET,tower,target));
  b.size = 5;
  b.color = color(255,255,255);
  b.fill_color = color(100,255,0);
  b.speed = 8;
  b.damage = tower.damage;
  b.proximity = 10;
  b.draw = function() {
    stroke(b.color);
    fill(b.fill_color);
    ellipse(this.x,this.y,this.size,this.size);
  }
  return b;
}

var CannonBall = function(SET, tower, target) {
  var c = new Object();
  Object.extend(c, Weapon(SET,tower,target));
  c.midpoint = {x:Math.floor((c.x + target.x)/2.0), y:Math.floor((c.y + target.y) / 2.0)};
  c.middist = dist(c.x, c.y, c.midpoint.x, c.midpoint.y);
  c.min_size = 8
  c.size_variance = 4;
  c.color = color(0,0,0);
  c.fill_color = color(50,50,50);
  c.speed = 8;
  c.damage = tower.damage;
  c.proximity = 25;
  c.splash_range = 50.0;
  c.draw = function() {
    var percent_to_apex = ((this.middist - dist(this.x, this.y, this.midpoint.x, this.midpoint.y)) / this.middist);
    size = ((1 - Math.pow(1 - percent_to_apex, 2)) * this.size_variance) + this.min_size;
    log("drawing cannonball", size);
    stroke(this.color);
    fill(this.fill_color);
    ellipse(this.x,this.y,size,size);
  };
  c.impact = function(target) {
    this.is_dead = function() { return true; };
    var creeps = SET.rendering_groups[SET.creep_render_level];
    var l = creeps.length;
    var range = Math.floor(this.splash_range);
    for (var i=0;i<l;i++) {
      var creep = creeps[i];
      var d = Math.floor(dist(this.x,this.y,creep.x,creep.y));
      if (d <= range) {
        creep.hp -= this.damage;
      }
    }
  };

  return c;
};

var Missile = function(SET,tower,target) {
  var m = new Object();
  Object.extend(m, Weapon(SET,tower,target));
  m.size = 10;
  m.color = color(255,0,0);
  m.fill_color = color(250,50,50);
  m.speed = 8;
  m.damage = tower.damage;
  m.proximity = 20;
  m.is_dead = function() {
    if (!this.target || this.target.hp <= 0) {
      this.target = get_creep_nearest(SET,this.x,this.y,100);
      //log("new target: " + pp(this.target));
    }
    if (!this.target) return true;
    return false;
  }

  m.draw = function() {
    stroke(m.color);
    fill(m.fill_color);
    var mx = this.x;
    var my = this.y;
    var size = this.size;
    var tx = this.target.x;
    var ty = this.target.y;
    var tth = Math.atan((ty-my)/(tx-mx));
    var angle = 2.35619449; // 135 degrees in radians
    triangle(mx,my,
            mx+size * Math.cos(tth - 2.35619449), my+size * Math.sin(tth + 2.35619449),
            mx+size * Math.cos(tth + 2.35619449), my+size * Math.sin(tth - 2.35619449));
  }
  return m;
};

var Laser = function(SET,tower,target) {
  var l = new Object();
  Object.extend(l, Weapon(SET,tower,target));
  l.tail = 20; // length of laser's graphic
  l.color = color(0,0,255);
  l.speed = 10;
  l.proximity = 10;
  l.draw = function() {
    var path = calc_path(l.x,l.y,tower.x_mid,tower.y_mid,l.tail);
    stroke(l.color);
    line(l.x,l.y,l.x+path.x,l.y+path.y);
  }
  return l;
};
