export const settings = { sensitivity: 0.002, fov: 75, volume: 0.8, autoFireAll: false };
const $ = (id) => document.getElementById(id);

export function initMenu(onStart) {
  let mode = "solo", team = "Attack", customMode = "spike", map = "corrode";

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      mode = tab.dataset.tab;
      $("onlinePanel").classList.toggle("hidden", mode !== "online");
      $("customPanel").classList.toggle("hidden", mode !== "custom");
    });
  });

  document.querySelectorAll("[data-map]").forEach((el) => {
    el.addEventListener("click", () => {
      document.querySelectorAll("[data-map]").forEach((e) => e.classList.remove("active"));
      el.classList.add("active");
      map = el.dataset.map;
    });
  });

  document.querySelectorAll("[data-team]").forEach((el) => {
    el.addEventListener("click", () => {
      document.querySelectorAll("[data-team]").forEach((e) => e.classList.remove("active"));
      el.classList.add("active");
      team = el.dataset.team;
    });
  });

  document.querySelectorAll("[data-custom-mode]").forEach((el) => {
    el.addEventListener("click", () => {
      document.querySelectorAll("[data-custom-mode]").forEach((e) => e.classList.remove("active"));
      el.classList.add("active");
      customMode = el.dataset.customMode;
    });
  });

  const botCount = $("botCount"), botDiff = $("botDiff"), roundTime = $("roundTime");
  botCount.addEventListener("input", () => $("botCountVal").textContent = botCount.value);
  roundTime.addEventListener("input", () => $("roundTimeVal").textContent = roundTime.value);
  botDiff.addEventListener("input", () => $("botDiffVal").textContent = ["Easy", "Normal", "Hard"][botDiff.value]);

  $("roomInput").value = "R" + Math.random().toString(36).slice(2, 6).toUpperCase();

  $("settingsBtn").addEventListener("click", () => {
    $("menuScreen").classList.add("hidden");
    $("settingsScreen").classList.remove("hidden");
  });
  $("closeSettings").addEventListener("click", () => {
    $("settingsScreen").classList.add("hidden");
    $("menuScreen").classList.remove("hidden");
  });
  const sens = $("sensSlider"), fov = $("fovSlider"), vol = $("volSlider");
  sens.addEventListener("input", () => { settings.sensitivity = sens.value * 0.001; $("sensVal").textContent = sens.value; });
  fov.addEventListener("input", () => { settings.fov = +fov.value; $("fovVal").textContent = fov.value; });
  vol.addEventListener("input", () => { settings.volume = vol.value / 100; $("volVal").textContent = vol.value; });
  const autoFireBox = $("autoFireAll");
  if (autoFireBox) autoFireBox.addEventListener("change", () => { settings.autoFireAll = autoFireBox.checked; });

  $("startBtn").addEventListener("click", () => {
    const name = $("nameInput").value.trim() || ("Runner" + Math.floor(Math.random() * 900 + 100));
    onStart({
      mode, team, name, map,
      room: ($("roomInput").value || "PUBLIC").toUpperCase().trim(),
      botCount: +botCount.value, botDiff: +botDiff.value / 2, roundTime: +roundTime.value,
      customMode,
    });
  });
}

export function initPauseHandlers(onResume, onQuit) {
  $("resumeBtn").addEventListener("click", onResume);
  $("quitBtn").addEventListener("click", onQuit);
}
export function showPause(text) { $("pauseStats").textContent = text; $("pauseOverlay").classList.remove("hidden"); }
export function hidePause() { $("pauseOverlay").classList.add("hidden"); }

export function enterHud(roomTag) {
  $("menuScreen").classList.add("hidden");
  $("hud").classList.remove("hidden");
  $("roomTag").textContent = roomTag;
}

export function updateHealth(hp) {
  $("healthBar").style.width = Math.max(0, hp) + "%";
  $("healthWrap").classList.toggle("critical", hp <= 30);
}

let flashTimer = null;
export function flashDamage(intensity = 0.6) {
  const el = $("damageFlash");
  el.style.opacity = Math.min(0.85, 0.25 + intensity * 0.6);
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => { el.style.opacity = 0; }, 260);
}

let hitMarkerTimer = null;
export function hitMarker(headshot = false) {
  const el = $("hitMarker");
  el.classList.toggle("headshot", !!headshot);
  el.classList.remove("show"); void el.offsetWidth; // restart animation
  el.classList.add("show");
  clearTimeout(hitMarkerTimer);
  hitMarkerTimer = setTimeout(() => el.classList.remove("show"), 220);
}

export function updateAmmo(ammo) { $("ammoText").innerHTML = ammo + "<span>/∞</span>"; }
export function updateKills(k) { $("killsText").textContent = k + " KILLS"; }
export function updateMoney(m) { $("moneyText").textContent = "$" + m; }
export function setReload(show) { $("reloadMsg").style.display = show ? "block" : "none"; }
export function setBuyHint(show) { $("buyHint").classList.toggle("hidden", !show); }

export function killfeed(msg) {
  const el = $("killfeed");
  const div = document.createElement("div");
  div.className = "killmsg"; div.textContent = msg;
  el.appendChild(div);
  setTimeout(() => div.remove(), 4000);
  while (el.children.length > 5) el.removeChild(el.firstChild);
}
export function centerMsg(text, duration) {
  const el = $("centerMsg");
  el.textContent = text; el.style.display = "block";
  setTimeout(() => el.style.display = "none", duration);
}
export function setTimer(text) { $("roundTimer").textContent = text; }
export function setBombStatus(text) { $("bombStatus").textContent = text; }
export function setActionPrompt(show, label, pct) {
  $("actionPrompt").classList.toggle("hidden", !show);
  if (label) $("actionLabel").textContent = label;
  if (pct !== undefined) $("progressBar").style.width = Math.round(pct * 100) + "%";
}
export function setCrosshairSpread(heat) {
  $("crosshair").style.transform = `translate(-50%,-50%) scale(${1 + heat * 1.6})`;
}

// ---------- buy menu (single source of truth, list rendered from JS) ----------
export function renderBuyMenu(weaponDb, armorPrice, state, onBuy) {
  const list = $("buyList");
  list.innerHTML = "";
  Object.entries(weaponDb).forEach(([key, w], i) => {
    const owned = state.weaponKey === key;
    const afford = state.money >= w.price;
    const row = document.createElement("div");
    row.className = "buyItem" + (owned ? " owned" : "") + (!afford && !owned ? " locked" : "");
    row.innerHTML = `<div><div class="name">${i + 1}. ${w.name}</div><div class="stats">dmg ${w.dmg} · mag ${w.mag}</div></div><div class="price">${w.price === 0 ? "FREE" : "$" + w.price}</div>`;
    row.addEventListener("click", () => onBuy("weapon", key));
    list.appendChild(row);
  });
  const armorRow = document.createElement("div");
  armorRow.className = "buyItem" + (state.armor ? " owned" : "");
  armorRow.innerHTML = `<div><div class="name">5. Armor Vest</div><div class="stats">reduces damage taken</div></div><div class="price">${state.armor ? "OWNED" : "$" + armorPrice}</div>`;
  armorRow.addEventListener("click", () => onBuy("armor"));
  list.appendChild(armorRow);
  $("buyMoneyText").textContent = "$" + state.money;
}
export function toggleBuyMenu(show) { $("buyMenu").classList.toggle("hidden", !show); }
export function initBuyClose(onClose) { $("closeBuyMenu").addEventListener("click", onClose); }
