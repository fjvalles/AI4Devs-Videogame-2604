// Orquestador. Dueño único del estado y de la máquina de estados.

import { STATE, PLAYER, ICE_FRICTION, LEVELS, PLAYER_PROGRESS } from "./config.js";
import { input } from "./core/input.js";
import { makeRng, randomSeed } from "./core/rng.js";
import { generateMaze } from "./world/Maze.js";
import { Camera } from "./systems/camera.js";
import { moveEntity, circlesOverlap, dist } from "./systems/physics.js";
import { terrainAt } from "./systems/terrain.js";
import { attack, collectItems, updateProjectiles, damageMonster } from "./systems/combat.js";
import { pruneEffects, speedMul, hasEffect } from "./systems/effects.js";
import { makeMonster, updateMonster } from "./entities/Monster.js";
import { SPAWN_POOL_L1, SPAWN_POOL_L2, SPAWN_POOL_L3 } from "./entities/monsterTypes.js";
import { WEAPON_SLOTS, makeWeapon } from "./entities/Weapon.js";
import { rollChestDrops } from "./systems/loot.js";
import { renderWorld } from "./ui/render.js";
import { setMusicLevel, sfx } from "./core/audio.js";
import { T as TileT } from "./world/tiles.js";

export class Game {
  constructor(ctx) {
    this.ctx = ctx;
    this.state = STATE.MENU;
    this.level = 1;
    this.time = 0;
    this.reset();
  }

  reset() {
    this.map = null;
    this.camera = new Camera();
    this.player = null;
    this.monsters = [];
    this.items = [];
    this.companions = [];
    this.playerTrail = [];
    this.chests = [];
    this.projectiles = [];
    this.monsterProjectiles = [];
    this.hazardProjectiles = [];
    this.terrainFeatures = [];
    this.roomEncounters = [];
    this.dynamicMudTiles = [];
    this.shiftableWalls = [];
    this.shiftableFloors = [];
    this.nextMudShiftAt = 0;
    this.nextMazeShiftAt = 0;
    this.rng = null;
    this.stats = { kills: 0, bossKilled: false };
    this.blockedMsgUntil = 0;
    this.bannerText = "";
    this.pickupText = "";
    this.pickupMsgUntil = 0;
    this.selectedLevel = this.loadHighestUnlocked();
    this.highestUnlocked = this.loadHighestUnlocked();
    this.levelTimeLeft = 0;
    this.isHellMode = false;
    this.nextReviveAt = 0;
    this.nextSaveAt = 0;
  }

  startRun(level = this.selectedLevel || 1) {
    this.level = clamp(Math.floor(level), 1, this.highestUnlocked);
    this.selectedLevel = this.level;
    this.stats = { kills: 0, bossKilled: false };
    this.runStartedAt = this.time;
    this.player = this.makePlayer(0, 0);
    this.buildLevel(randomSeed());
    this.state = STATE.PLAYING;
  }

  summary() {
    const secs = Math.max(0, Math.round(this.time - this.runStartedAt));
    const mm = String(Math.floor(secs / 60)).padStart(2, "0");
    const ss = String(secs % 60).padStart(2, "0");
    return {
      kills: this.stats.kills,
      coins: this.player ? this.player.inventory.coins : 0,
      level: this.level,
      time: `${mm}:${ss}`,
    };
  }

  makePlayer(x, y) {
    return {
      x, y,
      vx: 0, vy: 0,
      radius: PLAYER.radius,
      hp: PLAYER.maxHp,
      maxHp: PLAYER.maxHp,
      invulnUntil: 0,
      facing: { x: 1, y: 0 },
      swingUntil: 0,
      weapon: makeWeapon("sword"),
      inventory: { coins: 0, ammo: 8, keys: 0, weapons: { sword: true, bow: true } },
      activeEffects: [],
      level: 1,
      xp: 0,
      xpNext: PLAYER_PROGRESS.baseXpNext,
      attackBonus: 0,
      resistBonus: 0,
    };
  }

  buildLevel(seed) {
    this.rng = makeRng(seed);
    const maze = generateMaze(this.rng);
    this.map = maze.map;
    this.rooms = maze.rooms;
    this.exitPoint = maze.exitPoint;
    this.keyRequired = true;

    const p = this.player;
    p.x = maze.spawnPoint.x;
    p.y = maze.spawnPoint.y;
    p.vx = 0; p.vy = 0;
    p.invulnUntil = this.level === 1 ? this.time + 4 : 0;
    p.inventory.keys = 0;
    p.activeEffects = [];

    this.items = [];
    this.companions = [];
    this.playerTrail = [];
    this.projectiles = [];
    this.monsterProjectiles = [];
    this.hazardProjectiles = [];
    this.roomEncounters = this.assignRoomEncounters(maze);
    this.chests = this.spawnChests();
    this.terrainFeatures = this.spawnTerrainFeatures(maze);
    this.monsters = this.spawnMonsters(maze);
    this.spawnCompanions();
    this.prepareDynamicTerrain();
    this.nextMudShiftAt = this.time + 3;
    this.nextMazeShiftAt = this.time + (this.level === 1 ? 18 : 10);
    this.camera.follow(this.player, this.map);
    setMusicLevel(this.level);

    this.levelTimeLeft = LEVELS.levelTimeLimit;
    this.isHellMode = false;
    this.nextReviveAt = 0;
  }

