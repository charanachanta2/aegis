export class PhysicsEngine {
  constructor(world) {
    this.world = world;
    this.playerRadius = 0.45;
  }

  move(entityPos, movement, footY) {
    let next = entityPos.clone();
    next.x += movement.x;
    if (!this.blockedXZ(next, footY)) entityPos.x = next.x;

    next = entityPos.clone();
    next.z += movement.z;
    if (!this.blockedXZ(next, footY)) entityPos.z = next.z;
  }

  blockedXZ(pos, footY) {
    for (const o of this.world.getColliders()) {
      if (
        pos.x + this.playerRadius > o.min.x && pos.x - this.playerRadius < o.max.x &&
        pos.z + this.playerRadius > o.min.z && pos.z - this.playerRadius < o.max.z &&
        footY < o.max.y - 0.15
      ) return true;
    }
    return false;
  }

  // returns highest walkable surface (ground=0, or platform top) beneath x,z
  groundHeightAt(x, z, currentFootY) {
    let ground = 0;
    for (const p of this.world.platforms) {
      if (x > p.min.x && x < p.max.x && z > p.min.z && z < p.max.z) {
        if (p.top <= currentFootY + 1.2) ground = Math.max(ground, p.top);
      }
    }
    return ground;
  }
}
