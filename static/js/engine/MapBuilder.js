import * as THREE from "https://unpkg.com/three@0.179.1/build/three.module.js";
import { buildMaterialSet } from "../textures.js";

export class MapBuilder {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.mats = buildMaterialSet();
  }

  floor(width, depth, mat = "asphalt") {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), this.mats[mat]);
    m.rotation.x = -Math.PI / 2;
    m.receiveShadow = true;
    this.scene.add(m);
  }

  wall({ x, z, width, depth, height = 8, y = 0, material = "concrete" }) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), this.mats[material]);
    m.position.set(x, y + height / 2, z);
    m.castShadow = true; m.receiveShadow = true;
    this.scene.add(m);
    this.world.walls.push({
      mesh: m,
      min: new THREE.Vector3(x - width / 2, y, z - depth / 2),
      max: new THREE.Vector3(x + width / 2, y + height, z + depth / 2),
    });
  }

  // walkable platform (top surface can be stood on, e.g. Heaven high ground).
  // solid=true (default): blocks from the sides too, like a plinth — reach it via stairs/another platform of equal height.
  // solid=false: walkable-only, doesn't block lateral movement — used for catwalks/landings fed by stairs.
  platform({ x, z, width, depth, height = 3, material = "metal", solid = true }) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(width, solid ? height : Math.min(height, 0.3), depth), this.mats[material]);
    m.position.set(x, solid ? height / 2 : height - (Math.min(height, 0.3) / 2), z);
    m.castShadow = true; m.receiveShadow = true;
    this.scene.add(m);
    const entry = {
      mesh: m,
      min: new THREE.Vector3(x - width / 2, 0, z - depth / 2),
      max: new THREE.Vector3(x + width / 2, height, z + depth / 2),
      top: height,
    };
    if (solid) this.world.walls.push(entry);
    this.world.platforms.push(entry);
  }

  // cosmetic incline (no collider) — kept for visual dressing under real stairs()
  ramp({ x, z, width, length, height, rotationY = 0 }) {
    const geo = new THREE.BoxGeometry(width, 0.5, length);
    const m = new THREE.Mesh(geo, this.mats.metal);
    m.position.set(x, height / 2, z);
    m.rotation.set(-Math.atan2(height, length), rotationY, 0);
    m.castShadow = true; m.receiveShadow = true;
    this.scene.add(m);
  }

  // real, climbable staircase: builds visible steps and registers each tread as a
  // walkable (non-blocking) surface so the player actually walks up it, no jump required.
  // direction: which way you walk to go UP the stairs ("north" = -z, "south" = +z, "east" = +x, "west" = -x)
  stairs({ x, z, direction = "north", width = 6, steps = 10, stepHeight = 0.4, stepDepth = 0.9, baseHeight = 0, material = "metal" }) {
    const axis = (direction === "north" || direction === "south") ? "z" : "x";
    const sign = (direction === "north" || direction === "west") ? -1 : 1;
    for (let i = 0; i < steps; i++) {
      const riseTop = baseHeight + (i + 1) * stepHeight;
      const treadCenterOffset = sign * (i * stepDepth + stepDepth / 2);
      const cx = axis === "x" ? x + treadCenterOffset : x;
      const cz = axis === "z" ? z + treadCenterOffset : z;
      // visible tread — front-face riser + top tread box
      const treadGeo = new THREE.BoxGeometry(
        axis === "x" ? stepDepth : width,
        stepHeight * (i + 1),
        axis === "z" ? stepDepth : width
      );
      const m = new THREE.Mesh(treadGeo, this.mats[material]);
      m.position.set(cx, riseTop / 2, cz);
      m.castShadow = true; m.receiveShadow = true;
      this.scene.add(m);
      // walkable-only entry (no side blocking) so climbing feels smooth
      this.world.platforms.push({
        mesh: m,
        min: new THREE.Vector3(cx - (axis === "x" ? stepDepth : width) / 2, 0, cz - (axis === "z" ? stepDepth : width) / 2),
        max: new THREE.Vector3(cx + (axis === "x" ? stepDepth : width) / 2, riseTop, cz + (axis === "z" ? stepDepth : width) / 2),
        top: riseTop,
      });
    }
    // simple side rails for visual clarity
    const totalLen = steps * stepDepth;
    const railGeo = new THREE.BoxGeometry(axis === "x" ? totalLen : 0.12, 0.7, axis === "z" ? totalLen : 0.12);
    const railOffset = sign * totalLen / 2;
    const railMat = this.mats.metal;
    [-1, 1].forEach((side) => {
      const rail = new THREE.Mesh(railGeo, railMat);
      const railTop = baseHeight + steps * stepHeight * 0.55;
      if (axis === "z") rail.position.set(x + side * (width / 2 + 0.05), railTop, z + railOffset);
      else rail.position.set(x + railOffset, railTop, z + side * (width / 2 + 0.05));
      this.scene.add(rail);
    });
    return { topHeight: baseHeight + steps * stepHeight };
  }

  // builds a wall run with an optional door gap cut into it
  _run({ axis, fixed, spanMin, spanMax, thickness, height, gap }) {
    const segs = [];
    if (gap) {
      const gMin = Math.max(spanMin, gap.at - gap.width / 2);
      const gMax = Math.min(spanMax, gap.at + gap.width / 2);
      if (gMin - spanMin > 0.6) segs.push([spanMin, gMin]);
      if (spanMax - gMax > 0.6) segs.push([gMax, spanMax]);
      if (!segs.length) return; // door as wide as whole wall
    } else {
      segs.push([spanMin, spanMax]);
    }
    for (const [a, bnd] of segs) {
      const len = bnd - a, center = (a + bnd) / 2;
      if (axis === "x") this.wall({ x: center, z: fixed, width: len, depth: thickness, height });
      else this.wall({ x: fixed, z: center, width: thickness, depth: len, height });
    }
  }

  room({ x, z, width, depth, wallHeight = 8, wallThickness = 2, doors = [] }) {
    const doorFor = (side) => doors.find((d) => d.side === side);
    this._run({ axis: "x", fixed: z - depth / 2, spanMin: x - width / 2, spanMax: x + width / 2, thickness: wallThickness, height: wallHeight, gap: doorFor("north") });
    this._run({ axis: "x", fixed: z + depth / 2, spanMin: x - width / 2, spanMax: x + width / 2, thickness: wallThickness, height: wallHeight, gap: doorFor("south") });
    this._run({ axis: "z", fixed: x - width / 2, spanMin: z - depth / 2, spanMax: z + depth / 2, thickness: wallThickness, height: wallHeight, gap: doorFor("west") });
    this._run({ axis: "z", fixed: x + width / 2, spanMin: z - depth / 2, spanMax: z + depth / 2, thickness: wallThickness, height: wallHeight, gap: doorFor("east") });
  }

  // builds only the listed sides solid; the rest are fully open (no gap math, no edge cases)
  sidesRoom({ x, z, width, depth, wallHeight = 8, wallThickness = 2, sides = ["north", "south", "east", "west"] }) {
    if (sides.includes("north")) this.wall({ x, z: z - depth / 2, width, depth: wallThickness, height: wallHeight });
    if (sides.includes("south")) this.wall({ x, z: z + depth / 2, width, depth: wallThickness, height: wallHeight });
    if (sides.includes("west")) this.wall({ x: x - width / 2, z, width: wallThickness, depth, height: wallHeight });
    if (sides.includes("east")) this.wall({ x: x + width / 2, z, width: wallThickness, depth, height: wallHeight });
  }

  corridor({ x, z, width, depth, wallHeight = 8, wallThickness = 2, openEnds = true }) {
    this.wall({ x: x - width / 2, z, width: wallThickness, depth, height: wallHeight });
    this.wall({ x: x + width / 2, z, width: wallThickness, depth, height: wallHeight });
    if (!openEnds) {
      this.wall({ x, z: z - depth / 2, width, depth: wallThickness, height: wallHeight });
      this.wall({ x, z: z + depth / 2, width, depth: wallThickness, height: wallHeight });
    }
  }

  crate({ x, z, size = 2, material = "wood" }) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), this.mats[material]);
    m.position.set(x, size / 2, z);
    m.castShadow = true; m.receiveShadow = true;
    this.scene.add(m);
    this.world.crates.push({
      mesh: m,
      min: new THREE.Vector3(x - size / 2, 0, z - size / 2),
      max: new THREE.Vector3(x + size / 2, size, z + size / 2),
    });
  }

  container({ x, z, rotation = 0 }) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 2.5), this.mats.metal);
    m.position.set(x, 1.5, z);
    m.rotation.y = THREE.MathUtils.degToRad(rotation);
    m.castShadow = true; m.receiveShadow = true;
    this.scene.add(m);
    const w = rotation % 180 === 90 ? 2.5 : 6, d = rotation % 180 === 90 ? 6 : 2.5;
    this.world.crates.push({
      mesh: m,
      min: new THREE.Vector3(x - w / 2, 0, z - d / 2),
      max: new THREE.Vector3(x + w / 2, 3, z + d / 2),
    });
  }

  foliage({ x, z, r = 3 }) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), this.mats.foliage);
    m.position.set(x, r * 0.8, z);
    m.scale.y = 0.6;
    this.scene.add(m);
  }

  bombSite({ x, z, name, radius = 7 }) {
    const color = name === "A" ? 0xe8a33d : 0x4fb0ff;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.15, 32),
      new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.3, emissive: color, emissiveIntensity: 0.3 }));
    m.position.set(x, 0.08, z);
    this.scene.add(m);
    this.world.bombSites.push({ name, x, z, radius });
  }

  spawn({ x, z, team }) {
    this.world.spawnPoints.push({ team, position: new THREE.Vector3(x, 2, z) });
  }

  spawnZone({ x, z, width, depth, team }) {
    this.world.spawnZones.push({ team, x, z, width, depth });
  }

  light({ x, y = 9, z, intensity = 1.6, color = 0xffb56b }) {
    const l = new THREE.PointLight(color, intensity, 45);
    l.position.set(x, y, z);
    l.castShadow = true;
    this.scene.add(l);
  }

  barrel({ x, z, material = "metal" }) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.1, 14), this.mats[material]);
    m.position.set(x, 0.55, z);
    m.castShadow = true; m.receiveShadow = true;
    this.scene.add(m);
    this.world.crates.push({
      mesh: m,
      min: new THREE.Vector3(x - 0.55, 0, z - 0.55),
      max: new THREE.Vector3(x + 0.55, 1.1, z + 0.55),
    });
  }

  barrelCluster({ x, z, count = 3, spread = 1.6 }) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.6;
      this.barrel({ x: x + Math.cos(a) * spread * Math.random(), z: z + Math.sin(a) * spread * Math.random() });
    }
  }

  // decorative pipe run along a wall — no collider, purely visual clutter
  pipe({ x, z, y = 2.2, length = 8, rotationY = 0, radius = 0.14 }) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 10), this.mats.metal);
    m.position.set(x, y, z);
    m.rotation.z = Math.PI / 2;
    m.rotation.y = rotationY;
    m.castShadow = true;
    this.scene.add(m);
    for (let i = -1; i <= 1; i += 2) {
      const bracket = new THREE.Mesh(new THREE.TorusGeometry(radius + 0.05, 0.03, 6, 10), this.mats.metal);
      bracket.rotation.y = Math.PI / 2;
      bracket.position.set(x + Math.sin(rotationY) * length * 0.35 * i, y, z + Math.cos(rotationY) * length * 0.35 * i);
      this.scene.add(bracket);
    }
  }

  // small irregular debris cluster — purely visual ground clutter
  rubble({ x, z, count = 5, spread = 2.2 }) {
    for (let i = 0; i < count; i++) {
      const s = 0.25 + Math.random() * 0.5;
      const m = new THREE.Mesh(new THREE.BoxGeometry(s, s * 0.6, s), this.mats.concrete);
      m.position.set(x + (Math.random() - 0.5) * spread, s * 0.3, z + (Math.random() - 0.5) * spread);
      m.rotation.y = Math.random() * Math.PI;
      m.castShadow = true; m.receiveShadow = true;
      this.scene.add(m);
    }
  }

  // painted hazard-stripe strip on the floor (pure decal, no collider)
  hazardStripe({ x, z, width = 4, depth = 0.8, rotationY = 0 }) {
    const c = document.createElement("canvas"); c.width = 128; c.height = 32;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#1a1a1a"; ctx.fillRect(0, 0, 128, 32);
    ctx.fillStyle = "#e8a33d";
    for (let i = -1; i < 6; i++) { ctx.save(); ctx.translate(i * 24, 0); ctx.rotate(0.5); ctx.fillRect(-6, -20, 12, 70); ctx.restore(); }
    const tex = new THREE.CanvasTexture(c);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }));
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = rotationY;
    m.position.set(x, 0.03, z);
    m.receiveShadow = true;
    this.scene.add(m);
  }

  callout(text, x, z) {
    this.world.callouts.push({ text, x, z });
    const c = document.createElement("canvas"); c.width = 320; c.height = 72;
    const ctx = c.getContext("2d");
    ctx.font = "bold 40px Rajdhani, Arial"; ctx.fillStyle = "#f2ead8"; ctx.textAlign = "center";
    ctx.shadowColor = "#000"; ctx.shadowBlur = 8;
    ctx.fillText(text.toUpperCase(), 160, 48);
    const tex = new THREE.CanvasTexture(c);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    sprite.scale.set(9, 2, 1);
    sprite.position.set(x, 6.5, z);
    this.scene.add(sprite);
  }
}
