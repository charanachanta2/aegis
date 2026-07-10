import * as THREE from "https://unpkg.com/three@0.179.1/build/three.module.js";

// Shared combat-robot character model used for remote players and bots.
// Boxy, plated, metallic chassis with a glowing visor/chest light and a
// visible held weapon so silhouettes read clearly at a distance.
export function createRobotMesh(color) {
  const g = new THREE.Group();

  const accent = new THREE.Color(color);
  const plating = new THREE.MeshStandardMaterial({ color: 0xc7ccd4, roughness: 0.35, metalness: 0.85 });
  const trim = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.4, metalness: 0.7 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1b1e24, roughness: 0.5, metalness: 0.6 });
  const joint = new THREE.MeshStandardMaterial({ color: 0x33383f, roughness: 0.55, metalness: 0.75 });
  const visorMat = new THREE.MeshStandardMaterial({ color: 0x0a0c10, emissive: accent, emissiveIntensity: 2.2, roughness: 0.3, metalness: 0.2 });
  const lightMat = new THREE.MeshStandardMaterial({ color: 0x0a0c10, emissive: accent, emissiveIntensity: 1.6, roughness: 0.3 });

  // pelvis / hip block
  const hip = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.26, 0.28), joint);
  hip.position.y = 0.86; hip.castShadow = true;

  // torso — main plated chassis (this is the "body" hitbox)
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.62, 0.34), plating);
  torso.position.y = 1.28; torso.castShadow = true;

  // chest light strip
  const chestLight = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.04), lightMat);
  chestLight.position.set(0, 1.34, 0.18);

  // trim collar / shoulder yoke
  const collar = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.1, 0.36), trim);
  collar.position.y = 1.58; collar.castShadow = true;

  const shoulderL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.24), trim);
  shoulderL.position.set(-0.38, 1.55, 0); shoulderL.castShadow = true;
  const shoulderR = shoulderL.clone(); shoulderR.position.x = 0.38;

  // head — small angular unit with glowing visor band
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.28, 0.3), plating);
  head.position.y = 1.86; head.castShadow = true;
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.06), visorMat);
  visor.position.set(0, 1.88, 0.16);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.22, 6), dark);
  antenna.position.set(0.1, 2.08, -0.05);

  // arms
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.55, 0.18), joint);
  armL.position.set(-0.38, 1.18, 0); armL.castShadow = true;
  const armR = armL.clone(); armR.position.x = 0.38;
  const elbowL = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.1, 0.2), trim);
  elbowL.position.set(-0.38, 0.94, 0);
  const elbowR = elbowL.clone(); elbowR.position.x = 0.38;

  // legs (thighs + boots) — kept as the "legs" cluster, no separate hitbox
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.62, 0.22), joint);
  legL.position.set(-0.15, 0.42, 0); legL.castShadow = true;
  const legR = legL.clone(); legR.position.x = 0.15;
  const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.32), dark);
  bootL.position.set(-0.15, 0.08, 0.03); bootL.castShadow = true;
  const bootR = bootL.clone(); bootR.position.x = 0.15;

  // held weapon — simplified rifle silhouette clipped to the right arm
  const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.11, 0.46), dark);
  gunBody.position.set(0.34, 1.2, 0.28); gunBody.castShadow = true;
  const gunBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.28, 8), dark);
  gunBarrel.rotation.x = Math.PI / 2;
  gunBarrel.position.set(0.34, 1.22, 0.56);
  const gunMag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.08), joint);
  gunMag.position.set(0.34, 1.04, 0.22);

  g.add(hip, torso, chestLight, collar, shoulderL, shoulderR, head, visor, antenna,
    armL, armR, elbowL, elbowR, legL, legR, bootL, bootR, gunBody, gunBarrel, gunMag);

  g.userData.head = head;
  g.userData.body = torso;

  // nameplate sprite (used for remote players; bots just won't call setTag)
  const cnv = document.createElement("canvas"); cnv.width = 256; cnv.height = 64;
  const ctx = cnv.getContext("2d");
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cnv), depthTest: false }));
  sprite.scale.set(1.6, 0.4, 1); sprite.position.y = 2.3;
  g.add(sprite); g.userData.tag = { ctx, cnv, sprite };

  return g;
}
