# Project Aegis — Corrode

A daylight tactical FPS: bots or live online 5v5, buy menu economy, spike plant/defuse.
Built to deploy on **Vercel** — static site + one serverless function, no persistent
backend process required.

## Multiplayer transport

Live multiplayer now runs on **Ably** (realtime pub/sub + presence) instead of a
Flask/Socket.IO server, because Vercel's serverless functions can't hold the
persistent connections a traditional Socket.IO server needs. Ably's free tier
(6M messages/month) is enough for casual play with friends.

**Trade-off to know about:** there's no server-owned authority anymore. The
player who plants the spike has their own browser run the 40-second fuse timer
and broadcast the explosion. Fine for casual matches between friends; not
cheat-proof if that mattered (a modified client could fake the timer).

## Setup

1. **Get a free Ably API key**: sign up at ably.com → create an app → copy the
   root API key (looks like `xxxxxx.yyyyyy:zzzzzzzzzzzzzz`).
2. **Local dev** (needs the [Vercel CLI](https://vercel.com/docs/cli)):
   ```bash
   npm install -g vercel
   vercel dev
   ```
   When prompted, or via a `.env` file / `vercel env add`, set:
   ```
   ABLY_API_KEY=your-key-here
   ```
3. **Deploy**:
   ```bash
   vercel
   ```
   Then in the Vercel dashboard → your project → Settings → Environment
   Variables, add `ABLY_API_KEY` with your Ably key, and redeploy.

That's it — no Python, no `pip install`, no separate server to host.

## Solo / Custom modes

Bot matches and Custom matches never touch the network at all — they run
entirely client-side, so they work even with `ABLY_API_KEY` unset.

## Project layout

```
index.html              entry point (served statically)
static/css/style.css
static/js/game.js        main loop
static/js/net.js         Ably transport
static/js/maps/          corrode.js (default), rustline.js, outpost.js
api/token.js             issues Ably auth tokens (Node serverless function)
```
