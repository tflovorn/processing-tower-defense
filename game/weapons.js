var CircleZone = function(SET,x,y,r) {
  var cz = new Object();
  cz.objtype = "CircleZone";
  imbueWithFunctions[cz.objtype](cz, SET);
  cz.x = x;
  cz.y = y;
  cz.d = 2*r;
  cz.color = SET.killzone_color;
  return cz
}
imbueWithFunctions["CircleZone"] = function (cz, SET) {
  Object.extend(cz, InertDrawable);
  cz.draw = function() {
    fill(this.color);
    stroke(255);
    ellipse(cz.x,cz.y,cz.d,cz.d);
  };
};

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
  tower.objtype = "Tower";
  imbueWithFunctions[tower.objtype](tower, SET);
  tower.set_range(3.5);
  tower.damage = 5.0;
  var mid = center_of_square(SET,tower.gx,tower.gy);
  tower.x_mid = mid.x;
  tower.y_mid = mid.y;
  tower.fired_at = 0;
  tower.reload_rate = 1000;
  tower.sale_value = 50;
  assign_to_depth(SET, tower, SET.tower_render_level);
  return tower;
};
imbueWithFunctions["Tower"] = function (tower, SET) {
  imbueWithFunctions["GridSquare"](tower, SET);
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
  tower.weapon_ready = function() {
    if (SET.now - tower.fired_at > tower.reload_rate) {
      tower.fired_at = SET.now;
      return true;
    }
    return false;
  };
  tower.attack = function(creep) {};
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

};

var MissileTower = function(SET,gx,gy) {
  var mt = Tower(SET, {gx:gx,gy:gy,color:color(250,150,50)});
  mt.objtype = "MissileTower";
  mt.type = "Missile Tower";
  mt.damage = 5000;
  mt.upgrade_cost = 100;
  mt.sale_value = 100;
  mt.set_range(5.5);
  mt.reload_rate = 2000;
  mt.account_for_terrain();
  return mt;
}
imbueWithFunctions["MissileTower"] = function (mt, SET) {
  imbueWithFunctions["Tower"](mt, SET);
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
};

var LaserTower = function(SET,gx,gy) {
  var lt = Tower(SET,{gx:gx,gy:gy,color:color(90,150,50)});
  lt.objtype = "LaserTower";
  lt.type = "Laser Tower";
  lt.upgrade_cost = 25;
  lt.sale_value = 13;
  lt.damage = 10;
  lt.set_range(4);
  lt.reload_rate = 250;
  lt.account_for_terrain();
  return lt;
};
imbueWithFunctions["LaserTower"] = function (lt, SET) {
  imbueWithFunctions["Tower"](lt, SET);
  lt.attack = function(creep) {
    assign_to_depth(SET,Laser(SET,this,creep),SET.bullet_render_level);
  };
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
};

var CannonTower = function(SET,gx,gy) {
  var lt = Tower(SET,{gx:gx,gy:gy,color:color(100,120,140)});
  lt.objtype = "CannonTower";
  imbueWithFunctions[lt.objtype](lt, SET);
  lt.type = "Cannon Tower";
  lt.upgrade_cost = 75;
  lt.sale_value = 50;
  lt.damage = 100;
  lt.set_range(4);
  lt.reload_rate = 1000;
  lt.account_for_terrain();
  return lt;
};
imbueWithFunctions["CannonTower"] = function (lt, SET) {
  imbueWithFunctions["Tower"](lt, SET);
  lt.attack = function(creep) {
    assign_to_depth(SET,CannonBall(SET,this,{x:creep.x, y:creep.y, hp:1}),SET.bullet_render_level);
  };
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
};

var GatlingTower = function(SET,gx,gy) {
  var gt = Tower(SET,{gx:gx,gy:gy,color:color(250,250,50)});
  gt.objtype = "GatlingTower";
  imbueWithFunctions[gt.objtype](gt, SET);
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

  gt.account_for_terrain();
  return gt;
}
imbueWithFunctions["GatlingTower"] = function (gt, SET) {
  imbueWithFunctions["Tower"](gt, SET);
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
};

var Weapon = function(SET,tower,target) {
  var w = new Object();
  w.objtype = "Weapon";
  w.x = tower.x_mid;
  w.y = tower.y_mid;
  w.target = target;
  w.tower = tower;
  w.proximity = 7;
  w.damage = tower.damage;
  w.last = SET.now;
  return w;
};
imbueWithFunctions["Weapon"] = function (w, SET) {
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
      move_towards(SET, this, this.x,this.y,this.target.x,this.target.y,this.speed);
    }
  }
  w.is_dead = function() {
    if (!this.target || this.target.hp <= 0) return true;
    return false;
  };

};

var Bullet = function(SET, tower, target) {
  var b = new Object();
  Object.extend(b, Weapon(SET,tower,target));
  b.objtype = "Bullet";
  imbueWithFunctions[b.objtype](b, SET);
  b.size = 5;
  b.color = color(255,255,255);
  b.fill_color = color(100,255,0);
  b.speed = 8;
  b.damage = tower.damage;
  b.proximity = 10;
  return b;
}
imbueWithFunctions["Bullet"] = function (b, SET) {
  imbueWithFunctions["Weapon"](b, SET);
  b.draw = function() {
    stroke(b.color);
    fill(b.fill_color);
    ellipse(this.x,this.y,this.size,this.size);
  }
};

var CannonBall = function(SET, tower, target) {
  var c = new Object();
  Object.extend(c, Weapon(SET,tower,target));
  c.objtype = "CannonBall";
  imbueWithFunctions[c.objtype](c, SET);
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

  return c;
};
imbueWithFunctions["CannonBall"] = function (c, SET) {
  imbueWithFunctions["Weapon"](c, SET);
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
};

var Missile = function(SET,tower,target) {
  var m = new Object();
  Object.extend(m, Weapon(SET,tower,target));
  m.objtype = "Missile";
  imbueWithFunctions[m.objtype](m, SET);
  m.size = 10;
  m.color = color(255,0,0);
  m.fill_color = color(250,50,50);
  m.speed = 8;
  m.damage = tower.damage;
  m.proximity = 20;
  return m;
};
imbueWithFunctions["Missile"] = function (m, SET) {
  imbueWithFunctions["Weapon"](m, SET);
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

};

var Laser = function(SET,tower,target) {
  var l = new Object();
  Object.extend(l, Weapon(SET,tower,target));
  l.objtype = "Laser";
  l.tail = 20; // length of laser's graphic
  l.color = color(0,0,255);
  l.speed = 10;
  l.proximity = 10;
  return l;
};
imbueWithFunctions["Laser"] = function (l, SET) {
  imbueWithFunctions["Weapon"](l, SET);
  l.draw = function() {
    var path = calc_path(l.x,l.y,this.tower.x_mid,this.tower.y_mid,l.tail);
    stroke(l.color);
    line(l.x,l.y,l.x+path.x,l.y+path.y);
  }
};
