require('dotenv').config();
/**
 * Slogr Mission Control Server v0.1.0
 * Express + Socket.io + SQLite
 */

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const crypto = require("crypto");
const db = require("./src/db");

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const io = new Server(httpServer, { cors: { origin: "*" } });
const agentNS = io.of("/agents");

// Auth middleware
agentNS.use((socket, next) => {
  const key = socket.handshake.auth?.api_key;
  if (!key || !db.keys.validate(key)) return next(new Error("Invalid API key"));
  next();
});

agentNS.on("connection", (socket) => {
  console.log(`[Socket] Agent connected: ${socket.id}`);

  socket.on("agent:register", (data) => {
    db.agents.upsert({ agent_id: data.agent_id, agent_name: data.agent_name || data.agent_id, framework: data.framework || "custom", session_id: data.session_id || null, sdk_version: data.sdk_version || "unknown", socket_id: socket.id, connected_at: new Date().toISOString() });
    db.logs.add({ agent_id: data.agent_id, level: "info", message: "Agent connected", ts: new Date().toISOString() });
    console.log(`[Agent] Registered: ${data.agent_id} (${data.framework})`);
    io.emit("agent:registered", db.agents.getById(data.agent_id));
  });

  socket.on("task:start", (data) => { db.tasks.start(data); io.emit("task:start", data); });
  socket.on("task:finish", (data) => { db.tasks.finish(data); io.emit("task:finish", { ...data, agent: db.agents.getById(data.agent_id) }); });
  socket.on("task:fail", (data) => { db.tasks.fail(data); io.emit("task:fail", data); });
  socket.on("agent:log", (data) => { db.logs.add({ ...data, ts: data.ts || new Date().toISOString() }); io.emit("agent:log", data); });
  socket.on("agent:thinking", (data) => { db.agents.updateStatus(data.agent_id, "thinking", data.thought); io.emit("agent:thinking", data); });
  socket.on("agent:status", (data) => { db.agents.updateStatus(data.agent_id, data.status, data.detail || ""); io.emit("agent:status", data); });
  socket.on("agent:tool_call", (data) => { db.logs.add({ agent_id: data.agent_id, level: "debug", message: `Tool: ${data.tool}`, data, ts: new Date().toISOString() }); io.emit("agent:tool_call", data); });
  socket.on("agent:offline", (data) => { db.agents.setOffline(data.agent_id); io.emit("agent:offline", data); });
  socket.on("command:result", (data) => io.emit("command:result", data));

  socket.on("disconnect", () => {
    const agent = db.agents.getBySocketId(socket.id);
    if (agent) { db.agents.setOffline(agent.agent_id); io.emit("agent:offline", { agent_id: agent.agent_id }); console.log(`[Agent] Disconnected: ${agent.agent_id}`); }
  });
});

io.on("connection", (socket) => {
  console.log(`[Socket] Dashboard connected: ${socket.id}`);
  socket.emit("state:agents", db.agents.getAll());
  socket.emit("state:tasks", db.tasks.getAll(20));
  socket.emit("state:logs", db.logs.getRecent(30));

  socket.on("dashboard:chat", (data) => {
    const ts = new Date().toISOString();
    db.chat.add({ agent_id: data.agent_id, role: "user", message: data.message, sender: data.sender || "dashboard", ts });
    io.emit("chat:message", { ...data, ts });
    const agent = db.agents.getById(data.agent_id);
    if (agent?.socket_id) agentNS.to(agent.socket_id).emit("command", { command: data.message, ...data });
  });
});

// REST API
app.get("/health", (_, res) => res.json({ status: "online", agents: db.agents.getAll().length, uptime: process.uptime() }));
app.get("/api/agents", (_, res) => res.json(db.agents.getAll()));
app.get("/api/agents/:id", (req, res) => { const a = db.agents.getById(req.params.id); return a ? res.json(a) : res.status(404).json({ error: "Not found" }); });
app.get("/api/agents/:id/logs", (req, res) => res.json(db.logs.getByAgent(req.params.id, +(req.query.limit || 100))));
app.get("/api/agents/:id/tasks", (req, res) => res.json(db.tasks.getByAgent(req.params.id, +(req.query.limit || 50))));
app.get("/api/agents/:id/chat", (req, res) => res.json(db.chat.getByAgent(req.params.id, +(req.query.limit || 100))));
app.get("/api/tasks", (req, res) => {
  const { agent_id, status, limit = 50 } = req.query;
  if (agent_id) return res.json(db.tasks.getByAgent(agent_id, +limit));
  if (status) return res.json(db.tasks.getByStatus(status, +limit));
  res.json(db.tasks.getAll(+limit));
});
app.get("/api/stats", (_, res) => res.json({ agents: db.agents.getAll().length, task_stats: db.tasks.getStats() }));
app.post("/api/agents/:id/command", (req, res) => {
  const agent = db.agents.getById(req.params.id);
  if (!agent) return res.status(404).json({ error: "Not found" });
  if (!agent.socket_id) return res.status(503).json({ error: "Agent offline" });
  agentNS.to(agent.socket_id).emit("command", req.body);
  res.json({ sent: true });
});
app.post("/api/keys", (req, res) => {
  const key = `sk-slogr-${crypto.randomBytes(16).toString("hex")}`;
  const key_id = crypto.randomUUID();
  db.keys.create({ key_id, api_key: key, agent_id: req.body.agent_id || null, name: req.body.name || "New Key" });
  res.json({ api_key: key, key_id, created_at: new Date().toISOString() });
});
app.get("/api/keys", (_, res) => res.json(db.keys.getAll()));

setInterval(() => agentNS.emit("ping", { ts: Date.now() }), 30000);

httpServer.listen(PORT, () => {
  console.log(`\n  🚀 Slogr Mission Control v0.1.0`);
  console.log(`  🟢 http://localhost:${PORT}`);
  console.log(`  📦 DB: ${process.env.DB_PATH || "data/slogr.db"}`);
  console.log(`  🔑 Demo key: sk-slogr-demo\n`);
});

// ─── Claude API proxy (so users don't expose their key in frontend) ───────────
app.post("/api/chat", async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "ANTHROPIC_API_KEY not configured. Add it to your .env file." });

  const { messages } = req.body;
  if (!messages) return res.status(400).json({ error: "messages required" });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 300, messages }),
    });
    const data = await response.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "Claude API error: " + e.message });
  }
});
