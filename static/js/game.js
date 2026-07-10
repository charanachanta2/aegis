import * as THREE from "https://unpkg.com/three@0.179.1/build/three.module.js";
import { Player } from "./player.js";
import { World } from "./world.js";
import { PhysicsEngine } from "./physics.js";
import { Weapon, WEAPON_DB, ARMOR_PRICE, ARMOR_REDUCTION } from "./weapon.js";
import { BotManager } from "./bots.js";
import { Bomb } from "./bomb.js";
import { Net } from "./net.js";
import * as UI from "./ui.js";
import { settings } from "./ui.js";
import { createPostFX } from "./postfx.js";
import { createRobotMesh } from "./characters.js";

const KILL_REWARD = 300;

class LocalNet {
  constructor() { this.handlers = {}; this.fuseTimer = null; }
  on(ev, fn) { (this.handlers[ev] = this.handlers[ev] || []).push(fn); }
  emit(ev, data) { (this.handlers[ev] || []).forEach((fn) => fn(data)); }
  plantProgress() {}
  planted(site) {
    this.emit("bomb_planted", { site, fuse: 40 });
    this.fuseTimer = setTimeout(() => this.emit("bomb_exploded", {}), 40000);
  }
  defuseProgress() {}
  defused() { clearTimeout(this.fuseTimer); this.emit("bomb_defused", {}); }
  roundResetSoon() { setTimeout(() => this.emit("round_start", {}), 4000); }
}

// ---------- scene / renderer ----------
const scene = new THREE.Scene();
// daylight haze, but pulled back from the previous near-white version
scene.fog = new THREE.FogExp2(0x9fb6cf, 0.0032);
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;
document.getElementById("game").appendChild(renderer.domElement);

