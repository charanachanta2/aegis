import * as THREE from "https://unpkg.com/three@0.179.1/build/three.module.js";

// auto: hold-to-fire vs click-per-shot
// recoil: pitch/yaw kick applied per shot, recovered at `recover` per second
// spread/spreadMax/heatPerShot/heatDecay: accuracy cone that opens up under sustained fire
export const WEAPON_DB = {
  pistol:  { name: "Pistol",  price: 0,    dmg: 22, headMult: 2.2, mag: 12, cooldown: 0.18, color: 0x2a2a2e, barrelLen: 0.28,
             auto: false, recoilKick: 0.014, recoilYaw: 0.006, recover: 15, spread: 0.0015, spreadMax: 0.010, heatPerShot: 0.20, heatDecay: 2.4 },
  smg:     { name: "SMG",     price: 900,  dmg: 16, headMult: 2,   mag: 30, cooldown: 0.09, color: 0x35404a, barrelLen: 0.34,
             auto: true,  recoilKick: 0.009, recoilYaw: 0.011, recover: 17, spread: 0.004,  spreadMax: 0.028, heatPerShot: 0.10, heatDecay: 2.0 },
  rifle:   { name: "Rifle",   price: 2700, dmg: 34, headMult: 2.2, mag: 30, cooldown: 0.12, color: 0x2f3a2a, barrelLen: 0.5,
             auto: true,  recoilKick: 0.013, recoilYaw: 0.008, recover: 13, spread: 0.003,  spreadMax: 0.024, heatPerShot: 0.12, heatDecay: 1.7 },
  shotgun: { name: "Shotgun", price: 1200, dmg: 18, headMult: 1.8, mag: 8,  cooldown: 0.7,  color: 0x4a2f22, barrelLen: 0.32, pellets: 6,
             auto: false, recoilKick: 0.032, recoilYaw: 0.016, recover: 9,  spread: 0.05,   spreadMax: 0,    heatPerShot: 0,    heatDecay: 3 },
  sniper:  { name: "Sniper",  price: 3400, dmg: 95, headMult: 2,   mag: 5,  cooldown: 1.1,  color: 0x1e1e24, barrelLen: 0.7,
             auto: false, recoilKick: 0.05,  recoilYaw: 0.02,  recover: 7,  spread: 0.0004, spreadMax: 0.002, heatPerShot: 0.35, heatDecay: 2.6 },
};
export const ARMOR_PRICE = 650;
export const ARMOR_REDUCTION = 0.25;

export class Weapon {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.key = "pistol";
    this.ammo = WEAPON_DB.pistol.mag;
    this.reloading = false;
    this.fireCooldown = 0;
    this.raycaster = new THREE.Raycaster();
    this.tracers = [];

    this.kick = { pitch: 0, yaw: 0 };
    this.heat = 0;

