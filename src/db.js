/**
 * Slogr Database Layer
 * Uses 'database.js' — pure JS SQLite, no native compile needed
 */

const path = require("path");
const fs = require("fs");

const DB_DIR = path.join(__dirname, "../data");
fs.mkdirSync(DB_DIR, { recursive: true });
const DB_PATH = process.env.DB_PATH || path.join(DB_DIR, "slogr.db");

let db;

try {
  // Try better-sqlite3 first (faster, if available)
  const Database = require("better-sqlite3");
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  console.log("[DB] Using better-sqlite3");
} catch (e) {
  // Fallback: pure JS in-memory store (no install needed)
  console.log("[DB] better-sqlite3 unavailable, using in-memory store");
  db = null;
}

// ─── In-memory fallback store ─────────────────────────────────────────────────
const mem = {
  agents: new Map(),
  tasks: new Map(),
  logs: new Map(),      // agent_id -> []
  chat: new Map(),      // agent_id -> []
  keys: new Map([["sk-slogr-demo", { key_id: "demo", api_key: "sk-slogr-demo", name: "Demo Key", active: 1 }]]),
};

// ─── Schema (only runs if better-sqlite3 available) ───────────────────────────
if (db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      agent_id TEXT PRIMARY KEY, agent_name TEXT, framework TEXT DEFAULT 'custom',
      session_id TEXT, sdk_version TEXT, socket_id TEXT, status TEXT DEFAULT 'idle',
      status_detail TEXT DEFAULT '', shield INTEGER DEFAULT 100,
      tasks_completed INTEGER DEFAULT 0, tasks_failed INTEGER DEFAULT 0,
      total_tokens INTEGER DEFAULT 0, connected_at TEXT, last_seen TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS tasks (
      task_id TEXT PRIMARY KEY, agent_id TEXT, name TEXT, status TEXT DEFAULT 'running',
      metadata TEXT DEFAULT '{}', result_preview TEXT, tokens_used INTEGER DEFAULT 0,
      duration_s REAL, error TEXT, started_at TEXT, finished_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, agent_id TEXT, level TEXT DEFAULT 'info',
      message TEXT, data TEXT DEFAULT '{}', ts TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT, agent_id TEXT, role TEXT,
      message TEXT, sender TEXT DEFAULT 'dashboard', ts TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS api_keys (
      key_id TEXT PRIMARY KEY, api_key TEXT UNIQUE, agent_id TEXT, name TEXT,
      active INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')), last_used TEXT
    );
    INSERT OR IGNORE INTO api_keys (key_id, api_key, name) VALUES ('demo','sk-slogr-demo','Demo Key');
    CREATE INDEX IF NOT EXISTS idx_tasks_agent ON tasks(agent_id);
    CREATE INDEX IF NOT EXISTS idx_logs_agent ON logs(agent_id);
    CREATE INDEX IF NOT EXISTS idx_chat_agent ON chat_messages(agent_id);
  `);
}

// ─── Unified API — works with both SQLite and in-memory ──────────────────────

function now() { return new Date().toISOString(); }

function addLog(agent_id, level, message, data) {
  if (db) {
    db.prepare("INSERT INTO logs (agent_id,level,message,data,ts) VALUES (?,?,?,?,?)")
      .run(agent_id, level, message, JSON.stringify(data||{}), now());
    // Prune
    db.prepare("DELETE FROM logs WHERE agent_id=? AND id NOT IN (SELECT id FROM logs WHERE agent_id=? ORDER BY id DESC LIMIT 500)")
      .run(agent_id, agent_id);
  } else {
    if (!mem.logs.has(agent_id)) mem.logs.set(agent_id, []);
    const arr = mem.logs.get(agent_id);
    arr.push({ agent_id, level, message, data: data||{}, ts: now() });
    if (arr.length > 500) arr.shift();
  }
}

module.exports = {
  agents: {
    upsert(data) {
      if (db) {
        db.prepare(`INSERT INTO agents (agent_id,agent_name,framework,session_id,sdk_version,socket_id,status,connected_at,last_seen)
          VALUES (@agent_id,@agent_name,@framework,@session_id,@sdk_version,@socket_id,'running',@connected_at,@connected_at)
          ON CONFLICT(agent_id) DO UPDATE SET agent_name=excluded.agent_name,framework=excluded.framework,
          session_id=excluded.session_id,sdk_version=excluded.sdk_version,socket_id=excluded.socket_id,
          status='running',connected_at=excluded.connected_at,last_seen=excluded.last_seen`).run(data);
      } else {
        const existing = mem.agents.get(data.agent_id) || {};
        mem.agents.set(data.agent_id, { ...existing, ...data, status: "running", last_seen: now() });
      }
    },
    updateStatus(agent_id, status, detail = "") {
      if (db) db.prepare("UPDATE agents SET status=?,status_detail=?,last_seen=? WHERE agent_id=?").run(status, detail, now(), agent_id);
      else { const a = mem.agents.get(agent_id); if (a) { a.status = status; a.status_detail = detail; a.last_seen = now(); } }
    },
    setOffline(agent_id) {
      if (db) db.prepare("UPDATE agents SET status='idle',socket_id=NULL,last_seen=? WHERE agent_id=?").run(now(), agent_id);
      else { const a = mem.agents.get(agent_id); if (a) { a.status = "idle"; a.socket_id = null; a.last_seen = now(); } }
    },
    incrementTasks(agent_id, tokens = 0) {
      if (db) db.prepare("UPDATE agents SET tasks_completed=tasks_completed+1,total_tokens=total_tokens+?,last_seen=? WHERE agent_id=?").run(tokens, now(), agent_id);
      else { const a = mem.agents.get(agent_id); if (a) { a.tasks_completed = (a.tasks_completed||0)+1; a.total_tokens = (a.total_tokens||0)+tokens; } }
    },
    incrementFailed(agent_id) {
      if (db) db.prepare("UPDATE agents SET tasks_failed=tasks_failed+1,shield=MAX(0,shield-10),last_seen=? WHERE agent_id=?").run(now(), agent_id);
      else { const a = mem.agents.get(agent_id); if (a) { a.tasks_failed = (a.tasks_failed||0)+1; a.shield = Math.max(0,(a.shield||100)-10); } }
    },
    getAll() {
      if (db) return db.prepare("SELECT * FROM agents ORDER BY last_seen DESC").all();
      return Array.from(mem.agents.values()).sort((a,b) => (b.last_seen||"") > (a.last_seen||"") ? 1 : -1);
    },
    getById(id) {
      if (db) return db.prepare("SELECT * FROM agents WHERE agent_id=?").get(id);
      return mem.agents.get(id) || null;
    },
    getBySocketId(socketId) {
      if (db) return db.prepare("SELECT * FROM agents WHERE socket_id=?").get(socketId);
      return Array.from(mem.agents.values()).find(a => a.socket_id === socketId) || null;
    },
  },

  tasks: {
    start(data) {
      if (db) db.prepare("INSERT OR IGNORE INTO tasks (task_id,agent_id,name,status,metadata,started_at) VALUES (?,?,?,?,?,?)")
        .run(data.task_id, data.agent_id, data.name, "running", JSON.stringify(data.metadata||{}), data.started_at||now());
      else mem.tasks.set(data.task_id, { ...data, status: "running", started_at: data.started_at||now() });
    },
    finish(data) {
      if (db) db.prepare("UPDATE tasks SET status='completed',result_preview=?,tokens_used=?,duration_s=?,finished_at=? WHERE task_id=?")
        .run(data.result_preview||null, data.tokens_used||0, data.duration_s||null, data.finished_at||now(), data.task_id);
      else { const t = mem.tasks.get(data.task_id); if (t) Object.assign(t, data, { status: "completed" }); }
      this._incr(data);
    },
    fail(data) {
      if (db) db.prepare("UPDATE tasks SET status='failed',error=?,finished_at=? WHERE task_id=?").run(data.error||"Unknown", now(), data.task_id);
      else { const t = mem.tasks.get(data.task_id); if (t) Object.assign(t, { status: "failed", error: data.error }); }
    },
    _incr(data) {
      if (db) db.prepare("UPDATE agents SET tasks_completed=tasks_completed+1,total_tokens=total_tokens+?,last_seen=? WHERE agent_id=?")
        .run(data.tokens_used||0, now(), data.agent_id);
      else { const a = mem.agents.get(data.agent_id); if (a) { a.tasks_completed=(a.tasks_completed||0)+1; a.total_tokens=(a.total_tokens||0)+(data.tokens_used||0); } }
    },
    getAll(limit = 50) {
      if (db) return db.prepare("SELECT * FROM tasks ORDER BY started_at DESC LIMIT ?").all(limit);
      return Array.from(mem.tasks.values()).slice(-limit).reverse();
    },
    getByAgent(agent_id, limit = 50) {
      if (db) return db.prepare("SELECT * FROM tasks WHERE agent_id=? ORDER BY started_at DESC LIMIT ?").all(agent_id, limit);
      return Array.from(mem.tasks.values()).filter(t=>t.agent_id===agent_id).slice(-limit).reverse();
    },
    getByStatus(status, limit = 50) {
      if (db) return db.prepare("SELECT * FROM tasks WHERE status=? ORDER BY started_at DESC LIMIT ?").all(status, limit);
      return Array.from(mem.tasks.values()).filter(t=>t.status===status).slice(-limit);
    },
    getStats() {
      if (db) return db.prepare("SELECT agent_id,COUNT(*) as total,SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed,SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as failed,SUM(tokens_used) as total_tokens FROM tasks GROUP BY agent_id").all();
      const stats = {};
      mem.tasks.forEach(t => {
        if (!stats[t.agent_id]) stats[t.agent_id] = { agent_id: t.agent_id, total:0, completed:0, failed:0, total_tokens:0 };
        stats[t.agent_id].total++;
        if (t.status==="completed") stats[t.agent_id].completed++;
        if (t.status==="failed") stats[t.agent_id].failed++;
        stats[t.agent_id].total_tokens += t.tokens_used||0;
      });
      return Object.values(stats);
    },
  },

  logs: {
    add(data) { addLog(data.agent_id, data.level||"info", data.message, data.data); },
    getByAgent(agent_id, limit = 100) {
      if (db) return db.prepare("SELECT * FROM logs WHERE agent_id=? ORDER BY ts DESC LIMIT ?").all(agent_id, limit);
      return (mem.logs.get(agent_id)||[]).slice(-limit).reverse();
    },
    getRecent(limit = 50) {
      if (db) return db.prepare("SELECT * FROM logs ORDER BY ts DESC LIMIT ?").all(limit);
      const all = [];
      mem.logs.forEach(arr => all.push(...arr));
      return all.sort((a,b)=>b.ts>a.ts?1:-1).slice(0,limit);
    },
  },

  chat: {
    add(data) {
      if (db) db.prepare("INSERT INTO chat_messages (agent_id,role,message,sender,ts) VALUES (?,?,?,?,?)").run(data.agent_id, data.role, data.message, data.sender||"dashboard", data.ts||now());
      else {
        if (!mem.chat.has(data.agent_id)) mem.chat.set(data.agent_id, []);
        mem.chat.get(data.agent_id).push({ ...data, ts: data.ts||now() });
      }
    },
    getByAgent(agent_id, limit = 100) {
      if (db) return db.prepare("SELECT * FROM chat_messages WHERE agent_id=? ORDER BY ts ASC LIMIT ?").all(agent_id, limit);
      return (mem.chat.get(agent_id)||[]).slice(-limit);
    },
  },

  keys: {
    create(data) {
      if (db) db.prepare("INSERT INTO api_keys (key_id,api_key,agent_id,name) VALUES (?,?,?,?)").run(data.key_id, data.api_key, data.agent_id||null, data.name||"Key");
      else mem.keys.set(data.api_key, { ...data, active: 1, created_at: now() });
    },
    validate(key) {
      if (db) {
        const row = db.prepare("SELECT * FROM api_keys WHERE api_key=? AND active=1").get(key);
        if (row) db.prepare("UPDATE api_keys SET last_used=? WHERE api_key=?").run(now(), key);
        return row;
      }
      return mem.keys.get(key) || null;
    },
    getAll() {
      if (db) return db.prepare("SELECT key_id,agent_id,name,active,created_at,last_used FROM api_keys").all();
      return Array.from(mem.keys.values());
    },
  },
};

console.log(`[DB] Ready — ${db ? `SQLite: ${DB_PATH}` : "In-memory mode"}`);