  spawnMonsters(maze) {
    const out = [];

    const lvlHp  = 1 + (this.level - 1) * LEVELS.hpScale;
    const lvlDmg = 1 + (this.level - 1) * LEVELS.damageScale;
    const lvlSpd = 1 + (this.level - 1) * LEVELS.speedScale;

    const scale = (m) => {
      m.hp       = Math.round(m.hp       * lvlHp);
      m.maxHp    = m.hp;
      m.damage   = Math.round(m.damage   * lvlDmg);
      m.speed    = Math.round(m.speed    * lvlSpd);
      if (m.projectileDamage) m.projectileDamage = Math.round(m.projectileDamage * lvlDmg);
      if (this.level === 1 && !m.isBoss) {
        m.damage = Math.max(2, Math.floor(m.damage * 0.55));
        m.speed = Math.max(28, Math.floor(m.speed * 0.68));
        m.detectRange = Math.min(m.detectRange, 120);
        m.loseRange = Math.min(m.loseRange, 220);
        m.guardHome = { x: m.x, y: m.y };
      }
      return m;
    };

    // Guardián en la sala de las escaleras
    const bc = this.map.centerOf(
      Math.floor(maze.exitRoom.x + maze.exitRoom.w / 2),
      Math.floor(maze.exitRoom.y + maze.exitRoom.h / 2),
    );
    out.push(scale(makeMonster("boss", bc.x, bc.y)));

    for (const encounter of this.roomEncounters) {
      if (encounter.type === "ambush") continue;
      for (const type of encounter.monsters) {
        const c = this.randomRoomPoint(encounter.room);
        out.push(scale(makeMonster(type, c.x, c.y)));
      }
    }
    return out;
  }

  spawnChests() {
    const out = [];
    let index = 0;
    for (const encounter of this.roomEncounters) {
      if (!encounter.chest) continue;
      const c = this.roomCenterWorld(encounter.room);
      out.push({
        id: `chest-${this.level}-${index++}`,
        x: c.x, y: c.y,
        radius: 15,
        opened: false,
        rare: encounter.type === "treasure" || this.level % 4 === 0,
      });
    }
    return out;
  }

  spawnTerrainFeatures(maze) {
    const out = [];
    let index = 0;
    for (const encounter of this.roomEncounters) {
      if (encounter.features.includes("gargoyle")) {
        const wallSpot = this.findWallFacingRoom(encounter.room);
        if (wallSpot) out.push({ type: "gargoyle", ...wallSpot, nextAt: this.time + 3.5 + index * 0.55 });
      }
      index++;
    }
    return out;
  }

  assignRoomEncounters(maze) {
    const rooms = maze.rooms.filter((r) => r !== maze.spawnRoom && r !== maze.exitRoom);
    const ordered = rooms
      .map((room) => ({ room, d: dist(this.roomCenterWorld(room).x, this.roomCenterWorld(room).y, maze.spawnPoint.x, maze.spawnPoint.y) }))
      .sort((a, b) => a.d - b.d)
      .map((x) => x.room);
    const templates = this.level === 1
      ? ["skirmish", "treasure", "rest", "skirmish", "ice_escape"]
      : this.level === 2
        ? ["skirmish", "treasure", "ranged", "rest", "hazard", "ice_escape"]
        : ["skirmish", "treasure", "hazard", "ranged", "ambush", "ice_escape"];
    return ordered.map((room, index) => this.makeEncounter(room, templates[index % templates.length], index));
  }

  makeEncounter(room, type, index) {
    const pool = this.level <= 1 ? SPAWN_POOL_L1
               : this.level <= 3 ? SPAWN_POOL_L2
               : SPAWN_POOL_L3;
    const encounter = {
      id: `room-${index}`,
      room,
      type,
      chest: false,
      monsters: [],
      features: [],
      label: "",
      triggered: type !== "ambush",
      captive: null,
    };
    const add = (...types) => encounter.monsters.push(...types);
    if (type === "treasure") {
      encounter.chest = true;
      encounter.label = "Tesoro custodiado";
      if (this.level === 1) add("slime");
      else add(this.rng.pick(["guard", "slime"]), this.rng.pick(["bat", "archer"]));
    } else if (type === "hazard") {
      encounter.label = "Sala de trampas";
      encounter.features.push("gargoyle", "gargoyle");
      if (this.level === 2) add("slime");
      else add(this.rng.pick(["slime", "bat"]), this.level > 2 ? this.rng.pick(["mage", "frost"]) : "guard");
    } else if (type === "ranged") {
      encounter.label = "Duelo a distancia";
      if (this.level === 2) add("bat");
      else add(this.level > 2 ? "archer" : "bat", this.level > 3 ? this.rng.pick(["mage", "bomber", "frost"]) : "archer");
    } else if (type === "ambush") {
      encounter.label = "Emboscada";
      add(this.rng.pick(pool), this.rng.pick(pool), this.level > 4 ? this.rng.pick(["bomber", "frost", "mage"]) : "slime");
    } else if (type === "ice_escape") {
      encounter.label = "Escape sobre hielo";
      if (this.level === 1) add("slime");
      else add(this.rng.pick(["bat", "archer"]), this.level > 2 ? "frost" : "slime");
      this.paintRoomIceLanes(room);
    } else if (type === "rest") {
      encounter.label = "Santuario del gremio";
      encounter.chest = true;
    } else {
      encounter.label = "Pelea";
      if (this.level === 1) add("slime");
      else add(this.rng.pick(pool), this.rng.pick(pool));
    }
    if (index % 5 === 4) encounter.chest = true;
    if (this.level >= 3 && index > 1 && index % 4 === 2) {
      encounter.captive = this.rng.pick(COMPANION_TYPES);
      encounter.chest = true;
      if (!encounter.monsters.includes("guard")) encounter.monsters.push("guard");
    }
    return encounter;
  }

