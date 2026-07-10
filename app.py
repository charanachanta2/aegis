import time, random, string
from flask import Flask, render_template, request
from flask_socketio import SocketIO, join_room, leave_room, emit

app = Flask(__name__)
app.config["SECRET_KEY"] = "aegis-dev"
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet")

# rooms[code] = {
#   players: { sid: {name, team, x,y,z, yaw, hp, alive, kills, deaths} },
#   bomb: {state, site, plant_id, planted_at, fuse}
# }
rooms = {}

BOMB_FUSE = 40
PLANT_TIME = 3.2
DEFUSE_TIME = 5.0


def new_room():
    return {"players": {}, "bomb": {"state": "idle", "site": None, "plant_id": 0, "planted_at": 0, "fuse": BOMB_FUSE}}


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/newcode")
def newcode():
    return "".join(random.choice(string.ascii_uppercase + "23456789") for _ in range(5))


@socketio.on("join")
def on_join(data):
    room = (data.get("room") or "PUBLIC").upper()[:8]
    name = (data.get("name") or "Player")[:16]
    team = data.get("team", "Attack")
    join_room(room)
    rooms.setdefault(room, new_room())
    rooms[room]["players"][request.sid] = {
        "name": name, "team": team, "x": 0, "y": 2, "z": 0, "yaw": 0,
        "hp": 100, "alive": True, "kills": 0, "deaths": 0,
    }
    emit("joined", {
        "you": request.sid,
        "players": rooms[room]["players"],
        "bomb": rooms[room]["bomb"],
    })
    emit("player_joined", {"sid": request.sid, "player": rooms[room]["players"][request.sid]}, to=room, include_self=False)


def find_room(sid):
    for code, r in rooms.items():
        if sid in r["players"]:
            return code, r
    return None, None


@socketio.on("state")
def on_state(data):
    code, r = find_room(request.sid)
    if not r:
        return
    p = r["players"].get(request.sid)
    if not p:
        return
    p.update({k: data[k] for k in ("x", "y", "z", "yaw", "hp", "alive") if k in data})
    emit("state", {"sid": request.sid, "p": p}, to=code, include_self=False)


@socketio.on("shot")
def on_shot(data):
    code, r = find_room(request.sid)
    if not r:
        return
    data["sid"] = request.sid
    emit("shot", data, to=code, include_self=False)


@socketio.on("hit_report")
def on_hit_report(data):
    code, r = find_room(request.sid)
    if not r:
        return
    victim = r["players"].get(request.sid)
    shooter = r["players"].get(data.get("shooter_sid"))
    if victim:
        victim["alive"] = False
        victim["hp"] = 0
        victim["deaths"] += 1
    if shooter:
        shooter["kills"] += 1
    emit("player_down", {"victim": request.sid, "shooter": data.get("shooter_sid")}, to=code)


@socketio.on("plant_progress")
def on_plant_progress(data):
    code, r = find_room(request.sid)
    if not r:
        return
    emit("plant_progress", {"sid": request.sid, "pct": data.get("pct", 0), "site": data.get("site")}, to=code, include_self=False)


@socketio.on("planted")
def on_planted(data):
    code, r = find_room(request.sid)
    if not r or r["bomb"]["state"] == "planted":
        return
    r["bomb"]["state"] = "planted"
    r["bomb"]["site"] = data.get("site")
    r["bomb"]["plant_id"] += 1
    r["bomb"]["planted_at"] = time.time()
    my_id = r["bomb"]["plant_id"]
    emit("bomb_planted", {"site": r["bomb"]["site"], "fuse": BOMB_FUSE}, to=code)
    socketio.start_background_task(bomb_timer, code, my_id)


def bomb_timer(code, plant_id):
    socketio.sleep(BOMB_FUSE)
    r = rooms.get(code)
    if not r:
        return
    b = r["bomb"]
    if b["state"] == "planted" and b["plant_id"] == plant_id:
        b["state"] = "exploded"
        socketio.emit("bomb_exploded", {}, to=code)
        socketio.start_background_task(reset_round, code)


@socketio.on("defuse_progress")
def on_defuse_progress(data):
    code, r = find_room(request.sid)
    if not r:
        return
    emit("defuse_progress", {"pct": data.get("pct", 0)}, to=code, include_self=False)


@socketio.on("defused")
def on_defused(data):
    code, r = find_room(request.sid)
    if not r or r["bomb"]["state"] != "planted":
        return
    r["bomb"]["state"] = "defused"
    emit("bomb_defused", {}, to=code)
    socketio.start_background_task(reset_round, code)


def reset_round(code):
    socketio.sleep(4)
    r = rooms.get(code)
    if not r:
        return
    r["bomb"] = {"state": "idle", "site": None, "plant_id": r["bomb"]["plant_id"], "planted_at": 0, "fuse": BOMB_FUSE}
    for p in r["players"].values():
        p["alive"] = True
        p["hp"] = 100
    socketio.emit("round_start", {"players": r["players"]}, to=code)


@socketio.on("disconnect")
def on_disconnect():
    code, r = find_room(request.sid)
    if not r:
        return
    r["players"].pop(request.sid, None)
    emit("player_left", {"sid": request.sid}, to=code)
    if not r["players"]:
        rooms.pop(code, None)


if __name__ == "__main__":
    socketio.run(app, host="127.0.0.1", port=8000, debug=True)