    this.grp = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x24242a, metalness: 0.8, roughness: 0.28 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x141416, metalness: 0.5, roughness: 0.55 });
    this.body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.5), bodyMat);
    this.barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 8), bodyMat);
    this.barrel.rotation.x = Math.PI / 2;
    this.mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.09), bodyMat);
    this.grip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.14, 0.08), new THREE.MeshStandardMaterial({ color: 0x151518, roughness: 0.7 }));
    this.stock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.22), darkMat);
    this.foregrip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.1), darkMat);
    this.sight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.1), darkMat);
    this.grp.add(this.body, this.barrel, this.mag, this.grip, this.stock, this.foregrip, this.sight);
    this.muzzle = new THREE.PointLight(0xffcf8a, 0, 6);
    this.grp.add(this.muzzle);
    camera.add(this.grp);

    // muzzle flash sprite
    const fc = document.createElement("canvas"); fc.width = fc.height = 64;
    const fctx = fc.getContext("2d");
    const grd = fctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grd.addColorStop(0, "rgba(255,230,180,1)"); grd.addColorStop(0.5, "rgba(255,180,80,0.8)"); grd.addColorStop(1, "rgba(255,120,40,0)");
    fctx.fillStyle = grd; fctx.fillRect(0, 0, 64, 64);
    this.flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(fc), transparent: true, opacity: 0, depthTest: false }));
    this.flash.scale.set(0.35, 0.35, 1);
    this.grp.add(this.flash);

    this._layout();
  }

  _layout() {
    const w = WEAPON_DB[this.key];
    this.body.position.set(0.28, -0.22, -0.5);
    this.body.material.color.setHex(w.color);
    this.barrel.scale.z = w.barrelLen / 0.35;
    this.barrel.position.set(0.28, -0.18, -0.5 - w.barrelLen * 0.8);
    this.mag.position.set(0.28, -0.34, -0.42);
    this.grip.position.set(0.28, -0.34, -0.58);
    this.stock.position.set(0.28, -0.24, -0.66);
    this.foregrip.position.set(0.28, -0.3, -0.36 - w.barrelLen * 0.4);
    this.sight.position.set(0.28, -0.14, -0.48);
    this.muzzle.position.copy(this.barrel.position);
    this.flash.position.copy(this.barrel.position);
    this.flash.position.z -= 0.12;
  }

  equip(key) {
    if (!WEAPON_DB[key]) return;
    this.key = key;
    this.ammo = WEAPON_DB[key].mag;
    this.reloading = false;
    this.heat = 0;
    this._layout();
  }

  get stats() { return WEAPON_DB[this.key]; }
  canFire() { return !this.reloading && this.ammo > 0 && this.fireCooldown <= 0; }

  fire() {
    if (!this.canFire()) return null;
    const w = this.stats;
    this.ammo--;
    this.fireCooldown = w.cooldown;

    // recoil kick — pushes view up, random horizontal jitter, recovered over time in update()
    this.kick.pitch += w.recoilKick;
    this.kick.yaw += (Math.random() - 0.5) * w.recoilYaw;

    // muzzle flash
    this.muzzle.intensity = 3.4;
    this.flash.material.opacity = 1;
    this.flash.material.rotation = Math.random() * Math.PI;
    setTimeout(() => { this.muzzle.intensity = 0; this.flash.material.opacity = 0; }, 45);

    const origin = new THREE.Vector3();
    this.camera.getWorldPosition(origin);
    const baseDir = new THREE.Vector3();
    this.camera.getWorldDirection(baseDir);

    const effSpread = w.spread + (w.spreadMax || 0) * this.heat;
    const shots = [];
    const pelletCount = w.pellets || 1;
    for (let i = 0; i < pelletCount; i++) {
      const dir = baseDir.clone();
      const s = pelletCount > 1 ? w.spread : effSpread;
      dir.x += (Math.random() - 0.5) * s * 2;
      dir.y += (Math.random() - 0.5) * s * 2;
      dir.z += (Math.random() - 0.5) * s * 0.4;
      dir.normalize();
      shots.push(dir);
    }

    this.heat = Math.min(1, this.heat + (w.heatPerShot || 0));

    return { origin, dir: baseDir, shots, dmg: w.dmg, headMult: w.headMult };
  }

  reload() {
    const w = this.stats;
    if (this.reloading || this.ammo === w.mag) return;
    this.reloading = true;
    setTimeout(() => { this.ammo = w.mag; this.reloading = false; }, 1400);
  }

  // world-space position of the barrel tip, used so tracers visibly originate from the gun
  getMuzzleWorldPosition(target = new THREE.Vector3()) {
    this.muzzle.getWorldPosition(target);
    return target;
  }

  spawnTracer(origin, dir, dist) {
    const len = Math.max(0.6, dist);
    const d = dir.clone().normalize();

    // bright additive core — thin, hot, and fast-fading
    const coreGeo = new THREE.CylinderGeometry(0.018, 0.005, len, 6, 1, true);
    coreGeo.translate(0, len / 2, 0);
    coreGeo.rotateX(Math.PI / 2);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xfff6d8, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.copy(origin);
    core.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), d);
    this.scene.add(core);

    // soft outer glow so the tracer reads clearly even against bright daylight
    const glowGeo = new THREE.CylinderGeometry(0.05, 0.015, len * 0.9, 6, 1, true);
    glowGeo.translate(0, len * 0.45, 0);
    glowGeo.rotateX(Math.PI / 2);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffc060, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.copy(origin);
    glow.quaternion.copy(core.quaternion);
    this.scene.add(glow);

    // small bright point at the impact end so hits read clearly at distance
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xfff6d8, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    tip.position.copy(origin).addScaledVector(d, len);
    this.scene.add(tip);

    const life = 0.14;
    this.tracers.push({ mesh: core, glow, tip, life, maxLife: life });
  }

  update(dt) {
    if (this.fireCooldown > 0) this.fireCooldown -= dt;

    // recoil recovery — spring back toward zero
    const w = this.stats;
    const rec = Math.min(1, w.recover * dt);
    this.kick.pitch -= this.kick.pitch * rec;
    this.kick.yaw -= this.kick.yaw * rec;
    if (Math.abs(this.kick.pitch) < 0.0002) this.kick.pitch = 0;
    if (Math.abs(this.kick.yaw) < 0.0002) this.kick.yaw = 0;

    // accuracy heat decay
    this.heat = Math.max(0, this.heat - w.heatDecay * dt);

    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= dt;
      const fade = Math.max(0, t.life / t.maxLife);
      t.mesh.material.opacity = fade;
      t.glow.material.opacity = fade * 0.45;
      t.tip.material.opacity = fade * 0.9;
      t.tip.scale.setScalar(1 + (1 - fade) * 1.5);
      if (t.life <= 0) {
        for (const obj of [t.mesh, t.glow, t.tip]) {
          this.scene.remove(obj); obj.geometry.dispose(); obj.material.dispose();
        }
        this.tracers.splice(i, 1);
      }
    }
  }
}
