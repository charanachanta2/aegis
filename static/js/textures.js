import * as THREE from "https://unpkg.com/three@0.179.1/build/three.module.js";

function canvas(size = 512) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  return c;
}
function noiseFill(ctx, size, amount, base) {
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * amount;
    img.data[i] = base[0] + n;
    img.data[i + 1] = base[1] + n;
    img.data[i + 2] = base[2] + n;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}
function mkTex(draw, repeat = [4, 4]) {
  const c = canvas(512);
  draw(c.getContext("2d"), 512);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(...repeat);
  tex.anisotropy = 16;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
function mkBump(draw, repeat = [4, 4]) {
  const c = canvas(512);
  draw(c.getContext("2d"), 512);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(...repeat);
  return tex;
}

// ---------- concrete: mortar grid + speckle + edge grime ----------
function concretePaint(ctx, s, base) {
  noiseFill(ctx, s, 22, base);
  ctx.strokeStyle = "rgba(30,28,26,0.55)"; ctx.lineWidth = 2;
  for (let i = 1; i < 6; i++) {
    ctx.beginPath(); ctx.moveTo(0, i * s / 6); ctx.lineTo(s, i * s / 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i * s / 6, 0); ctx.lineTo(i * s / 6, s); ctx.stroke();
  }
  for (let i = 0; i < 60; i++) {
    ctx.strokeStyle = `rgba(20,18,16,${Math.random() * 0.3})`;
    ctx.beginPath();
    let x = Math.random() * s, y = Math.random() * s;
    ctx.moveTo(x, y);
    for (let j = 0; j < 4; j++) { x += (Math.random() - 0.5) * 30; y += (Math.random() - 0.5) * 30; ctx.lineTo(x, y); }
    ctx.stroke();
  }
}
export function concreteTex() { return mkTex((ctx, s) => concretePaint(ctx, s, [132, 129, 124]), [18, 18]); }
export function concreteBump() { return mkBump((ctx, s) => concretePaint(ctx, s, [140, 140, 140]), [18, 18]); }

// ---------- asphalt: fine speckle + lane paint ----------
function asphaltPaint(ctx, s, base) {
  noiseFill(ctx, s, 16, base);
  ctx.fillStyle = "rgba(200,160,50,0.4)";
  ctx.fillRect(s / 2 - 3, 0, 6, s);
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = `rgba(15,14,13,${Math.random() * 0.35})`;
    ctx.beginPath(); ctx.arc(Math.random() * s, Math.random() * s, Math.random() * 2.5, 0, 7); ctx.fill();
  }
}
export function asphaltTex() { return mkTex((ctx, s) => asphaltPaint(ctx, s, [46, 44, 42]), [22, 22]); }
export function asphaltBump() { return mkBump((ctx, s) => asphaltPaint(ctx, s, [128, 128, 128]), [22, 22]); }

// ---------- rusted metal: streaks + rivets + panel seams ----------
function metalPaint(ctx, s, base) {
  noiseFill(ctx, s, 26, base);
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * s;
    ctx.fillStyle = `rgba(${90 + Math.random() * 50},${45 + Math.random() * 30},${15},${Math.random() * 0.5})`;
    ctx.fillRect(x, 0, Math.random() * 4 + 1, s);
  }
  ctx.strokeStyle = "rgba(15,15,15,0.6)"; ctx.lineWidth = 3;
  for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(0, i * s / 3.1); ctx.lineTo(s, i * s / 3.1); ctx.stroke(); }
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = "rgba(20,20,20,0.7)";
    ctx.beginPath(); ctx.arc(20 + (i % 7) * (s - 40) / 6, i < 7 ? 20 : s - 20, 4, 0, 7); ctx.fill();
  }
}
export function rustMetalTex() { return mkTex((ctx, s) => metalPaint(ctx, s, [116, 82, 54]), [3, 1]); }
export function rustMetalBump() { return mkBump((ctx, s) => metalPaint(ctx, s, [150, 150, 150]), [3, 1]); }

// ---------- wood crate: grain + planks + corner braces ----------
function woodPaint(ctx, s, base) {
  ctx.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`; ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 40; i++) {
    ctx.strokeStyle = `rgba(${base[0] - 40},${base[1] - 30},${base[2] - 20},${Math.random() * 0.35})`;
    ctx.beginPath();
    let y = Math.random() * s;
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(s / 3, y + (Math.random() - 0.5) * 20, s * 2 / 3, y + (Math.random() - 0.5) * 20, s, y);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(50,32,14,0.8)"; ctx.lineWidth = 5;
  for (let i = 0; i < 4; i++) { const x = (i + 0.5) * s / 4; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, s); ctx.stroke(); }
  ctx.strokeRect(6, 6, s - 12, s - 12);
}
export function crateWoodTex() { return mkTex((ctx, s) => woodPaint(ctx, s, [150, 104, 58]), [1, 1]); }
export function crateWoodBump() { return mkBump((ctx, s) => woodPaint(ctx, s, [150, 150, 150]), [1, 1]); }

// ---------- foliage ----------
export function foliageTex() {
  return mkTex((ctx, s) => {
    ctx.fillStyle = "#182615"; ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 500; i++) {
      ctx.fillStyle = `rgba(${35 + Math.random() * 45},${65 + Math.random() * 55},${25 + Math.random() * 25},0.95)`;
      ctx.beginPath(); ctx.arc(Math.random() * s, Math.random() * s, Math.random() * 4 + 1, 0, 7); ctx.fill();
    }
  }, [1, 1]);
}

export function buildMaterialSet() {
  return {
    concrete: new THREE.MeshStandardMaterial({ map: concreteTex(), bumpMap: concreteBump(), bumpScale: 0.6, roughness: 0.92, metalness: 0.02 }),
    asphalt: new THREE.MeshStandardMaterial({ map: asphaltTex(), bumpMap: asphaltBump(), bumpScale: 0.3, roughness: 0.96, metalness: 0.0 }),
    metal: new THREE.MeshStandardMaterial({ map: rustMetalTex(), bumpMap: rustMetalBump(), bumpScale: 0.4, roughness: 0.5, metalness: 0.65 }),
    wood: new THREE.MeshStandardMaterial({ map: crateWoodTex(), bumpMap: crateWoodBump(), bumpScale: 0.35, roughness: 0.8, metalness: 0.0 }),
    foliage: new THREE.MeshStandardMaterial({ map: foliageTex(), roughness: 1, metalness: 0 }),
  };
}