  spawnCompanions() {
    for (const encounter of this.roomEncounters) {
      if (!encounter.captive) continue;
      const c = this.roomCenterWorld(encounter.room);
      this.companions.push({
        id: `companion-${encounter.id}`,
        ...encounter.captive,
        x: c.x + 18,
        y: c.y - 18,
        vx: 0, vy: 0,
        radius: 12,
        rescued: false,
        encounterId: encounter.id,
        nextAttackAt: 0,
      });
    }
  }

  roomCenterWorld(room) {
    return this.map.centerOf(Math.floor(room.x + room.w / 2), Math.floor(room.y + room.h / 2));
  }

  randomRoomPoint(room) {
    const col = this.rng.int(room.x, room.x + room.w - 1);
    const row = this.rng.int(room.y, room.y + room.h - 1);
    return this.map.centerOf(col, row);
  }

  paintRoomIceLanes(room) {
    const centerCol = Math.floor(room.x + room.w / 2);
    const centerRow = Math.floor(room.y + room.h / 2);
    for (let col = room.x + 1; col < room.x + room.w - 1; col++) {
      if (this.rng.chance(0.45)) this.map.set(col, centerRow, TileT.ICE);
    }
    for (let row = room.y + 1; row < room.y + room.h - 1; row++) {
      if (this.rng.chance(0.35)) this.map.set(centerCol, row, TileT.ICE);
    }
  }

  updateRoomEncounters() {
    for (const encounter of this.roomEncounters) {
      if (encounter.triggered || encounter.type !== "ambush") continue;
      if (!this.playerInRoom(encounter.room)) continue;
      encounter.triggered = true;
      for (const type of encounter.monsters) {
        const c = this.randomRoomPoint(encounter.room);
        this.monsters.push(this.scaleMonsterForLevel(makeMonster(type, c.x, c.y)));
      }
      this.showBanner("¡Emboscada! Sobrevive a la sala.");
      sfx.mazeShift();
    }
  }

  updateCompanions(dt) {
    for (const ally of this.companions) {
      if (!ally.rescued) {
        const encounter = this.roomEncounters.find((e) => e.id === ally.encounterId);
        if (!encounter) continue;
        const clear = !this.monsters.some((m) => m.alive && this.pointInRoom(m.x, m.y, encounter.room));
        if (clear && dist(ally.x, ally.y, this.player.x, this.player.y) < 54) {
          ally.rescued = true;
          this.showBanner(`${ally.name} se une a tu equipo.`);
          sfx.levelUp();
        }
        continue;
      }

      const target = this.nearestMonster(ally.x, ally.y, 260);
      if (target && this.time >= ally.nextAttackAt) {
        const dx = target.x - ally.x, dy = target.y - ally.y;
        const len = Math.hypot(dx, dy) || 1;
        this.projectiles.push({
          id: `ally-${ally.id}-${this.time}`,
          x: ally.x, y: ally.y,
          vx: (dx / len) * 390,
          vy: (dy / len) * 390,
          radius: 4,
          damage: ally.damage,
          ttl: 0.9,
          emoji: "✦",
        });
        ally.nextAttackAt = this.time + ally.cooldown;
      }

      const distToPlayer = dist(ally.x, ally.y, this.player.x, this.player.y);
      if (distToPlayer > 160) {
        ally.x = this.player.x;
        ally.y = this.player.y;
        ally.vx = 0;
        ally.vy = 0;
      } else {
        const slot = this.companions.filter((x) => x.rescued).indexOf(ally) + 1;
        const trailIndex = Math.max(0, this.playerTrail.length - 1 - slot * 8);
        const targetPos = this.playerTrail.length > 0 ? this.playerTrail[trailIndex] : this.player;

        const dx = targetPos.x - ally.x, dy = targetPos.y - ally.y;
        const d = Math.hypot(dx, dy);
        if (d > 8) {
          const len = d || 1;
          ally.vx = (dx / len) * Math.min(180, len * 6);
          ally.vy = (dy / len) * Math.min(180, len * 6);
          moveEntity(ally, this.map, dt);
        } else {
          ally.vx = 0;
          ally.vy = 0;
        }
      }
    }
  }

  playerInRoom(room) {
    const col = this.map.colAt(this.player.x);
    const row = this.map.rowAt(this.player.y);
    return col >= room.x && row >= room.y && col < room.x + room.w && row < room.y + room.h;
  }

  pointInRoom(x, y, room) {
    const col = this.map.colAt(x);
    const row = this.map.rowAt(y);
    return col >= room.x && row >= room.y && col < room.x + room.w && row < room.y + room.h;
  }

  nearestMonster(x, y, range) {
    let best = null;
    let bestD = range;
    for (const m of this.monsters) {
      if (!m.alive) continue;
      const d = dist(x, y, m.x, m.y);
      if (d < bestD) { best = m; bestD = d; }
    }
    return best;
  }

