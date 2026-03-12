# Slogr — AI Agent Mission Control

Watch your AI agents fly starfighters and shoot down tasks. Monitor, debug, and chat with them live.

## Quickstart (5 menit)

### 1. Clone & Install
```bash
git clone https://github.com/yourusername/slogr
cd slogr/slogr-server
npm install
```

### 2. Setup API Key
```bash
cp .env.example .env
```
Buka `.env`, isi API key kamu:
```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxx
```
Dapatkan API key di: https://console.anthropic.com

### 3. Jalankan Server
```bash
npm start
```

### 4. Buka Dashboard
Buka browser: `http://localhost:3000`

Done! 🚀

---

## Connect Agent Python

### Install SDK
```bash
pip install -e ./slogr-sdk
```

### Pakai di agent kamu
```python
from slogr import Slogr

slogr = Slogr(
    api_key="sk-slogr-demo",
    agent_id="my-agent",
    framework="langchain",  # atau crewai, autogen, custom
    server_url="http://localhost:3000",
)
slogr.connect()

# Track task
with slogr.task("Search web for AI news"):
    result = my_agent.run("Latest AI news")

# Handle chat dari dashboard
@slogr.on_command()
def handle(cmd, data):
    return my_agent.run(cmd)
```

Agent langsung muncul di dashboard!

---

## Struktur Project
```
slogr-server/
├── server.js       ← Backend (Express + Socket.io)
├── src/db.js       ← Database layer
├── public/         ← Frontend (taruh index.html di sini)
├── .env            ← API keys (jangan di-commit!)
├── .env.example    ← Template .env
└── data/slogr.db   ← Database (auto-created)

slogr-sdk/          ← Python SDK
```

---

## Self-Hosted
Slogr dirancang untuk self-hosted. Kamu yang kontrol:
- API key kamu sendiri
- Data agent kamu sendiri  
- Server kamu sendiri

Tidak ada data yang dikirim ke server pihak ketiga selain Anthropic API.
