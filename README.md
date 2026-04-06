# Pomodoro Craft

A **Minecraft-themed Pomodoro Timer** with pixel art animations, built as a single HTML file with vanilla JavaScript.

Mine blocks during focus time. Rest by the campfire during breaks. No dependencies, no build tools — just open and focus.

## Try It Now

**https://stevekim0417.github.io/pomodoro-craft/**

## Music

Break-time lo-fi music by [Steve's Channel](https://www.youtube.com/channel/UCER23O3Ib5BPT-59YOg3Ang) on YouTube.

## Features

### Focus Mode (Day)
- Steve mines diamond ore with a swinging pickaxe animation
- Blocks crack through 4 stages, then shatter with particle effects
- Diamond items drop and bounce (Minecraft-style item physics)
- Steve jumps randomly and celebrates on block breaks
- Creeper occasionally peeks from behind a tree
- Blocks mined counter tracks your productivity

### Break Mode (Night)
- Night sky with twinkling stars and moon
- Steve rests by a flickering campfire
- Wolf companion with tail-wagging animation
- Floating fireflies and rising embers
- ZZZ sleep bubbles and stretch animations
- Chicken walks across the scene
- Lo-fi music auto-plays during breaks

### Timer
- Configurable focus (5–60 min) and break (1–30 min) durations
- Block-style progress bar
- Session tracking with diamond hotbar (8 sessions per cycle)
- Keyboard shortcuts: `Space` (start/pause), `S` (skip), `R` (reset)

### Settings (collapsible drawer)
- **SOUND ON/OFF** — Toggle button click SFX and timer completion chimes
- **AUTO BREAK** — Auto-start break timer after focus ends
- **AUTO FOCUS** — Auto-start focus timer after break ends
- **LOFI BREAK** — Play lo-fi music during break time

### Daily Stats
- Today's completed sessions, focus/break minutes, and blocks mined
- Auto-resets daily, persisted in localStorage

## Tech Stack

- **Zero dependencies** — Single `index.html` file
- **SVG pixel art** — Hand-crafted character sprites rendered as `<rect>` grids
- **CSS Custom Properties** — Smooth day/night theme transitions
- **Web Audio API** — 8-bit sound effects generated in code
- **Web Animations API** — GPU-accelerated particles and item drops
- **requestAnimationFrame** — 60fps animation loop with delta-time physics
- **localStorage** — Settings, session data, and daily stats persistence

## Usage

```bash
# Option 1: Just open the file
open index.html

# Option 2: Serve locally
npx serve .
```

Or visit the [GitHub Pages deployment](#) (if enabled).

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Start / Pause / Resume |
| `S` | Skip to next mode |
| `R` | Reset timer |

## Screenshots

### Focus Mode
Steve mines diamond ore blocks with full pickaxe swing animation.

### Break Mode
Night scene with campfire, wolf companion, fireflies, and lo-fi music.

## License

MIT