  scaleMonsterForLevel(m) {
    const lvlHp  = 1 + (this.level - 1) * LEVELS.hpScale;
    const lvlDmg = 1 + (this.level - 1) * LEVELS.damageScale;
    const lvlSpd = 1 + (this.level - 1) * LEVELS.speedScale;
    m.hp = Math.round(m.hp * lvlHp);
    m.maxHp = m.hp;
    m.damage = Math.round(m.damage * lvlDmg);
    m.speed = Math.round(m.speed * lvlSpd);
    if (m.projectileDamage) m.projectileDamage = Math.round(m.projectileDamage * lvlDmg);
    return m;
  }

  findWallFacingRoom(room) {
    const candidates = [
      { col: room.x - 1, row: this.rng.int(room.y, room.y + room.h - 1), dx: 1, dy: 0 },
      { col: room.x + room.w, row: this.rng.int(room.y, room.y + room.h - 1), dx: -1, dy: 0 },
      { col: this.rng.int(room.x, room.x + room.w - 1), row: room.y - 1, dx: 0, dy: 1 },
      { col: this.rng.int(room.x, room.x + room.w - 1), row: room.y + room.h, dx: 0, dy: -1 },
    ];
    const spot = candidates.find((c) => this.map.get(c.col, c.row) === TileT.WALL);
    return spot ? { ...this.map.centerOf(spot.col, spot.row), dx: spot.dx, dy: spot.dy } : null;
  }

  nextLevel() {
    this.level += 1;
    if (this.level > LEVELS.total) { this.state = STATE.VICTORY; setMusicLevel(0); sfx.victory(); return; }
    this.unlockLevel(this.level);
    this.selectedLevel = this.level;
    sfx.level();
    this.buildLevel(randomSeed());
  }

  togglePause() {
    if (this.state === STATE.PLAYING) this.state = STATE.PAUSED;
    else if (this.state === STATE.PAUSED) this.state = STATE.PLAYING;
  }

  toMenu() { this.state = STATE.MENU; this.reset(); setMusicLevel(0); }

  dispatch(action) {
    if (action && action.startsWith("level:")) {
      const level = Number(action.split(":")[1]);
      if (level <= this.highestUnlocked) this.selectedLevel = level;
      return;
    }
    switch (action) {
      case "play": this.startRun(); break;
      case "continue": this.continueRun(); break;
      case "retry": this.startRun(this.level); break;
      case "resume": if (this.state === STATE.PAUSED) this.state = STATE.PLAYING; break;
      case "menu": this.toMenu(); break;
      case "buyHp": this.buyHp(); break;
      case "buyAmmo": this.buyAmmo(); break;
    }
  }

  buyHp() {
    if (this.state !== STATE.PLAYING || !this.player) return;
    const cost = 10;
    const p = this.player;
    if (p.inventory.coins < cost) {
      this.showPickup("❌ Monedas insuficientes (+25 HP cuesta 10<span class=\"yellow-coin\">🪙</span>)");
      sfx.hit();
      return;
    }
    if (p.hp >= p.maxHp) {
      this.showPickup("❌ ¡Ya tienes la vida al máximo!");
      sfx.hit();
      return;
    }
    p.inventory.coins -= cost;
    p.hp = Math.min(p.maxHp, p.hp + 25);
    this.showPickup("💗 ¡Hechicería de salud! +25 HP");
    sfx.pickup();
  }

  buyAmmo() {
    if (this.state !== STATE.PLAYING || !this.player) return;
    const cost = 5;
    const p = this.player;
    if (p.inventory.coins < cost) {
      this.showPickup("❌ Monedas insuficientes (+10 Flechas cuesta 5<span class=\"yellow-coin\">🪙</span>)");
      sfx.hit();
      return;
    }
    p.inventory.coins -= cost;
    p.inventory.ammo += 10;
    this.showPickup("🏹 ¡Munición obtenida! +10 Flechas");
    sfx.pickup();
  }

