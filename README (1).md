# Slogr — AI Agent Mission Control

> Watch your AI agents pilot starfighters and shoot down tasks. Monitor, debug, and chat with them live.

![Slogr Dashboard](public/preview.png)

## What is Slogr?

Slogr is a real-time monitoring dashboard for AI agents. Connect any agent built with LangChain, CrewAI, AutoGen, or any custom framework — and watch it work through a Star Wars-themed game interface.

- 🚀 **Real-time monitoring** — see every task, tool call, and decision
- 💬 **Chat with agents** — open a direct channel to any running agent
- 🎮 **Game visualization** — agents fly starfighters, tasks are enemies
- 🔌 **Multi-framework** — LangChain, CrewAI, AutoGen, custom
- 🔑 **Self-hosted** — your API key, your data, your server

---

## Quickstart (5 minutes)

### 1. Clone & Install
```bash
git clone https://github.com/slogrbot-stack/slogr
cd slogr
npm install
```

### 2. Configure API Key
```bash
cp .env.example .env
```

Open `.env` and add your Anthropic API key:
```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxx
```

Get your API key at: https://console.anthropic.com

### 3. Start Server
```bash
npm start
```

### 4. Open Dashboard
Open your browser: `http://localhost:3000`

---

## Connect Your Agent (Python)

### Install SDK
```bash
pip install -e ./slogr-sdk
```

### Add to your agent
```python
from slogr import Slogr

slogr = Slogr(
    api_key="sk-slogr-demo",
    agent_id="my-agent",
    framework="langchain",  # langchain | crewai | autogen | custom
    server_url="http://localhost:3000",
)
slogr.connect()

# Track a task
with slogr.task("Research AI trends"):
    result = my_agent.run("What are the latest AI frameworks?")

# Handle commands from dashboard chat
@slogr.on_command()
def handle(cmd, data):
    return my_agent.run(cmd)
```

Your agent appears in the dashboard instantly.

---

## Supported Frameworks

| Framework | Support |
|---|---|
| LangChain | ✅ Native callback handler |
| CrewAI | ✅ Crew wrapper |
| AutoGen | ✅ Agent patcher |
| Custom | ✅ Simple Python SDK |

---

## Self-Hosted

Slogr is designed to be self-hosted. You control:
- Your own API key
- Your own agent data
- Your own server

No data is sent to third-party servers except the Anthropic API.

---

## Tech Stack

- **Backend**: Node.js, Express, Socket.io
- **Frontend**: Vanilla JS, Canvas API
- **Database**: SQLite (in-memory fallback)
- **Agent SDK**: Python

---

## License

MIT — free to use, modify, and distribute.
