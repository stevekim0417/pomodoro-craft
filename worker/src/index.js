// ═══════════════════════════════════════════════════════════════
// Pomodoro Craft — Multiplayer Backend (Cloudflare Worker)
// ───────────────────────────────────────────────────────────────
// Routes:
//   GET  /api/stats       — { onlineNow, todayTotal, feed: [...] }
//   POST /api/session     — body: { minutes, theme, nick? }
//   WS   /api/presence    — WebSocket, counts as +1 online while open
//
// Architecture:
//   All state lives in a single Durable Object (FocusHub) so counts
//   are globally consistent without extra databases. Sessions and the
//   live feed are stored in the DO's SQLite storage so they survive
//   restarts. Presence is held in memory — when the DO hibernates,
//   presence naturally resets (which is the correct behavior, since
//   hibernating = nobody is connected).
//
// Free tier friendly:
//   - Durable Objects on Workers Free (5 GB limit)
//   - WebSocket Hibernation API → no compute charges while idle
//   - SQLite storage billing starts January 2026
// ═══════════════════════════════════════════════════════════════

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function textResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/plain', ...CORS_HEADERS },
  });
}

// ═══════════════════════════════════════════════════════════════
// Worker entry — routes requests to the single FocusHub instance
// ═══════════════════════════════════════════════════════════════
export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    // Root / health check
    if (url.pathname === '/' || url.pathname === '/health') {
      return textResponse('Pomodoro Craft API is running 🍅');
    }

    // Route everything under /api to the Durable Object
    if (url.pathname.startsWith('/api/')) {
      // Single global instance — all users share the same hub.
      const id = env.FOCUS_HUB.idFromName('global');
      const stub = env.FOCUS_HUB.get(id);
      return stub.fetch(request);
    }

    return textResponse('Not found', 404);
  },
};

// ═══════════════════════════════════════════════════════════════
// FocusHub — Durable Object holding presence + global stats
// ═══════════════════════════════════════════════════════════════
export class FocusHub {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sql = state.storage.sql;

