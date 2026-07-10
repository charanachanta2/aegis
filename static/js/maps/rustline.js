import { MapBuilder } from "../engine/MapBuilder.js";

export function buildRustline(world) {
  const b = new MapBuilder(world.scene, world);

  b.floor(300, 300, "asphalt");

  // Outer border
  b.wall({ x: 0, z: -150, width: 300, depth: 4 });
  b.wall({ x: 0, z: 150, width: 300, depth: 4 });
  b.wall({ x: -150, z: 0, width: 4, depth: 300 });
  b.wall({ x: 150, z: 0, width: 4, depth: 300 });

  // ===== CT SPAWN (Defense, blue) — bottom-left =====
  b.sidesRoom({ x: -105, z: 105, width: 44, depth: 34, sides: ["west", "east", "south"] }); // north fully open
  b.spawnZone({ x: -105, z: 105, width: 44, depth: 34, team: "Defense" });
  b.callout("CT Spawn", -105, 105);
  ["Defense", "Defense", "Defense", "Defense", "Defense"].forEach((t, i) => {
    b.spawn({ team: t, x: -115 + i * 6, z: 100 + (i % 2) * 8 });
  });

  // ===== T SPAWN (Attack, red) — top-right =====
  b.sidesRoom({ x: 105, z: -105, width: 44, depth: 34, sides: ["west", "east", "north"] }); // south fully open
  b.spawnZone({ x: 105, z: -105, width: 44, depth: 34, team: "Attack" });
  b.callout("T Spawn", 105, -105);
  ["Attack", "Attack", "Attack", "Attack", "Attack"].forEach((t, i) => {
    b.spawn({ team: t, x: 95 + i * 6, z: -110 + (i % 2) * 8 });
  });

  // ===== A MAIN: CT spawn up to A site =====
  b.corridor({ x: -95, z: 40, width: 18, depth: 100 });
  b.crate({ x: -100, z: 60, size: 4 });
  b.crate({ x: -88, z: 20, size: 3 });
  b.callout("A Main", -95, 30);

  // ===== A SITE ===== (open south + east — reachable from A Main / A Link / mid)
  b.sidesRoom({ x: -90, z: -70, width: 46, depth: 40, sides: ["north", "west"] });
  b.bombSite({ x: -90, z: -70, name: "A" });
  b.callout("A Site", -90, -70);
  b.container({ x: -100, z: -80, rotation: 0 });
  b.crate({ x: -78, z: -60, size: 3 });
  b.crate({ x: -75, z: -80, size: 3 });
  b.light({ x: -90, y: 9, z: -70, color: 0xe8a33d });

  // A Back
  b.crate({ x: -102, z: -95, size: 3 });
  b.callout("A Back", -90, -100);

  // A Link (A to mid)
  b.corridor({ x: -55, z: -35, width: 12, depth: 40 });
  b.crate({ x: -58, z: -45, size: 3 });
  b.callout("A Link", -55, -30);

  // ===== B MAIN: T spawn down to B site =====
  b.corridor({ x: 95, z: -20, width: 18, depth: 100 });
  b.crate({ x: 100, z: -40, size: 4 });
  b.crate({ x: 88, z: 0, size: 3 });
  b.callout("B Main", 95, -10);

  // ===== B SITE ===== (open north + west — reachable from B Main / B Link / mid)
  b.sidesRoom({ x: 90, z: 65, width: 46, depth: 40, sides: ["south", "east"] });
  b.bombSite({ x: 90, z: 65, name: "B" });
  b.callout("B Site", 90, 65);
  b.container({ x: 100, z: 75, rotation: 90 });
  b.crate({ x: 78, z: 55, size: 3 });
  b.crate({ x: 100, z: 55, size: 3 });
  b.light({ x: 90, y: 9, z: 65, color: 0x4fb0ff });

  // B Back
  b.callout("B Back", 90, 95);

  // B Link (B to mid)
  b.corridor({ x: 55, z: 35, width: 12, depth: 40 });
  b.crate({ x: 58, z: 45, size: 3 });
  b.callout("B Link", 55, 30);

  // ===== MID ===== (fully open hub — no boundary walls, only cover pieces)
  b.callout("Mid", -4, 8);

  // Pillars
  b.wall({ x: -14, z: -5, width: 3, depth: 18 });
  b.wall({ x: 14, z: -5, width: 3, depth: 18 });
  b.callout("Pillars", 0, -8);

  // Mid Top
  b.corridor({ x: 0, z: -35, width: 16, depth: 30 });
  b.callout("Mid Top", 0, -35);

  // Mid Box
  b.crate({ x: 0, z: 15, size: 4 });
  b.crate({ x: 6, z: 20, size: 3 });
  b.callout("Mid Box", 0, 18);

  // C Connector (mid to A link)
  b.corridor({ x: -30, z: -10, width: 10, depth: 30, openEnds: true });
  b.callout("C Connector", -30, -10);

  // U Underpass (mid to B)
  b.corridor({ x: 30, z: 10, width: 10, depth: 30 });
  b.callout("U Underpass", 30, 10);

  // Heaven — elevated platform overlooking B, near T spawn side
  b.platform({ x: 70, z: -40, width: 22, depth: 26, height: 4.5 });
  b.ramp({ x: 82, z: -25, width: 6, length: 14, height: 4.5, rotationY: Math.PI / 4 });
  b.callout("Heaven", 70, -40);

  // Scatter foliage for atmosphere
  const foliageSpots = [[-140, 130], [140, -130], [-140, -130], [140, 130], [0, 140], [0, -140]];
  foliageSpots.forEach(([x, z]) => b.foliage({ x, z, r: 5 }));

  console.log("RUSTLINE LOADED —", world.walls.length, "walls,", world.crates.length, "crates,", world.bombSites.length, "sites");
}
