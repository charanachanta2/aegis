import { MapBuilder } from "../engine/MapBuilder.js";

// CORRODE — a compact weathered industrial refinery under open daylight.
// Two bomb sites, a tight central yard, and a multi-level "Heaven" overlook
// reached by real, climbable staircases. Kept dense with clutter so every
// lane has something to break line of sight or catch the eye.
export function buildCorrode(world) {
  const b = new MapBuilder(world.scene, world);

  b.floor(210, 210, "concrete");

  // Outer border
  b.wall({ x: 0, z: -105, width: 210, depth: 4 });
  b.wall({ x: 0, z: 105, width: 210, depth: 4 });
  b.wall({ x: -105, z: 0, width: 4, depth: 210 });
  b.wall({ x: 105, z: 0, width: 4, depth: 210 });

  // ===== DEFENSE SPAWN — bottom-left =====
  b.sidesRoom({ x: -72, z: 65, width: 30, depth: 24, sides: ["west", "south"] });
  b.spawnZone({ x: -72, z: 65, width: 30, depth: 24, team: "Defense" });
  b.callout("Defense Spawn", -72, 65);
  for (let i = 0; i < 5; i++) b.spawn({ team: "Defense", x: -78 + i * 5, z: 62 + (i % 2) * 6 });
  b.barrelCluster({ x: -80, z: 74, count: 3 });

  // ===== ATTACK SPAWN — top-right =====
  b.sidesRoom({ x: 72, z: -65, width: 30, depth: 24, sides: ["east", "north"] });
  b.spawnZone({ x: 72, z: -65, width: 30, depth: 24, team: "Attack" });
  b.callout("Attack Spawn", 72, -65);
  for (let i = 0; i < 5; i++) b.spawn({ team: "Attack", x: 66 + i * 5, z: -68 - (i % 2) * 6 });
  b.barrelCluster({ x: 80, z: -76, count: 3 });

  // ===== A MAIN =====
  b.corridor({ x: -60, z: 18, width: 14, depth: 60 });
  b.crate({ x: -64, z: 28, size: 4 });
  b.barrel({ x: -56, z: 8 });
  b.pipe({ x: -66, z: 18, y: 3, length: 50, rotationY: Math.PI / 2 });
  b.callout("A Main", -60, 12);

  // ===== A SITE =====
  b.sidesRoom({ x: -55, z: -45, width: 34, depth: 30, sides: ["north", "west"] });
  b.bombSite({ x: -55, z: -45, name: "A" });
  b.callout("A Site", -55, -45);
  b.container({ x: -63, z: -54, rotation: 0 });
  b.crate({ x: -45, z: -36, size: 3 });
  b.crate({ x: -44, z: -54, size: 3 });
  b.barrelCluster({ x: -48, z: -48, count: 3 });
  b.hazardStripe({ x: -55, z: -32, width: 30, rotationY: 0 });
  b.rubble({ x: -62, z: -40, count: 4 });
  b.light({ x: -55, y: 9, z: -45, color: 0xe8a33d, intensity: 1.2 });

  b.crate({ x: -66, z: -62, size: 3 });
  b.callout("A Back", -55, -65);
  b.corridor({ x: -32, z: -22, width: 11, depth: 26 });
  b.crate({ x: -34, z: -29, size: 3 });
  b.pipe({ x: -36, z: -22, y: 2.6, length: 20, rotationY: Math.PI / 2 });
  b.callout("A Link", -32, -18);

  // ===== B MAIN =====
  b.corridor({ x: 60, z: -12, width: 14, depth: 60 });
  b.crate({ x: 64, z: -22, size: 4 });
  b.barrel({ x: 56, z: -2 });
  b.pipe({ x: 66, z: -12, y: 3, length: 50, rotationY: Math.PI / 2 });
  b.callout("B Main", 60, -6);

  // ===== B SITE =====
  b.sidesRoom({ x: 55, z: 42, width: 34, depth: 30, sides: ["south", "east"] });
  b.bombSite({ x: 55, z: 42, name: "B" });
  b.callout("B Site", 55, 42);
  b.container({ x: 63, z: 51, rotation: 90 });
  b.crate({ x: 45, z: 33, size: 3 });
  b.crate({ x: 44, z: 51, size: 3 });
  b.barrelCluster({ x: 48, z: 45, count: 3 });
  b.hazardStripe({ x: 55, z: 29, width: 30, rotationY: 0 });
  b.rubble({ x: 62, z: 37, count: 4 });
  b.light({ x: 55, y: 9, z: 42, color: 0x4fb0ff, intensity: 1.2 });

  b.callout("B Back", 55, 62);
  b.corridor({ x: 32, z: 20, width: 11, depth: 26 });
  b.crate({ x: 34, z: 27, size: 3 });
  b.pipe({ x: 36, z: 20, y: 2.6, length: 20, rotationY: Math.PI / 2 });
  b.callout("B Link", 32, 16);

  // ===== MID YARD — tight hub, dense cover =====
  b.callout("Mid", 0, 2);
  b.wall({ x: -9, z: -3, width: 3, depth: 16 });
  b.wall({ x: 9, z: -3, width: 3, depth: 16 });
  b.callout("Pillars", 0, -5);
  b.corridor({ x: 0, z: -22, width: 12, depth: 20 });
  b.callout("Mid Top", 0, -22);
  b.crate({ x: 0, z: 10, size: 4 });
  b.crate({ x: 5, z: 14, size: 3 });
  b.barrelCluster({ x: -6, z: 12, count: 2 });
  b.callout("Mid Box", 0, 12);
  b.corridor({ x: -20, z: -5, width: 9, depth: 20, openEnds: true });
  b.callout("Connector", -20, -5);
  b.corridor({ x: 20, z: 5, width: 9, depth: 20 });
  b.callout("Underpass", 20, 5);
  b.rubble({ x: 0, z: -2, count: 5, spread: 4 });

  // ===== HEAVEN — elevated catwalk overlooking A and Mid =====
  const heavenHeight = 5.6;
  b.platform({ x: -20, z: -40, width: 22, depth: 24, height: heavenHeight, material: "concrete", solid: false });
  b.callout("Heaven", -20, -40);
  b.light({ x: -20, y: heavenHeight + 4, z: -40, color: 0xfff2d0, intensity: 1.0 });
  b.pipe({ x: -20, z: -51, y: heavenHeight + 0.5, length: 20, rotationY: Math.PI / 2 });
  b.wall({ x: -20, z: -51, width: 22, depth: 0.6, height: 1.1, y: heavenHeight });

  // Staircase 1: A Link up to Heaven's south edge
  b.stairs({ x: -20, z: -18, direction: "north", width: 7, steps: 13, stepHeight: heavenHeight / 13, stepDepth: 0.85, material: "metal" });
  b.callout("Heaven Stairs", -20, -12);

  // Staircase 2: Mid Top up to Heaven's east edge
  b.stairs({ x: -9, z: -37, direction: "west", width: 6, steps: 13, stepHeight: heavenHeight / 13, stepDepth: 0.8, material: "concrete" });
  b.callout("Heaven Ramp", -5, -37);

  // ===== Catwalk over B — smaller second high-ground =====
  const catwalkHeight = 4.2;
  b.platform({ x: 48, z: 26, width: 14, depth: 13, height: catwalkHeight, material: "metal", solid: false });
  b.callout("B Catwalk", 48, 26);
  b.stairs({ x: 48, z: 14, direction: "south", width: 5, steps: 10, stepHeight: catwalkHeight / 10, stepDepth: 0.75, material: "metal" });

  // scattered clutter for daylight visual interest
  const foliageSpots = [[-95, 92], [95, -92], [-95, -92], [95, 92], [0, 98], [0, -98]];
  foliageSpots.forEach(([x, z]) => b.foliage({ x, z, r: 4.5 }));
  b.rubble({ x: -80, z: 0, count: 4 });
  b.rubble({ x: 80, z: 0, count: 4 });
  b.barrelCluster({ x: 0, z: -70, count: 4, spread: 3 });

  console.log("CORRODE LOADED —", world.walls.length, "walls,", world.crates.length, "crates,",
    world.platforms.length, "platforms,", world.bombSites.length, "sites");
}