  update(dt) {
    if (input.consumePressed("pause")) {
      if (this.state === STATE.PLAYING || this.state === STATE.PAUSED) this.togglePause();
    }

    if (this.state !== STATE.PLAYING) { input.clearFrame(); return; }

    if (input.consumePressed("buyHp")) this.buyHp();
    if (input.consumePressed("buyAmmo")) this.buyAmmo();

    this.time += dt;

    // Countdown and Hell Mode logic
    if (this.levelTimeLeft > 0) {
      this.levelTimeLeft -= dt;
      if (this.levelTimeLeft <= 0) {
        this.levelTimeLeft = 0;
        this.isHellMode = true;
        this.showBanner("🔥 ¡MODO INFIERNO ACTIVADO! Los monstruos reviven y te buscan...", 4.5);
        sfx.mazeShift();
        setMusicLevel(this.level, true);
        this.nextReviveAt = this.time + 3.0;
      }
    } else if (this.isHellMode) {
      if (this.time >= this.nextReviveAt) {
        const deadMonsters = this.monsters.filter((m) => !m.alive);
        if (deadMonsters.length > 0) {
          const rngIdx = Math.floor(this.rng() * deadMonsters.length);
          const m = deadMonsters[rngIdx];
          m.alive = true;
          m.hp = m.maxHp;
          m.x = m.spawnX;
          m.y = m.spawnY;
          sfx.mazeShift();
        }
        this.nextReviveAt = this.time + 3.0;
      }
    }

    pruneEffects(this.player, this.time);
    this.updateWeaponSelection();
    this.updateDynamicTerrain();
    this.updatePlayer(dt);
    if (this.player) {
      if (this.playerTrail.length === 0) {
        this.playerTrail.push({ x: this.player.x, y: this.player.y });
      } else {
        const lastPoint = this.playerTrail[this.playerTrail.length - 1];
        const distance = dist(this.player.x, this.player.y, lastPoint.x, lastPoint.y);
        if (distance > 6) {
          this.playerTrail.push({ x: this.player.x, y: this.player.y });
          if (this.playerTrail.length > 100) {
            this.playerTrail.shift();
          }
        }
      }
    }
    this.updateRoomEncounters();
    this.updateCompanions(dt);
    if (input.held("attack")) attack(this);
    this.updateTerrainFeatures();
    this.updateMonsters(dt);
    updateProjectiles(this, dt);
    this.updateMonsterProjectiles(dt);
    this.updateHazardProjectiles(dt);
    this.resolveContact();
    this.openChests();
    collectItems(this);
    this.checkExit();
    this.camera.follow(this.player, this.map);

    // Guardado automático periódico (cada 3 segundos)
    if (this.time >= this.nextSaveAt) {
      this.saveRun();
      this.nextSaveAt = this.time + 3;
    }

    input.clearFrame();
  }

  updatePlayer(dt) {
    const p = this.player;
    const ground = terrainAt(this.map, p.x, p.y);
    const a = input.axis();
    let dx = a.x, dy = a.y;
    const len = Math.hypot(dx, dy);
    if (len > 0) { dx /= len; dy /= len; }

    const spd = PLAYER.speed * ground.speedMul * speedMul(p, this.time);
    const targetVx = dx * spd;
    const targetVy = dy * spd;

    const brake = ground.slippery ? ICE_FRICTION : PLAYER.friction;
    const rate = (len > 0 ? PLAYER.accel * (ground.slippery ? 0.4 : 1) : brake) * dt;
    p.vx = approach(p.vx, targetVx, rate);
    p.vy = approach(p.vy, targetVy, rate);

    if (len > 0) { p.facing.x = dx; p.facing.y = dy; }

    const hasKey = p.inventory.keys >= 1;
    const res = moveEntity(p, this.map, dt, hasKey);
    if ((res.hitX || res.hitY) && !hasKey) {
      const nextX = p.x + p.vx * dt;
      const nextY = p.y + p.vy * dt;
      if (this.map.blockedBox(nextX, nextY, p.radius, false) === false &&
          this.map.blockedBox(nextX, nextY, p.radius, true) === true) {
        this.showBanner("🌀 Necesitas el sello del guardián 🐲");
      }
    }

    if (ground.damage > 0) {
      p.hp -= ground.damage * dt;
      if (p.hp <= 0) this.gameOver();
    }
  }

  updateMonsters(dt) {
    const p = this.player;
    for (const m of this.monsters) {
      if (!m.alive) continue;
      const onShoot = m.ranged ? (shooter) => {
        const dx = p.x - shooter.x, dy = p.y - shooter.y;
        const len = Math.hypot(dx, dy) || 1;
        this.monsterProjectiles.push({
          x: shooter.x, y: shooter.y,
          vx: (dx / len) * shooter.projectileSpeed,
          vy: (dy / len) * shooter.projectileSpeed,
          damage: shooter.projectileDamage,
          radius: shooter.isBoss ? 9 : 6,
          ttl: shooter.isBoss ? 3.2 : 2.5,
          boss: shooter.isBoss,
          type: shooter.projectileType,
        });
        shooter.isBoss ? sfx.bossShoot() : sfx.monsterShoot();
      } : null;
      updateMonster(m, p, this.map, this.rng, dt, onShoot, this.isHellMode);
      const ground = terrainAt(this.map, m.x, m.y);
      if (m.alive && ground.damage > 0) damageMonster(this, m, ground.damage * dt, false);
    }
  }

  updateTerrainFeatures() {
    for (const f of this.terrainFeatures) {
      if (this.time < f.nextAt) continue;
      if (f.type === "gargoyle") {
        this.hazardProjectiles.push({
          x: f.x + f.dx * 24, y: f.y + f.dy * 24,
          vx: f.dx * 210, vy: f.dy * 210,
          radius: 8, damage: 14, ttl: 1.9, type: "fire",
        });
        f.nextAt = this.time + 3.2;
        sfx.fire();
      } else {
        for (const dir of [[1,0], [-1,0], [0,1], [0,-1]]) {
          this.hazardProjectiles.push({
            x: f.x, y: f.y,
            vx: dir[0] * 155, vy: dir[1] * 155,
            radius: 7, damage: 5, ttl: 1.1, type: "water",
          });
        }
        f.nextAt = this.time + 4.4;
        sfx.water();
      }
    }
  }

