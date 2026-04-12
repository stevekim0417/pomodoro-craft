# 🍅 Pomodoro Craft

> A **Minecraft-themed Pomodoro focus timer** with pixel art animations.
> Steve harvests tomatoes while you focus. Free, single HTML file, no install.

**▶️ Try it now: https://pomodoro-craft-api.steve-kim-0417.workers.dev/**

## ✨ What makes it different

- **Cozy pixel-art world** — Steve (now wearing a red baseball cap 🧢) stands in front of a growing biome that reacts to your focus sessions
- **5 swappable biomes** — Tomato 🍅 (default), Diamond 💎, Emerald 💚, Gold 🟡, Ruby ❤️ — each with its own particle colors, drop item, hill palette, and harvest icon
- **Harvest inventory** — every completed focus session drops one fruit/gem of the current theme into today's harvest row
- **Companion Mode** — a fullscreen, UI-less layout you can drop into OBS or use as a YouTube live stream background
- **URL presets** — share a link like `?focus=50&theme=ruby&autostart=1` and the timer starts that exact session on click
- **Social proof counter** — `🌱 N focusing now` gives you a sense you're not studying alone
- **Zero dependencies** — a single `index.html` file, no build tools, no frameworks, open and focus

## 🚀 Quick start

### Option 1 — Just open it
```bash
open index.html
```

### Option 2 — Serve locally
```bash
npx serve .
```

### Option 3 — Hosted version
Visit **[the live site](https://pomodoro-craft-api.steve-kim-0417.workers.dev/)** — nothing to install.

## 🎬 Companion Mode (for streamers / creators)

Add `?mode=companion` to the URL to switch into a fullscreen layout where only Steve and a small timer overlay are visible — perfect as an OBS browser source or a YouTube live stream background.

```
https://pomodoro-craft-api.steve-kim-0417.workers.dev/?mode=companion&focus=25&autostart=1
```

| Use case | URL |
|---|---|
| OBS browser source (1920×1080) | `?mode=companion&focus=25&autostart=1` |
| 50-min deep work, Ruby theme | `?mode=companion&focus=50&break=10&theme=ruby&autostart=1` |
| Classic Pomodoro, auto-start | `?focus=25&break=5&autostart=1` |

## 🔗 URL parameters

All optional. Combine freely.

| Param | Values | What it does |
|---|---|---|
| `theme` | `tomato` · `diamond` · `emerald` · `gold` · `ruby` | Starting biome |
| `mode` | `companion` | Fullscreen/no-UI layout |
| `focus` | `1`–`180` | Focus duration (minutes) |
| `break` | `1`–`60` | Short break duration |
| `long` | `1`–`120` | Long break duration |
| `autostart` | `1` / `true` | Start the timer on page load |

## ⌨️ Keyboard shortcuts

| Key | Action |
|---|---|
| `Space` | Start / Pause / Resume |
| `S` | Skip to next mode |
| `R` | Reset timer |

## 🧩 Features

### Focus Mode (day)
- Steve swings his pickaxe with a downward arc + body lean
- A procedural hill grows beside him — each theme paints the hill with its own biome palette (grass, moss, sand, cave rock, tomato garden)
- Dirt chunks fly from Steve to the hill in parabolic arcs
- Creeper occasionally peeks from behind a tree
- **HARVEST row** — every focus session drops one themed icon into today's inventory

### Break Mode (night)
- Night sky with twinkling stars and moon
- Steve rests by a flickering campfire
- Wolf companion with tail-wagging animation
- Floating fireflies and rising embers
- ZZZ sleep bubbles and stretch animations
- Chicken walks across the scene
- Lo-fi music auto-plays during breaks (togglable)

### Timer
- Configurable focus (1–180 min), short break (1–60 min), long break (1–120 min)
- 8-slot hotbar tracks sessions per cycle; long break every 4 sessions
- Block-style progress bar
- Browser notifications when a session ends
- Auto-break / auto-focus toggles for continuous sessions

### Theme picker (5 biomes)
Switch via the **ORE THEME** row in the settings drawer. Each theme updates:
- Ore color
- Drop item sprite + colors
- Hotbar icon
- Hill biome palette (repaints existing hill on theme switch)
- Per-swing particle colors
- Harvest emoji

Theme is **not persisted** — Tomato is the app's identity and always loads on refresh.

### Share button
One click opens a prefilled social share:
- Mobile: native Web Share API (kakao / Insta / iMessage)
- Desktop: Twitter intent URL
- Text is auto-generated from today's harvest count and focus minutes

### Daily stats
- Today's completed sessions, focus/break minutes, blocks mined
- Harvest row with theme icon
- Auto-resets daily, persisted in `localStorage`

## 🛠️ Tech stack

- **Zero dependencies** — single `index.html`
- **SVG pixel art** — hand-crafted character sprites as `<rect>` grids
- **CSS custom properties** — smooth day/night theme transitions
- **Web Audio API** — 8-bit sound effects generated in code
- **Web Animations API** — GPU-accelerated particles and item drops
- **`requestAnimationFrame`** — 60fps loop with delta-time physics
- **`localStorage`** — settings, session data, and daily stats persistence
- **URL parameters** — preset sharing via `URLSearchParams`
- **Web Share API + Twitter Intent** — native share with fallback
- **Notification API** — browser notifications on session end
- **Open Graph + Twitter Card + JSON-LD** — rich link previews + structured data

## 📚 Further reading

- **[CP-001 — Feature Guide (Korean)](./CP-001-Feature-Guide.md)** — 상세 기능 설명 및 활용 가이드

## 🎵 Music credit

Break-time lo-fi music by [Lofi Midnight Mellow](https://www.youtube.com/channel/UCER23O3Ib5BPT-59YOg3Ang) — instrumental lo-fi beats for focus, study, and coding.

## 📄 License

MIT
