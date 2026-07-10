import * as THREE from "https://unpkg.com/three@0.179.1/build/three.module.js";
import { keys } from "./input.js";

const PLANT_TIME = 3.2;
const DEFUSE_TIME = 5.0;

export class Bomb {
  constructor(scene, world, net, onEvent) {
    this.scene = scene;
    this.world = world;
    this.net = net;
    this.onEvent = onEvent; // (type, data) UI callback

    this.state = "idle"; // idle | planting | planted | defusing | defused | exploded
    this.site = null;
    this.progress = 0;
    this.fuseTime = 0;
    this.mesh = null;

    net.on("bomb_planted", (d) => this.onServerPlanted(d));
    net.on("bomb_defused", () => this.onServerDefused());
    net.on("bomb_exploded", () => this.onServerExploded());
    net.on("round_start", () => this.reset());
  }

  spikeMesh() {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.5), new THREE.MeshStandardMaterial({ color: 0x1a1a1a }));
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 2 }));
    light.position.y = 0.12;
    g.add(base, light);
    g.userData.blink = light;
    return g;
  }

  // called every frame from game loop with player state
  update(dt, player, isAttacker) {
    if (this.state === "planting") {
      this.progress += dt / PLANT_TIME;
      this.net.plantProgress(this.site.name, this.progress);
      this.onEvent("plant_progress", this.progress);
      if (this.progress >= 1) {
        this.state = "planted_pending";
        this.net.planted(this.site.name);
      }
    } else if (this.state === "defusing") {
      this.progress += dt / DEFUSE_TIME;
      this.net.defuseProgress(this.progress);
      this.onEvent("defuse_progress", this.progress);
      if (this.progress >= 1) {
        this.state = "defused_pending";
        this.net.defused();
      }
    } else if (this.state === "planted") {
      this.fuseTime -= dt;
      if (this.mesh && this.mesh.userData.blink) {
        this.mesh.userData.blink.material.emissiveIntensity = 1.5 + Math.sin(performance.now() * 0.02) * 1.2;
      }
      this.onEvent("fuse", Math.max(0, this.fuseTime));
    }

    // start/stop planting based on key hold + zone + alive
    if (!player.alive) { this.cancelLocalAction(); return; }
    const site = this.world.nearestBombSite(player.position);

    if (isAttacker && this.state === "idle" && site && keys["KeyE"]) {
      this.state = "planting"; this.site = site; this.progress = 0;
    } else if (this.state === "planting" && (!keys["KeyE"] || !site)) {
      this.state = "idle"; this.progress = 0;
    }

    if (!isAttacker && this.state === "planted" && site && site.name === this.site?.name && keys["KeyE"]) {
      this.state = "defusing"; this.progress = 0;
    } else if (this.state === "defusing" && !keys["KeyE"]) {
      this.state = "planted"; this.progress = 0;
    }
  }

  cancelLocalAction() {
    if (this.state === "planting") { this.state = "idle"; this.progress = 0; }
    if (this.state === "defusing") { this.state = "planted"; this.progress = 0; }
  }

  onServerPlanted(data) {
    this.state = "planted";
    this.site = this.world.bombSites.find((s) => s.name === data.site) || this.site;
    this.fuseTime = data.fuse;
    this.progress = 0;
    if (this.site) {
      this.mesh = this.spikeMesh();
      this.mesh.position.set(this.site.x, 0.4, this.site.z);
      this.scene.add(this.mesh);
    }
    this.onEvent("planted", this.site?.name);
  }

  onServerDefused() {
    this.state = "defused";
    if (this.mesh) this.scene.remove(this.mesh);
    this.onEvent("defused");
  }

  onServerExploded() {
    this.state = "exploded";
    if (this.mesh) this.scene.remove(this.mesh);
    this.onEvent("exploded");
  }

  reset() {
    this.state = "idle"; this.progress = 0; this.site = null;
    if (this.mesh) { this.scene.remove(this.mesh); this.mesh = null; }
    this.onEvent("reset");
  }
}