  prepareDynamicTerrain() {
    this.dynamicMudTiles = [];
    this.shiftableWalls = [];
    this.shiftableFloors = [];
    for (let row = 1; row < this.map.rows - 1; row++) {
      for (let col = 1; col < this.map.cols - 1; col++) {
        const id = this.map.get(col, row);
        if (id === TileT.MUD) this.dynamicMudTiles.push({ col, row, active: true });
        if (id === TileT.WALL && this.floorNeighborCount(col, row) >= 2) {
          this.shiftableWalls.push({ col, row, open: false });
        } else if (id === TileT.FLOOR && this.floorNeighborCount(col, row) >= 2) {
          this.shiftableFloors.push({ col, row, open: true });
        }
      }
    }
  }

  updateDynamicTerrain() {
    if (this.time >= this.nextMudShiftAt) {
      this.shiftMud();
      this.nextMudShiftAt = this.time + 2.6 + this.rng() * 2.2;
    }
    if (this.time >= this.nextMazeShiftAt) {
      this.shiftMazePaths();
      this.nextMazeShiftAt = this.time + (this.level === 1 ? 18 : 9) + this.rng() * 5;
    }
  }

  shiftMud() {
    if (!this.dynamicMudTiles.length) return;
    const changes = Math.min(10, Math.max(3, Math.floor(this.dynamicMudTiles.length * 0.18)));
    for (let i = 0; i < changes; i++) {
      const tile = this.rng.pick(this.dynamicMudTiles);
      if (this.protectedCell(tile.col, tile.row, 28)) continue;
      tile.active = !tile.active;
      this.map.set(tile.col, tile.row, tile.active ? TileT.MUD : TileT.FLOOR);
    }
  }

  shiftMazePaths() {
    const closeCount = Math.min(3, Math.max(1, Math.floor(this.level / 7) + 1));
    const openCount = closeCount + 1;
    for (let i = 0; i < openCount; i++) {
      const tile = this.rng.pick(this.shiftableWalls);
      if (!tile || tile.open || this.protectedCell(tile.col, tile.row, 70)) continue;
      tile.open = true;
      this.map.set(tile.col, tile.row, TileT.FLOOR);
    }
    for (let i = 0; i < closeCount; i++) {
      const tile = this.rng.pick(this.shiftableFloors);
      if (!tile || !tile.open || this.protectedCell(tile.col, tile.row, 90)) continue;

      const originalTile = this.map.get(tile.col, tile.row);
      this.map.set(tile.col, tile.row, TileT.WALL);

      const playerCol = this.map.colAt(this.player.x);
      const playerRow = this.map.rowAt(this.player.y);

      if (!this.areAllRoomsReachable(playerCol, playerRow)) {
        this.map.set(tile.col, tile.row, originalTile);
        continue;
      }

      tile.open = false;
    }
    sfx.mazeShift();
  }

  areAllRoomsReachable(startCol, startRow) {
    if (!this.rooms || this.rooms.length === 0) return true;

    const queue = [[startCol, startRow]];
    const visited = new Uint8Array(this.map.cols * this.map.rows);
    visited[startRow * this.map.cols + startCol] = 1;

    let head = 0;
    while (head < queue.length) {
      const [c, r] = queue[head++];
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = c + dc;
        const nr = r + dr;
        if (this.map.inBounds(nc, nr)) {
          const idx = nr * this.map.cols + nc;
          if (!visited[idx]) {
            const tile = this.map.get(nc, nr);
            if (tile !== TileT.WALL) {
              visited[idx] = 1;
              queue.push([nc, nr]);
            }
          }
        }
      }
    }

    for (const room of this.rooms) {
      let roomReached = false;
      for (let r = room.y; r < room.y + room.h; r++) {
        for (let c = room.x; c < room.x + room.w; c++) {
          if (visited[r * this.map.cols + c] === 1) {
            roomReached = true;
            break;
          }
        }
        if (roomReached) break;
      }
      if (!roomReached) return false;
    }

