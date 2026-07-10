import { MapBuilder } from "../engine/MapBuilder.js";

export function buildOutpost(world) {
  const b = new MapBuilder(world.scene, world);

  b.floor(260, 220, "concrete");

  // Outer border
  b.wall({ x: 0, z: -100, width: 260, depth: 3 });
  b.wall({ x: 0, z: 100, width: 260, depth: 3 });
  b.wall({ x: -130, z: 0, width: 3, depth: 200 });
  b.wall({ x: 130, z: 0, width: 3, depth: 200 });

  // ===== ATTACKERS SPAWN — top-center, south fully open into map =====
  b.sidesRoom({ x: 0, z: -85, width: 62, depth: 20, sides: ["west", "east", "north"] });
  b.spawnZone({ x: 0, z: -85, width: 62, depth: 20, team: "Attack" });
  b.callout("Attackers Spawn", 0, -85);
  for (let i = 0; i < 5; i++) b.spawn({ team: "Attack", x: -20 + i * 10, z: -80 });

  // ===== DEFENDERS SPAWN — bottom-center, north fully open into map =====
  b.sidesRoom({ x: -15, z: 85, width: 62, depth: 20, sides: ["west", "east", "south"] });
  b.spawnZone({ x: -15, z: 85, width: 62, depth: 20, team: "Defense" });
  b.callout("Defenders Spawn", -15, 85);
  for (let i = 0; i < 5; i++) b.spawn({ team: "Defense", x: -35 + i * 10, z: 80 });

  // ===== A SITE — left, open north + west toward mid/corridor =====
  b.sidesRoom({ x: -90, z: -15, width: 44, depth: 46, sides: ["north", "west"] });
  b.bombSite({ x: -95, z: -20, name: "A", radius: 8 });
  b.callout("A Site", -90, -15);
  b.crate({ x: -80, z: -25, size: 3 });
  b.light({ x: -90, y: 9, z: -15, color: 0xe8a33d });
  b.callout("A Back", -105, -20);

  // ===== B SITE — right, open north + east toward mid/corridor =====
  b.sidesRoom({ x: 95, z: 30, width: 46, depth: 40, sides: ["north", "east"] });
  b.bombSite({ x: 100, z: 35, name: "B", radius: 8 });
  b.callout("B Site", 95, 30);
  b.container({ x: 105, z: 15, rotation: 90 });
  b.crate({ x: 85, z: 40, size: 3 });
  b.light({ x: 95, y: 9, z: 30, color: 0x4fb0ff });
  b.callout("B Back", 110, 45);

  // ===== MID — fully open hub connecting spawns to both sites, just cover pieces =====
  b.callout("Mid", -10, 20);
  b.crate({ x: -35, z: -35, size: 5, material: "wood" });
  b.callout("Cover", -35, -35);

  b.wall({ x: 15, z: 0, width: 2, depth: 34 }); // center divider, walkable around both ends
  b.crate({ x: -10, z: 20, size: 5, material: "wood" });
  b.crate({ x: 45, z: 25, size: 5, material: "metal" });

  // Doorway pinch point (the "D" marker) — cover + callout, fully walkable
  b.crate({ x: -55, z: 5, size: 2, material: "metal" });
  b.callout("Door", -55, 5);

  // small side room near top-right, open toward mid
  b.sidesRoom({ x: 60, z: -35, width: 26, depth: 26, sides: ["north", "east"] });
  b.crate({ x: 60, z: -35, size: 4, material: "metal" });

  console.log("OUTPOST LOADED —", world.walls.length, "walls,", world.bombSites.length, "sites");
}
