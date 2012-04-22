var CreepWaveController = function(SET) {
  var cwc = new Object();
  cwc.objtype = "CreepWaveController";
  imbueWithFunctions[cwc.objtype](cwc, SET);
  cwc.delay = 25000;
  cwc.last = SET.now-20000;
  cwc.wave = 1;
  assign_to_depth(SET, cwc, SET.system_render_level);
  return cwc;
};
imbueWithFunctions["CreepWaveController"] = function (cwc, SET) {
  Object.extend(cwc, InertDrawable);
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

};

var CreepWave = function(SET, settings) {
  var cw = new Object();
  cw.objtype = "CreepWave";
  imbueWithFunctions[cw.objtype](cw, SET);
  cw.remaining = 20;
  cw.wave = 1;
  cw.last = 0;
  cw.interval = 1000;
  Object.extend(cw, settings);
  assign_to_depth(SET, cw, SET.system_render_level);
  SET.creep_variety = "Normal Creeps";
  return cw;
};
imbueWithFunctions["CreepWave"] = function (cw, SET) {
  Object.extend(cw, InertDrawable);
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
