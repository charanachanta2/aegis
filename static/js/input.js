export const keys = {};
export const mouse = { down: false, dx: 0, dy: 0 };

window.addEventListener("keydown", (e) => { keys[e.code] = true; });
window.addEventListener("keyup", (e) => { keys[e.code] = false; });
window.addEventListener("mousedown", (e) => { if (e.button === 0) mouse.down = true; });
window.addEventListener("mouseup", (e) => { if (e.button === 0) mouse.down = false; });
