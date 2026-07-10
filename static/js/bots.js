import * as THREE from "https://unpkg.com/three@0.179.1/build/three.module.js";
import { createRobotMesh } from "./characters.js";

export class BotManager {
  constructor(scene, world, count, difficulty, killfeed) {
    this.scene = scene;
    this.world = world;
    this.killfeed = killfeed;
    this.bots = [];
    this.difficulty = difficulty; // 0..1
    const colors = [0xe8453c, 0x3ddbd9, 0xe8a33d, 0x9a6fd9, 0x6fd98a, 0xff8fa3];
    for (let i = 0; i < count; i++) {
      const mesh = createRobotMesh(colors[i % colors.length]);
      const sp = world.getSpawnPoint(i % 2 === 0 ? "Attack" : "Defense");
      mesh.position.set(sp.x, 0, sp.z);
      scene.add(mesh);
      this.bots.push({
        mesh, hp: 100, alive: true, radius: 0.45,
        team: i % 2 === 0 ? "Attack" : "Defense",
        target: sp.clone(), fireTimer: Math.random() * 2, retargetTimer: 0,
        name: "BOT-" + (i + 1),
      });
    }
    this.ray = new THREE.Raycaster();
  }

  respawn(b) {
    const sp = this.world.getSpawnPoint(b.team);
    b.mesh.position.set(sp.x, 0, sp.z);
    b.hp = 100; b.alive = true; b.mesh.visible = true;
  }

  tryHit(raycaster) {
    for (const b of this.bots) {
      if (!b.alive) continue;
      const hits = raycaster.intersectObjects([b.mesh.userData.body, b.mesh.userData.head], false);
      if (hits.length) return { bot: b, headshot: hits[0].object === b.mesh.userData.head };
    }
    return null;
  }

  damage(b, dmg, onKill) {
    b.hp -= dmg;
    if (b.hp <= 0 && b.alive) {
      b.alive = false; b.mesh.visible = false;
      onKill(b);
      setTimeout(() => this.respawn(b), 3000);
    }
  }

  // true if nothing solid sits between the bot's eye and the player's chest
  hasLineOfSight(botPos, playerPos) {
    const eye = new THREE.Vector3(botPos.x, 1.5, botPos.z);
    const target = new THREE.Vector3(playerPos.x, playerPos.y - 0.2, playerPos.z);
    const toTarget = new THREE.Vector3().subVectors(target, eye);
    const dist = toTarget.length();
    if (dist < 0.01) return true;
    const dir = toTarget.clone().normalize();
    this.ray.set(eye, dir);
    this.ray.far = dist - 0.3;
    const blockers = this.world.getColliders().map((c) => c.mesh);
    const hits = this.ray.intersectObjects(blockers, false);
    return hits.length === 0;
  }

  update(dt, player, damagePlayerFn) {
    for (const b of this.bots) {
      if (!b.alive) continue;
      const toPlayer = new THREE.Vector3().subVectors(player.position, b.mesh.position);
      toPlayer.y = 0;
      const dist = toPlayer.length();

      b.retargetTimer -= dt;
      if (dist < 26 && dist > 2 && player.alive) {
        const dir = toPlayer.clone().normalize();
        const strafe = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(Math.sin(performance.now() * 0.001 + b.mesh.id) * 0.6);
        const move = dir.multiplyScalar(0.9 * dt).add(strafe.multiplyScalar(dt));
        b.mesh.position.x += move.x * 3;
        b.mesh.position.z += move.z * 3;
        b.mesh.lookAt(player.position.x, b.mesh.position.y, player.position.z);
      } else if (b.retargetTimer <= 0) {
        b.retargetTimer = 2 + Math.random() * 2;
        const sp = this.world.getSpawnPoint(b.team);
        b.target.set(sp.x, 0, sp.z);
      }

      b.fireTimer -= dt;
      if (dist < 22 && b.fireTimer <= 0 && player.alive) {
        b.fireTimer = 1.3 - this.difficulty * 0.6 + Math.random() * 0.6;
        if (Math.random() < 0.35 + this.difficulty * 0.3 && this.hasLineOfSight(b.mesh.position, player.position)) {
          damagePlayerFn(6 + Math.random() * 10 * (0.6 + this.difficulty));
        }
      }
    }
  }
}