function buildSky() {
  const geo = new THREE.SphereGeometry(400, 32, 20);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      top: { value: new THREE.Color(0x2668b8) },
      horizon: { value: new THREE.Color(0x9fc3e8) },
      bottom: { value: new THREE.Color(0x7f96a8) },
      sunDir: { value: new THREE.Vector3(-0.35, 0.82, -0.25).normalize() },
    },
    vertexShader: `varying vec3 vP; void main(){ vP=normalize((modelMatrix*vec4(position,1.0)).xyz); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `
      uniform vec3 top; uniform vec3 horizon; uniform vec3 bottom; uniform vec3 sunDir;
      varying vec3 vP;
      void main(){
        float h = vP.y;
        vec3 col = h > 0.0 ? mix(horizon, top, pow(h, 0.85)) : mix(horizon, bottom, pow(-h, 0.8));
        float sun = pow(max(dot(normalize(vP), sunDir), 0.0), 420.0);
        col += vec3(1.0, 0.95, 0.85) * sun * 1.6;
        gl_FragColor = vec4(col, 1.0);
      }`,
    side: THREE.BackSide,
  });
  scene.add(new THREE.Mesh(geo, mat));
}
buildSky();
// daylight, but toned down from the blown-out first pass
scene.add(new THREE.HemisphereLight(0xaecbe8, 0x6f6350, 0.5));
const sun = new THREE.DirectionalLight(0xfff0da, 1.5);
sun.position.set(-40, 95, -28);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -170; sun.shadow.camera.right = 170;
sun.shadow.camera.top = 170; sun.shadow.camera.bottom = -170;
sun.shadow.bias = -0.0008;
sun.shadow.normalBias = 0.03;
scene.add(sun);
const fill = new THREE.DirectionalLight(0x8fabc9, 0.3);
fill.position.set(55, 40, 55);
scene.add(fill);
scene.add(new THREE.AmbientLight(0xbfc9d4, 0.28));

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(scene, 0.035).texture;
pmrem.dispose();

const postfx = createPostFX(renderer, scene, camera);

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  postfx.setSize(innerWidth, innerHeight);
});

const world = new World(scene);
const physics = new PhysicsEngine(world);

// ---------- runtime state ----------
let gameState = "menu";
let cfg = null;
let player, weapon, bomb, net, botManager = null;
let onlineMode = false;
let buyMenuOpen = false;
let mouseHeld = false;
let pointerLocked = false;
let timeoutHandled = false;
let roundSeconds = 180;
const remotePlayers = new Map();

function setTag(mesh, text) {
  const { ctx, cnv, sprite } = mesh.userData.tag;
  ctx.clearRect(0, 0, 256, 64);
  ctx.font = "bold 32px Rajdhani, sans-serif"; ctx.fillStyle = "#e8a33d"; ctx.textAlign = "center";
  ctx.fillText(text.slice(0, 14), 128, 40);
  sprite.material.map.needsUpdate = true;
}

// ---------- start game ----------
UI.initMenu((config) => {
  cfg = config;
  onlineMode = cfg.mode === "online";
  camera.fov = settings.fov; camera.updateProjectionMatrix();

  world.build(cfg.map || "corrode");
  player = new Player(camera, world, physics, cfg.team, settings);
  weapon = new Weapon(scene, camera);
  roundSeconds = (cfg.mode === "custom" ? cfg.roundTime : 3) * 60;
  timeoutHandled = false;

  net = onlineMode ? new Net() : new LocalNet();
  bomb = new Bomb(scene, world, net, onBombEvent);

  if (onlineMode) {
    net.connect(cfg.room, cfg.name, cfg.team);
    wireOnlineHandlers();
  } else {
    const count = cfg.mode === "custom" ? cfg.botCount : 6;
    const diff = cfg.mode === "custom" ? cfg.botDiff : 0.5;
    if (count > 0) botManager = new BotManager(scene, world, count, diff);
  }

  UI.enterHud(onlineMode ? "ROOM: " + cfg.room : (cfg.mode === "custom" ? "CUSTOM MATCH" : "PRACTICE — BOTS"));
  UI.updateHealth(player.hp); UI.updateAmmo(weapon.ammo); UI.updateKills(player.kills); UI.updateMoney(player.money);
  gameState = "playing";
  document.body.requestPointerLock();
});

function wireOnlineHandlers() {
  net.on("error", (d) => {
    UI.centerMsg("CONNECTION FAILED — " + (d.message || "check your network"), 3000);
    UI.setBombStatus("");
  });
  net.on("joined", (data) => {
    for (const [sid, p] of Object.entries(data.players)) {
      if (sid === data.you) continue;
      spawnRemote(sid, p);
    }
  });
  net.on("player_joined", (d) => spawnRemote(d.sid, d.player));
  net.on("player_left", (d) => {
    const rp = remotePlayers.get(d.sid);
    if (rp) { scene.remove(rp.mesh); remotePlayers.delete(d.sid); }
  });
  net.on("state", (d) => {
    let rp = remotePlayers.get(d.sid);
    if (!rp) rp = spawnRemote(d.sid, d.p);
    rp.targetPos.set(d.p.x, 0, d.p.z);
    rp.targetYaw = d.p.yaw;
    rp.mesh.visible = d.p.alive;
  });
  net.on("shot", (d) => onRemoteShot(d));
  net.on("player_down", (d) => {
    const rp = remotePlayers.get(d.victim);
    if (rp) rp.mesh.visible = false;
    if (d.shooter === net.mySid) {
      player.kills++; player.money += KILL_REWARD;
      UI.updateKills(player.kills); UI.updateMoney(player.money);
    }
  });
  net.on("round_start", () => { player.respawn(); UI.updateHealth(player.hp); });
}

function spawnRemote(sid, p) {
  const color = p.team === "Attack" ? 0xe8453c : 0x4fb0ff;
  const mesh = createRobotMesh(color);
  mesh.position.set(p.x, 0, p.z);
  scene.add(mesh);
  setTag(mesh, p.name || "Player");
  const rp = { mesh, targetPos: new THREE.Vector3(p.x, 0, p.z), targetYaw: p.yaw || 0, team: p.team };
  remotePlayers.set(sid, rp);
  return rp;
}

function onRemoteShot(d) {
  const origin = new THREE.Vector3(d.ox, d.oy, d.oz);
  const dir = new THREE.Vector3(d.dx, d.dy, d.dz);
  weapon.spawnTracer(origin, dir, 40);
  if (!player.alive) return;
  const toMe = new THREE.Vector3().subVectors(player.position, origin);
  const proj = toMe.dot(dir);
  if (proj > 0 && proj < 80) {
    const closest = origin.clone().addScaledVector(dir, proj);
    if (closest.distanceTo(player.position) < 0.9) {
      applyDamage(d.dmg || 25);
      if (!player.alive) net.reportHit(d.sid);
    }
  }
}

function applyDamage(dmg) {
  if (!player.alive) return;
  const taken = player.armor ? dmg * (1 - ARMOR_REDUCTION) : dmg;
  player.hp -= taken;
  UI.flashDamage(Math.min(1, taken / 40));
  if (player.hp <= 0) {
    player.hp = 0; player.alive = false;
    UI.centerMsg("YOU WERE DOWNED", 1600);
    setTimeout(() => { player.respawn(); UI.updateHealth(player.hp); UI.updateMoney(player.money); }, 1800);
  }
  UI.updateHealth(player.hp);
}

function onBombEvent(type, data) {
  if (type === "planted") {
    UI.setBombStatus("SPIKE ARMED — " + (data || "?"));
    UI.killfeed("Spike has been planted at " + data);
  } else if (type === "fuse") {
    UI.setBombStatus("SPIKE ARMED — " + Math.ceil(data) + "s");
  } else if (type === "defused") {
    UI.setBombStatus("SPIKE DEFUSED"); UI.centerMsg("DEFENDERS WIN", 2200);
    if (net instanceof LocalNet) net.roundResetSoon();
  } else if (type === "exploded") {
    UI.setBombStatus("SPIKE DETONATED"); UI.centerMsg("ATTACKERS WIN", 2200);
    if (net instanceof LocalNet) net.roundResetSoon();
  } else if (type === "reset") {
    UI.setBombStatus("");
  } else if (type === "plant_progress") {
    UI.setActionPrompt(true, "Planting Spike...", data);
  } else if (type === "defuse_progress") {
    UI.setActionPrompt(true, "Defusing Spike...", data);
  }
}

// ---------- buy menu ----------
UI.initBuyClose(() => closeBuy());

function toggleBuyMenu() {
  if (buyMenuOpen) { closeBuy(); return; }
  if (!player.alive || !world.inOwnSpawn(player.position, player.team)) return;
  buyMenuOpen = true;
  document.exitPointerLock();
  renderBuy();
  UI.toggleBuyMenu(true);
}
function closeBuy() {
  buyMenuOpen = false;
  UI.toggleBuyMenu(false);
  if (gameState === "playing") document.body.requestPointerLock();
}
function renderBuy() {
  UI.renderBuyMenu(WEAPON_DB, ARMOR_PRICE, { money: player.money, weaponKey: weapon.key, armor: player.armor }, doBuy);
}
function doBuy(kind, weaponKey) {
  if (kind === "weapon") {
    const price = WEAPON_DB[weaponKey].price;
    if (weapon.key === weaponKey) return;
    if (player.money < price) return;
    player.money -= price;
    weapon.equip(weaponKey);
    UI.updateAmmo(weapon.ammo);
  } else if (kind === "armor") {
    if (player.armor || player.money < ARMOR_PRICE) return;
    player.money -= ARMOR_PRICE;
    player.armor = true;
  }
  UI.updateMoney(player.money);
  renderBuy();
}

// ---------- input ----------
document.addEventListener("pointerlockchange", () => {
  pointerLocked = document.pointerLockElement === document.body;
  if (!pointerLocked) mouseHeld = false;
});
addEventListener("blur", () => { mouseHeld = false; });
document.getElementById("game").addEventListener("click", () => {
  if (gameState === "playing" && !pointerLocked && !buyMenuOpen) document.body.requestPointerLock();
});
document.addEventListener("mousemove", (e) => {
  if (!pointerLocked || gameState !== "playing" || !player) return;
  player.mouseMove(e.movementX, e.movementY);
});
document.addEventListener("mousedown", (e) => {
  if (e.button === 0 && gameState === "playing" && pointerLocked && !buyMenuOpen) {
    mouseHeld = true;
    doFire();
  }
});
document.addEventListener("mouseup", (e) => {
  if (e.button === 0) mouseHeld = false;
});
const BUY_KEYS = ["pistol", "smg", "shotgun", "rifle", "sniper"];
addEventListener("keydown", (e) => {
  if (e.code === "Escape") togglePause();
  if (gameState !== "playing") return;
  if (e.code === "KeyR" && !buyMenuOpen) weapon.reload();
  if (e.code === "KeyB") toggleBuyMenu();
  if (buyMenuOpen && e.code.startsWith("Digit")) {
    const n = +e.code.slice(-1);
    if (n >= 1 && n <= 5) doBuy(n === 5 ? "armor" : "weapon", BUY_KEYS[n - 1]);
  }
});

function doFire() {
  if (!player.alive) return;
  const shot = weapon.fire();
  if (!shot) return;
  let dist = 60;
  let hitAny = false;
  const muzzlePos = weapon.getMuzzleWorldPosition();

  for (const dir of shot.shots) {
    weapon.raycaster.set(shot.origin, dir);
    if (botManager) {
      const res = botManager.tryHit(weapon.raycaster);
      if (res) {
        hitAny = true;
        const dmg = res.headshot ? shot.dmg * shot.headMult : shot.dmg;
        UI.hitMarker(res.headshot);
        botManager.damage(res.bot, dmg, (b) => {
          player.kills++; player.money += KILL_REWARD;
          UI.updateKills(player.kills); UI.updateMoney(player.money);
          UI.killfeed(`You ${res.headshot ? "headshot" : "eliminated"} ${b.name} (+$${KILL_REWARD})`);
        });
      }
    }
    weapon.spawnTracer(muzzlePos, dir, hitAny ? 40 : dist);
  }

  if (onlineMode) net.sendShot({
    ox: shot.origin.x, oy: shot.origin.y, oz: shot.origin.z,
    dx: shot.dir.x, dy: shot.dir.y, dz: shot.dir.z, dmg: shot.dmg,
  });
  UI.updateAmmo(weapon.ammo);
}

// ---------- pause ----------
UI.initPauseHandlers(
  () => { gameState = "playing"; UI.hidePause(); document.body.requestPointerLock(); },
  () => location.reload()
);
function togglePause() {
  if (buyMenuOpen) return;
  if (gameState === "playing") {
    gameState = "paused";
    document.exitPointerLock();
    UI.showPause(`${player.kills} kills · ${Math.round(player.hp)} HP · $${player.money}`);
  } else if (gameState === "paused") {
    gameState = "playing";
    UI.hidePause();
    document.body.requestPointerLock();
  }
}

function fmtTime(s) {
  s = Math.max(0, Math.ceil(s));
  return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
}

// ---------- main loop ----------
let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (gameState === "playing" && player) {
    player.update(dt);
    weapon.update(dt);

    // recoil: additive kick on top of player's own aim, recovers in weapon.update()
    camera.rotation.x += weapon.kick.pitch;
    camera.rotation.y += weapon.kick.yaw;
    UI.setCrosshairSpread(weapon.heat);

    if ((weapon.stats.auto || settings.autoFireAll) && mouseHeld && pointerLocked && !buyMenuOpen && player.alive) {
      doFire();
    }

    if (botManager) botManager.update(dt, player, applyDamage);

    const isAttacker = player.team === "Attack";
    if (cfg.mode !== "custom" || cfg.customMode === "spike") {
      bomb.update(dt, player, isAttacker);
    }

    UI.setBuyHint(!buyMenuOpen && player.alive && world.inOwnSpawn(player.position, player.team));

    for (const [, rp] of remotePlayers) {
      rp.mesh.position.lerp(rp.targetPos, Math.min(1, dt * 6));
      rp.mesh.rotation.y += (rp.targetYaw - rp.mesh.rotation.y) * Math.min(1, dt * 6);
    }

    if (onlineMode) {
      player._netTimer = (player._netTimer || 0) + dt;
      if (player._netTimer > 0.15) {
        player._netTimer = 0;
        net.sendState({ x: player.position.x, y: player.position.y, z: player.position.z, yaw: player.yaw, hp: player.hp, alive: player.alive });
      }
    }

    roundSeconds -= dt;
    UI.setTimer(fmtTime(roundSeconds));
    if (roundSeconds <= 0 && !timeoutHandled && bomb.state === "idle") {
      timeoutHandled = true;
      UI.centerMsg("TIME EXPIRED — DEFENDERS WIN", 2200);
      setTimeout(() => { roundSeconds = (cfg.mode === "custom" ? cfg.roundTime : 3) * 60; timeoutHandled = false; }, 4000);
    }
  }

  postfx.render(dt);
}
requestAnimationFrame(loop);
