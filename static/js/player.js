import * as THREE from "https://unpkg.com/three@0.179.1/build/three.module.js";
import { keys } from "./input.js";
import { clamp } from "./math.js";

export class Player {
  constructor(camera, world, physics, team, settings) {
    this.camera = camera;
    this.world = world;
    this.physics = physics;
    this.team = team;
    this.settings = settings;

    this.position = world.getSpawnPoint(team) || new THREE.Vector3(0, 2, 0);
    this.yaw = team === "Attack" ? Math.PI : 0;
    this.pitch = 0;

    this.walkSpeed = 6;
    this.sprintSpeed = 9.5;
    this.jumpForce = 8;
    this.gravity = 20;
    this.velocityY = 0;
    this.height = 1.8;
    this.onGround = true;

    this.hp = 100;
    this.armor = false;
    this.money = 800;
    this.alive = true;
    this.kills = 0;

    this.camera.position.copy(this.position);
    this.camera.rotation.order = "YXZ";
  }

  mouseMove(dx, dy) {
    const s = (this.settings.sensitivity || 0.002);
    this.yaw -= dx * s;
    this.pitch -= dy * s;
    const limit = Math.PI / 2 - 0.01;
    this.pitch = clamp(this.pitch, -limit, limit);
  }

  respawn() {
    this.position = this.world.getSpawnPoint(this.team) || this.position;
    this.hp = 100;
    this.alive = true;
    this.velocityY = 0;
    this.armor = false;
  }

  update(delta) {
    if (!this.alive) return;

    const dir = new THREE.Vector3();
    if (keys["KeyW"]) dir.z -= 1;
    if (keys["KeyS"]) dir.z += 1;
    if (keys["KeyA"]) dir.x -= 1;
    if (keys["KeyD"]) dir.x += 1;
    if (dir.lengthSq() > 0) dir.normalize();
    dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

    const speed = keys["ShiftLeft"] ? this.sprintSpeed : this.walkSpeed;
    const footY = this.position.y - this.height;

    this.physics.move(this.position, { x: dir.x * speed * delta, z: dir.z * speed * delta }, footY);

    const ground = this.physics.groundHeightAt(this.position.x, this.position.z, footY);

    this.velocityY -= this.gravity * delta;
    this.position.y += this.velocityY * delta;

    const floorY = ground + this.height;
    if (this.position.y <= floorY) {
      this.position.y = floorY;
      this.velocityY = 0;
      this.onGround = true;
      if (keys["Space"]) this.velocityY = this.jumpForce;
    } else {
      this.onGround = false;
    }

    this.camera.position.copy(this.position);
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }
}