    return true;
  }

  hasPath(startCol, startRow, endCol, endRow) {
    if (startCol === endCol && startRow === endRow) return true;
    const queue = [[startCol, startRow]];
    const visited = new Uint8Array(this.map.cols * this.map.rows);
    visited[startRow * this.map.cols + startCol] = 1;

    let head = 0;
    while (head < queue.length) {
      const [c, r] = queue[head++];
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = c + dc;
        const nr = r + dr;
        if (this.map.inBounds(nc, nr)) {
          const idx = nr * this.map.cols + nc;
          if (!visited[idx]) {
            const tile = this.map.get(nc, nr);
            if (tile !== TileT.WALL) {
              if (nc === endCol && nr === endRow) return true;
              visited[idx] = 1;
              queue.push([nc, nr]);
            }
          }
        }
      }
    }
    return false;
  }

  floorNeighborCount(col, row) {
    let count = 0;
    for (const [dc, dr] of [[1,0], [-1,0], [0,1], [0,-1]]) {
      const id = this.map.get(col + dc, row + dr);
      if (id !== TileT.WALL) count++;
    }
    return count;
  }

  protectedCell(col, row, minDistance) {
    const center = this.map.centerOf(col, row);
    if (this.map.get(col, row) === TileT.EXIT) return true;
    if (dist(center.x, center.y, this.player.x, this.player.y) < minDistance) return true;
    if (dist(center.x, center.y, this.exitPoint.x, this.exitPoint.y) < 70) return true;
    for (const chest of this.chests) {
      if (!chest.opened && dist(center.x, center.y, chest.x, chest.y) < 50) return true;
    }
    for (const m of this.monsters) {
      if (!m.alive) continue;
      const safeDistance = m.isBoss ? 70 : 45;
      if (dist(center.x, center.y, m.x, m.y) < safeDistance) return true;
    }
    return false;
  }

  updateMonsterProjectiles(dt) {
    const p = this.player;
    const live = [];
    for (const pr of this.monsterProjectiles) {
      pr.ttl -= dt;
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      if (pr.ttl <= 0 || this.map.isWallWorld(pr.x, pr.y)) {
        this.resolveMonsterProjectileEnd(pr);
        continue;
      }
      if (this.time >= p.invulnUntil && dist(pr.x, pr.y, p.x, p.y) <= p.radius + pr.radius) {
        if (!hasEffect(p, "shield", this.time)) {
          p.hp -= this.incomingDamage(pr.damage);
          if (pr.type === "ice") { p.vx *= 0.2; p.vy *= 0.2; }
          sfx.hit();
          if (p.hp <= 0) { this.gameOver(); continue; }
        }
        p.invulnUntil = this.time + 0.35;
        continue;
      }
      live.push(pr);
    }
    this.monsterProjectiles = live;
  }

  resolveMonsterProjectileEnd(pr) {
    if (pr.type === "bomb") {
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI * 2 * i) / 8;
        this.hazardProjectiles.push({
          x: pr.x, y: pr.y,
          vx: Math.cos(a) * 145,
          vy: Math.sin(a) * 145,
          radius: 6,
          damage: 8,
          ttl: 0.55,
          type: "blast",
        });
      }
      sfx.fire();
    } else if (pr.type === "ice") {
      const col = this.map.colAt(pr.x);
      const row = this.map.rowAt(pr.y);
      if (this.map.get(col, row) === TileT.FLOOR) this.map.set(col, row, TileT.ICE);
    }
  }

  updateHazardProjectiles(dt) {
    const p = this.player;
    const live = [];
    for (const pr of this.hazardProjectiles) {
      pr.ttl -= dt;
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      if (pr.ttl <= 0 || this.map.isWallWorld(pr.x, pr.y)) continue;

      let consumed = false;
      for (const m of this.monsters) {
        if (!m.alive) continue;
        if (dist(pr.x, pr.y, m.x, m.y) <= m.radius + pr.radius) {
          damageMonster(this, m, pr.damage);
          consumed = true;
          break;
        }
      }
      if (consumed) continue;

      if (this.time >= p.invulnUntil && dist(pr.x, pr.y, p.x, p.y) <= p.radius + pr.radius) {
        if (!hasEffect(p, "shield", this.time)) {
          p.hp -= this.incomingDamage(pr.damage);
          if (p.hp <= 0) { this.gameOver(); continue; }
        }
        p.invulnUntil = this.time + 0.25;
        continue;
      }
      live.push(pr);
    }
    this.hazardProjectiles = live;
  }

  resolveContact() {
    const p = this.player;
    if (this.time < p.invulnUntil) return;
    for (const m of this.monsters) {
      if (!m.alive) continue;
      if (circlesOverlap(p, m)) {
        const dx = p.x - m.x, dy = p.y - m.y;
        const len = Math.hypot(dx, dy) || 1;
        p.vx = (dx / len) * 260;
        p.vy = (dy / len) * 260;
        p.invulnUntil = this.time + PLAYER.invulnMs / 1000;
        if (!hasEffect(p, "shield", this.time)) {
          p.hp -= this.incomingDamage(m.damage);
          if (p.hp <= 0) this.gameOver();
        }
        break;
      }
    }
  }

  checkExit() {
    const p = this.player;
    if (this.map.tileAtWorld(p.x, p.y) !== TileT.EXIT) return;
    if (this.keyRequired && p.inventory.keys < 1) {
      this.showBanner("🌀 Necesitas el sello del guardián 🐲");
      return;
    }
    this.nextLevel();
  }

  blockedMessageActive() { return this.time < this.blockedMsgUntil; }

  showBanner(text, seconds = 2.2) {
    this.bannerText = text;
    this.blockedMsgUntil = this.time + seconds;
  }

  showPickup(text, seconds = 2.4) {
    this.pickupText = text;
    this.pickupMsgUntil = this.time + seconds;
  }

  pickupMessageActive() { return this.time < this.pickupMsgUntil; }

  pickupMessage() { return this.pickupText; }

  bannerMessage() {
    return this.bannerText || "🌀 Necesitas el sello del guardián 🐲";
  }

  tutorialMessage() {
    if (this.level !== 1 || this.time - this.runStartedAt > 100) return "";
    const elapsed = this.time - this.runStartedAt;
    if (elapsed < 8) return "Tutorial: Muévete con WASD o flechas. La cámara te seguirá.";
    if (elapsed < 16) return "Ataque: Mantén ESPACIO para atacar. Apunta moviéndote.";
    if (elapsed < 24) return "Armas: Pulsa [1] para la Espada (cuerpo a cuerpo) y [2] para el Arco (flechas).";
    if (elapsed < 32) return "Tienda: Pulsa [V] para curarte (cuesta 10🪙) o [F] para conseguir flechas (cuesta 5🪙).";
    if (this.player.inventory.keys < 1 && this.stats.kills < 2) return "Explora las salas del primer piso para practicar con enemigos lentos.";
    if (this.items.length || this.chests.some((c) => !c.opened)) return "Acércate a cofres y objetos (monedas, curas, flechas) para recogerlos automáticamente.";
    if (this.player.inventory.keys < 1) return "Busca y derrota al Guardián de este piso para obtener el sello azul 🌀.";
    return "Usa el sello 🌀 y pisa las escaleras 🪜 para descender al siguiente nivel.";
  }

  openChests() {
    const p = this.player;
    for (const chest of this.chests) {
      if (chest.opened || dist(p.x, p.y, chest.x, chest.y) > p.radius + chest.radius + 8) continue;
      chest.opened = true;
      for (const it of rollChestDrops(chest, this.rng)) this.items.push(it);
      sfx.chest();
    }
  }

  updateWeaponSelection() {
    for (let i = 0; i < WEAPON_SLOTS.length; i++) {
      if (!input.consumePressed(`weapon${i + 1}`)) continue;
      const key = WEAPON_SLOTS[i];
      if (this.player.inventory.weapons[key]) {
        this.player.weapon = makeWeapon(key);
        sfx.pickup();
      }
    }
  }

  awardXp(monster) {
    const p = this.player;
    if (!p) return;
    p.xp += monster.isBoss ? 35 + this.level * 4 : 12 + Math.floor(monster.maxHp / 14);
    while (p.xp >= p.xpNext) {
      p.xp -= p.xpNext;
      p.level += 1;
      p.xpNext += PLAYER_PROGRESS.xpGrowth;
      p.maxHp += PLAYER_PROGRESS.hpPerLevel;
      p.hp = Math.min(p.maxHp, p.hp + PLAYER_PROGRESS.hpPerLevel + 8);
      p.attackBonus += PLAYER_PROGRESS.attackPerLevel;
      p.resistBonus += PLAYER_PROGRESS.resistPerLevel;
      sfx.levelUp();
    }
  }

  playerAttackMul() {
    return 1 + (this.player?.attackBonus || 0);
  }

  incomingDamage(amount) {
    const resist = Math.min(0.55, this.player?.resistBonus || 0);
    return amount * (1 - resist);
  }

  loadHighestUnlocked() {
    const saved = Number(localStorage.getItem("laberinto.highestUnlocked") || 1);
    return clamp(saved, 1, LEVELS.total);
  }

  unlockLevel(level) {
    this.highestUnlocked = Math.max(this.highestUnlocked, clamp(level, 1, LEVELS.total));
    localStorage.setItem("laberinto.highestUnlocked", String(this.highestUnlocked));
  }

  saveRun() {
    if (this.state !== STATE.PLAYING || !this.player || this.player.hp <= 0) return;
    const runState = {
      level: this.level,
      runStartedAt: this.runStartedAt,
      timeOffset: this.time - this.runStartedAt,
      stats: this.stats,
      player: {
        hp: this.player.hp,
        maxHp: this.player.maxHp,
        xp: this.player.xp,
        xpNext: this.player.xpNext,
        level: this.player.level,
        attackBonus: this.player.attackBonus,
        resistBonus: this.player.resistBonus,
        weaponType: this.player.weapon.type,
        inventory: this.player.inventory,
      }
    };
    localStorage.setItem("laberinto.savedRun", JSON.stringify(runState));
  }

  continueRun() {
    const saved = localStorage.getItem("laberinto.savedRun");
    if (!saved) return;
    try {
      const runState = JSON.parse(saved);
      this.level = runState.level;
      this.selectedLevel = this.level;
      this.stats = runState.stats || { kills: 0, bossKilled: false };
      this.runStartedAt = this.time - (runState.timeOffset || 0);

      // Reconstruct player
      this.player = this.makePlayer(0, 0);
      const p = this.player;
      const sp = runState.player;
      p.hp = sp.hp;
      p.maxHp = sp.maxHp;
      p.xp = sp.xp;
      p.xpNext = sp.xpNext;
      p.level = sp.level;
      p.attackBonus = sp.attackBonus;
      p.resistBonus = sp.resistBonus;
      p.weapon = makeWeapon(sp.weaponType || "sword");
      p.inventory = sp.inventory;

      // Build the level layout
      this.buildLevel(randomSeed());

      this.state = STATE.PLAYING;
    } catch (err) {
      console.error("Error al cargar la partida guardada:", err);
      this.clearSavedRun();
    }
  }

  clearSavedRun() {
    localStorage.removeItem("laberinto.savedRun");
  }

  gameOver() {
    this.player.hp = 0;
    this.state = STATE.GAME_OVER;
    this.clearSavedRun();
    setMusicLevel(0);
    sfx.gameover();
  }

  render() {
    if (this.state === STATE.PLAYING || this.state === STATE.PAUSED) {
      renderWorld(this.ctx, this);
    } else {
      this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    }
  }
}

function approach(value, target, maxDelta) {
  if (value < target) return Math.min(value + maxDelta, target);
  if (value > target) return Math.max(value - maxDelta, target);
  return value;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

const COMPANION_TYPES = [
  { key: "blade", name: "Liora, espadachina del gremio", emoji: "🗡️", color: "#f0c06a", damage: 9, cooldown: 0.85 },
  { key: "rune", name: "Noa, maga de runas", emoji: "🔮", color: "#9b7cff", damage: 11, cooldown: 1.1 },
  { key: "healer", name: "Mika, acólita perdida", emoji: "🌿", color: "#72e0a2", damage: 7, cooldown: 0.75 },
];
