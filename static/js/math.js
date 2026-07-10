export function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function degToRad(d) { return d * Math.PI / 180; }
export function dist2D(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
