export class Net {
  constructor() {
    this.socket = null;
    this.mySid = null;
    this.connected = false;
    this.handlers = {};
  }

  connect(room, name, team) {
    this.socket = io();
    this.socket.on("connect", () => {
      this.connected = true;
      this.socket.emit("join", { room, name, team });
    });
    ["joined", "player_joined", "player_left", "state", "shot",
     "player_down", "plant_progress", "bomb_planted", "bomb_defused",
     "bomb_exploded", "defuse_progress", "round_start"].forEach((ev) => {
      this.socket.on(ev, (data) => {
        if (ev === "joined") this.mySid = data.you;
        (this.handlers[ev] || []).forEach((fn) => fn(data));
      });
    });
  }

  on(event, fn) {
    (this.handlers[event] = this.handlers[event] || []).push(fn);
  }

  sendState(p) {
    if (this.connected) this.socket.emit("state", p);
  }
  sendShot(data) {
    if (this.connected) this.socket.emit("shot", data);
  }
  reportHit(shooterSid) {
    if (this.connected) this.socket.emit("hit_report", { shooter_sid: shooterSid });
  }
  plantProgress(site, pct) {
    if (this.connected) this.socket.emit("plant_progress", { site, pct });
  }
  planted(site) {
    if (this.connected) this.socket.emit("planted", { site });
  }
  defuseProgress(pct) {
    if (this.connected) this.socket.emit("defuse_progress", { pct });
  }
  defused() {
    if (this.connected) this.socket.emit("defused", {});
  }
}