    // In-memory presence. Hibernation-aware: refilled from accepted
    // WebSockets after wake-up via getWebSockets().
    this.initSchema();
  }

  initSchema() {
    // sessions: one row per completed focus session (append-only)
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        minutes INTEGER NOT NULL,
        theme TEXT NOT NULL,
        nick TEXT,
        created_at INTEGER NOT NULL
      )
    `);
    // daily_totals: cached per-day sums for /stats speed
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS daily_totals (
        date TEXT PRIMARY KEY,
        sessions INTEGER NOT NULL DEFAULT 0,
        minutes INTEGER NOT NULL DEFAULT 0
      )
    `);
    // lifetime_totals: single-row counters (id=1)
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS lifetime_totals (
        id INTEGER PRIMARY KEY,
        sessions INTEGER NOT NULL DEFAULT 0,
        minutes INTEGER NOT NULL DEFAULT 0
      )
    `);
    this.sql.exec(`INSERT OR IGNORE INTO lifetime_totals (id) VALUES (1)`);
  }

  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/api/presence') {
      return this.handlePresence(request);
    }
    if (path === '/api/stats' && request.method === 'GET') {
      return this.handleStats();
    }
    if (path === '/api/session' && request.method === 'POST') {
      return this.handleSession(request);
    }
    return json({ error: 'not found' }, 404);
  }

  // ─── WebSocket presence — full per-user state tracking ────────
  // Each connected user has attached state on their WebSocket:
  //   { id, nick, country, theme, timerMode, remainingSec, totalSec, updatedAt }
  // Stored via ws.serializeAttachment() so it survives hibernation.
  handlePresence(request) {
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader !== 'websocket') {
      return json({ error: 'expected websocket upgrade' }, 426);
    }

    // Cloudflare automatically provides the client's ISO-3166-1 alpha-2
    // country code in request.cf.country (e.g. "KR", "US"). Free,
    // accurate, no extra services needed. Fallback "ZZ" = unknown.
    const country = (request.cf && request.cf.country) || 'ZZ';

    const { 0: client, 1: server } = new WebSocketPair();
    this.state.acceptWebSocket(server);

    // Assign a unique id so clients can distinguish users with same nick.
    const id = crypto.randomUUID().slice(0, 8);
    server.serializeAttachment({
      id,
      nick: 'guest',
      country,
      theme: 'tomato',
      timerMode: 'idle',
      remainingSec: 0,
      totalSec: 0,
      updatedAt: Date.now(),
    });

    // Send welcome with current user list. The hello message will
    // overwrite our placeholder attachment once received.
    server.send(JSON.stringify({
      type: 'welcome',
      yourId: id,
      users: this.collectUsers(),
    }));
    // Do NOT broadcast yet — wait for the hello so we don't show
    // "guest" temporarily. Other users see the new user when they
    // identify themselves.

    return new Response(null, { status: 101, webSocket: client });
  }

  // Hibernation-aware message handler
  webSocketMessage(ws, message) {
    let msg;
    try {
      msg = typeof message === 'string' ? JSON.parse(message) : null;
    } catch (e) { return; }
    if (!msg || typeof msg !== 'object') return;

    const attachment = ws.deserializeAttachment() || {};

    if (msg.type === 'ping') {
      try { ws.send(JSON.stringify({ type: 'pong' })); } catch (e) {}
      return;
    }

    if (msg.type === 'hello') {
      // Identification — update nick + theme, then broadcast presence
      const updated = {
        ...attachment,
        nick: sanitizeNick(msg.nick) || 'guest',
        theme: sanitizeTheme(msg.theme),
        updatedAt: Date.now(),
      };
      ws.serializeAttachment(updated);
      this.broadcastUsers();
      return;
    }

    if (msg.type === 'state') {
      // Timer state update
      const timerMode = ['idle', 'focus', 'break', 'longbreak'].includes(msg.timerMode)
        ? msg.timerMode : 'idle';
      const remaining = Math.max(0, Math.min(10800, parseInt(msg.remainingSec, 10) || 0));
      const total = Math.max(0, Math.min(10800, parseInt(msg.totalSec, 10) || 0));
      // Only accept theme update if it's valid — keeps it in sync with client theme
      const theme = msg.theme ? sanitizeTheme(msg.theme) : attachment.theme;

      const updated = {
        ...attachment,
        timerMode,
        remainingSec: remaining,
        totalSec: total,
        theme,
        updatedAt: Date.now(),
      };
      ws.serializeAttachment(updated);
      this.broadcastUsers();
      return;
    }
  }

  webSocketClose(ws, code, reason, wasClean) {
    try { ws.close(code, 'closing'); } catch (e) { /* already closed */ }
    // Broadcast updated user list to remaining clients
    this.broadcastUsers();
  }

  webSocketError(ws, error) {
    try { ws.close(1011, 'error'); } catch (e) { /* ignore */ }
    this.broadcastUsers();
  }

  onlineCount() {
    return this.state.getWebSockets().length;
  }

  collectUsers() {
    const users = [];
    for (const ws of this.state.getWebSockets()) {
      const a = ws.deserializeAttachment();
      if (!a) continue;
      users.push({
        id: a.id,
        nick: a.nick,
        country: a.country || 'ZZ',
        theme: a.theme,
        timerMode: a.timerMode,
        remainingSec: a.remainingSec,
        totalSec: a.totalSec,
      });
    }
    return users;
  }

  broadcastUsers() {
    const users = this.collectUsers();
    const payload = JSON.stringify({ type: 'users', users });
    for (const ws of this.state.getWebSockets()) {
      try { ws.send(payload); } catch (e) { /* dead socket */ }
    }
  }

  broadcast(msg) {
    const payload = JSON.stringify(msg);
    for (const ws of this.state.getWebSockets()) {
      try { ws.send(payload); } catch (e) { /* dead socket */ }
    }
  }

  // ─── GET /api/stats ────────────────────────────────────────────
  handleStats() {
    const today = todayKey();

    // daily total
    const dayRow = this.sql.exec(
      `SELECT sessions, minutes FROM daily_totals WHERE date = ?`,
      today
    ).one() || { sessions: 0, minutes: 0 };

    // lifetime total
    const lifeRow = this.sql.exec(
      `SELECT sessions, minutes FROM lifetime_totals WHERE id = 1`
    ).one() || { sessions: 0, minutes: 0 };

    // live feed — last 10 completions
    const feedRows = [...this.sql.exec(
      `SELECT minutes, theme, nick, created_at FROM sessions
       ORDER BY id DESC LIMIT 10`
    )];

    return json({
      onlineNow: this.onlineCount(),
      users: this.collectUsers(),
      today: {
        sessions: dayRow.sessions,
        minutes: dayRow.minutes,
      },
      lifetime: {
        sessions: lifeRow.sessions,
        minutes: lifeRow.minutes,
      },
      feed: feedRows.map(r => ({
        minutes: r.minutes,
        theme: r.theme,
        nick: r.nick || 'someone',
        at: r.created_at,
      })),
    });
  }

  // ─── POST /api/session ─────────────────────────────────────────
  async handleSession(request) {
    let body;
    try { body = await request.json(); }
    catch (e) { return json({ error: 'invalid json' }, 400); }

    const minutes = Math.max(1, Math.min(180, parseInt(body.minutes, 10) || 0));
    const theme = sanitizeTheme(body.theme);
    const nick = sanitizeNick(body.nick);

    if (minutes === 0) return json({ error: 'minutes required' }, 400);

    const now = Date.now();
    const today = todayKey();

    // Insert the session row (append-only log)
    this.sql.exec(
      `INSERT INTO sessions (minutes, theme, nick, created_at) VALUES (?, ?, ?, ?)`,
      minutes, theme, nick, now
    );

    // Update daily total (upsert)
    this.sql.exec(
      `INSERT INTO daily_totals (date, sessions, minutes)
       VALUES (?, 1, ?)
       ON CONFLICT(date) DO UPDATE SET
         sessions = sessions + 1,
         minutes = minutes + excluded.minutes`,
      today, minutes
    );

    // Update lifetime total
    this.sql.exec(
      `UPDATE lifetime_totals
       SET sessions = sessions + 1, minutes = minutes + ?
       WHERE id = 1`,
      minutes
    );

    // Trim old sessions — keep only last 1000 to bound storage
    this.sql.exec(
      `DELETE FROM sessions
       WHERE id IN (
         SELECT id FROM sessions ORDER BY id DESC LIMIT -1 OFFSET 1000
       )`
    );

    // Broadcast the new session to everyone connected live
    this.broadcast({
      type: 'session',
      session: { minutes, theme, nick, at: now },
    });

    return json({ ok: true });
  }
}

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════
function todayKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

const VALID_THEMES = new Set(['tomato', 'diamond', 'emerald', 'gold', 'ruby']);
function sanitizeTheme(t) {
  return VALID_THEMES.has(t) ? t : 'tomato';
}

function sanitizeNick(n) {
  if (typeof n !== 'string') return null;
  // Strip anything weird, cap length
  const clean = n.trim().replace(/[^\w가-힣\s.-]/g, '').slice(0, 20);
  return clean || null;
}
