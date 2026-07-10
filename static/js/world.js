import { buildRustline } from "./maps/rustline.js";
import { buildOutpost } from "./maps/outpost.js";
import { buildCorrode } from "./maps/corrode.js";

export class World {
  constructor(scene) {
    this.scene = scene;
    this.walls = [];
    this.crates = [];
    this.platforms = [];
    this.spawnPoints = [];
    this.spawnZones = [];
    this.bombSites = [];
    this.callouts = [];
  }

  build(mapName = "corrode") {
    if (mapName === "outpost") buildOutpost(this);
    else if (mapName === "rustline") buildRustline(this);
    else buildCorrode(this);
  }

  getColliders() {
    return [...this.walls, ...this.crates];
  }

  getSpawnPoint(team = "Attack") {
    const pts = this.spawnPoints.filter((s) => s.team === team);
    const pool = pts.length ? pts : this.spawnPoints;
    return pool.length ? pool[Math.floor(Math.random() * pool.length)].position.clone() : null;
  }

  nearestBombSite(pos, maxDist = 8) {
    for (const s of this.bombSites) {
      const d = Math.hypot(pos.x - s.x, pos.z - s.z);
      if (d <= (s.radius || maxDist)) return s;
    }
    return null;
  }

  inOwnSpawn(pos, team) {
    return this.spawnZones.some((z) =>
      z.team === team &&
      pos.x > z.x - z.width / 2 && pos.x < z.x + z.width / 2 &&
      pos.z > z.z - z.depth / 2 && pos.z < z.z + z.depth / 2
    );
  }
}
