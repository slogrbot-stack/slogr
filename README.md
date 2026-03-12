# SLOGR — AI Agent Mission Control

> Real-time monitoring dashboard for AI agents. Watch them fly, debug them live. Self-hosted & open source.

![Slogr Banner](https://raw.githubusercontent.com/slogrbot-stack/slogr/main/assets/banner.png)

[![MIT License](https://img.shields.io/badge/license-MIT-00FF41?style=flat-square)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-00FF41?style=flat-square)](https://nodejs.org)
[![Python](https://img.shields.io/badge/python-%3E%3D3.8-00FF41?style=flat-square)](https://python.org)
[![Powered by Claude](https://img.shields.io/badge/powered%20by-Claude%20AI-00FF41?style=flat-square)](https://anthropic.com)
[![Twitter](https://img.shields.io/badge/twitter-@slogrwork-00FF41?style=flat-square)](https://x.com/slogrwork)

---

## What is Slogr?

Slogr is a self-hosted, open source command center for AI agents.

Most agent frameworks give you print statements. Slogr gives you a cockpit.

- **Real-time monitoring** — every task, tool call, and reasoning step appears on the dashboard within milliseconds
- **Game visualization** — agents appear as starfighters, tasks as enemies. Watch your fleet fight in real-time
- **Direct agent chat** — click any agent, send commands, get replies powered by Claude
- **Shield health system** — visual reliability score per agent, drops on failures
- **Python SDK** — connect any agent in 5 lines of code
- **Self-hosted** — your data, your server, your API key. We see nothing

---

## Quick Start

**Requirements:** Node.js 18+, Python 3.8+, Anthropic API key

```bash
# 1. Clone and install
git clone https://github.com/slogrbot-stack/slogr
cd slogr
npm install

# 2. Configure
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# 3. Start
npm start
# → Dashboard live at http://localhost:3000
```

```python
# 4. Connect your agent (Python)
pip install -e ./slogr-sdk

from slogr import Slogr

s = Slogr(
    agent_id="my-agent",
    framework="langchain",       # langchain | crewai | autogen | custom
    server_url="http://localhost:3000"
)
s.connect()
s.log("Agent online. Ready for orders.")
```

Open `http://localhost:3000` — your agent appears in the dashboard as a starfighter. 🚀

---

## Framework Integrations

### LangChain

```python
from slogr import Slogr
from slogr.integrations import SlogrLangChain

slogr = Slogr(agent_id="lc-agent", framework="langchain", ...)
slogr.connect()

handler = SlogrLangChain(slogr)
chain = LLMChain(llm=llm, prompt=prompt, callbacks=[handler])
result = chain.run("Analyze Q4 report")
# All chain events auto-tracked in dashboard
```

### CrewAI

```python
from slogr.integrations import SlogrCrewAI

crew = Crew(agents=[...], tasks=[...])
result = SlogrCrewAI(slogr).run(crew)
```

### AutoGen

```python
from slogr.integrations import SlogrAutoGen

SlogrAutoGen(slogr).patch([assistant, user_proxy])
user_proxy.initiate_chat(assistant, message="Write a script...")
```

### Custom Framework

```python
# Manual instrumentation — works with anything
task_id = slogr.start_task("Research competitors")
try:
    slogr.thinking("Analyzing market data...")
    slogr.tool_call("web_search", inputs={"query": "AI tools 2026"})
    result = my_agent.run(...)
    slogr.finish_task(task_id, result=str(result))
except Exception as e:
    slogr.fail_task(task_id, error=str(e))
```

---

## SDK Reference

| Method | Description |
|--------|-------------|
| `slogr.connect()` | Register agent in dashboard |
| `slogr.start_task(name)` | Task begins — enemy spawns in game |
| `slogr.finish_task(id)` | Task done — enemy explodes |
| `slogr.fail_task(id, error)` | Task failed — shield decreases |
| `slogr.log(message)` | Send log message to dashboard |
| `slogr.thinking(text)` | Show "TRANSMITTING..." on ship |
| `slogr.tool_call(name, inputs)` | Log external tool invocation |
| `slogr.update_status(status)` | Update status badge in sidebar |
| `slogr.disconnect()` | Agent goes offline |

**Receive commands from dashboard:**

```python
@slogr.on_command()
def handle(command, data):
    result = my_agent.run(command)
    return result
```

---

## REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health check |
| GET | `/api/agents` | List all agents |
| GET | `/api/agents/:id` | Agent details |
| GET | `/api/agents/:id/logs` | Agent log history |
| GET | `/api/agents/:id/tasks` | Agent task history |
| GET | `/api/tasks` | All tasks |
| GET | `/api/stats` | Fleet statistics |
| POST | `/api/agents/:id/command` | Send command to agent |
| POST | `/api/chat` | Anthropic API proxy |

---

## Environment Variables

```bash
# .env
ANTHROPIC_API_KEY=sk-ant-xxxx   # Required for agent chat
PORT=3000                        # Server port (default: 3000)
```

---

## Powered by Claude

Slogr agent chat is powered by [Anthropic's Claude API](https://anthropic.com).

Every agent in your fleet responds with real Claude intelligence — not scripted, not fake. Your API key is stored in `.env` on your own server and **never exposed to the browser**.

> **Coming in v1.0.0 ($SLOG):** Hold $SLOG token → get a free Slogr API key powered by Claude. No Anthropic account needed. Connect wallet, hold $SLOG, your fleet flies.

---

## Roadmap

| Version | Theme | Status |
|---------|-------|--------|
| v0.1.0 | Foundation — Mission Control Online | ✅ Live |
| v0.2.0 | Persistence — Memory for the Fleet | ⚡ Building |
| v0.3.0 | Auth & Teams — Secure the Base | 📋 Planned |
| v0.4.0 | Plugins — Expand the Arsenal | 📋 Planned |
| v1.0.0 | Galaxy-Scale + $SLOG Token | 🌌 The Dream |

Full roadmap: [slogr.xyz](https://slogr.xyz) · [Roadmap PDF](https://slogr.xyz/roadmap.pdf) · [Whitepaper](https://slogr.xyz/whitepaper)

---

## Project Structure

```
slogr/
├── server.js          # Main Node.js backend
├── package.json       # Dependencies
├── .env.example       # Environment template
├── slogr-sdk/         # Python SDK
│   ├── slogr/
│   │   ├── __init__.py
│   │   ├── client.py
│   │   └── integrations/
│   │       ├── langchain.py
│   │       ├── crewai.py
│   │       └── autogen.py
│   └── setup.py
├── public/
│   └── index.html     # Dashboard frontend
└── CHANGELOG.md
```

---

## Socket Events

**Agent → Server**

| Event | Description |
|-------|-------------|
| `agent:register` | Agent comes online |
| `task:start` | Task begins |
| `task:finish` | Task completed |
| `task:fail` | Task failed |
| `agent:log` | Log message |
| `agent:thinking` | Reasoning in progress |
| `agent:tool_call` | External tool invoked |
| `agent:status` | Status update |
| `agent:offline` | Agent disconnects |

**Server → Dashboard**

| Event | Description |
|-------|-------------|
| `state:agents` | Full agent list on connect |
| `agent:registered` | New agent came online |
| `task:start/finish/fail` | Task state changes |
| `agent:log/thinking` | Log + thinking events |
| `command:result` | Agent reply to dashboard chat |

---

## Deploy to Production

**Recommended: VPS + nginx + SSL**

```bash
# On your server
git clone https://github.com/slogrbot-stack/slogr
cd slogr
npm install
cp .env.example .env
# Edit .env with your API key

# Run with PM2
npm install -g pm2
pm2 start server.js --name slogr
pm2 startup && pm2 save
```

**nginx config:**

```nginx
server {
    listen 80;
    server_name your-domain.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Then add SSL with `certbot --nginx -d your-domain.com`.

---

## Contributing

Pull requests welcome. For major changes, open an issue first.

1. Fork the repo
2. Create your branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## Community

- 🌐 Website: [slogr.xyz](https://slogr.xyz)
- 🎮 Live Demo: [slogr.xyz/demo](https://slogr.xyz/demo)
- 📡 Docs: [slogr.xyz/docs](https://slogr.xyz/docs)
- 📄 Whitepaper: [slogr.xyz/whitepaper](https://slogr.xyz/whitepaper)
- 🐦 Twitter: [@slogrwork](https://x.com/slogrwork)
- 💬 Telegram: [t.me/slogrAgent](https://t.me/slogrAgent)

---

## License

MIT — do whatever you want. Just don't blame us if your agents take over the galaxy.

---

*May the code be with you. 🚀*
