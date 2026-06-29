# haaitzzabot <img src="https://github.com/bluecore7/haaitzzabot/blob/main/gitassets/icon.png" height="32">

A utility Slack bot that fetches unread messages from any channel and grinds them through Gemini — controlled entirely using CLI-style flags.

<img src="https://github.com/bluecore7/haaitzzabot/blob/main/gitassets/chat.png" width="700"/>

## Try It

**[Add haaitzzabot to your Slack workspace](https://slack.com/oauth/v2/authorize?client_id=2210535565.11300283767236&scope=channels:join,app_mentions:read,channels:history,channels:read,chat:write,commands,groups:history,groups:read,im:read,mpim:read&user_scope=)**
## Commands

| Command | What it does |
|---------|-------------|
| `/haaitzzabot-ping` | Health check. Returns latency in milliseconds. |
| `/haaitzzabot-help` | Prints the full flag reference. |
| `/haaitzzabot-summarize` | Fetches channel history and pipes it through AI. |

### `/haaitzzabot-summarize` flags

Every flag is optional. Defaults are sane — override only what you need.

| Flag | Default | What it does |
|------|---------|-------------|
| `-time <hours>` | `24` | How many hours back to look. |
| `-model <name>` | `gemini-2.0-flash-lite` | Any Gemini model, or OpenAI models like `gpt-4o`. |
| `-prompt <text>` | `"Summarize this:"` | Custom instruction to steer the AI output. |
| `-channel <name>` | Current channel | Target a different public channel by name. |
| `-join yes` | off | Let the bot join the target channel if it isn't a member. |

### Example

```
/haaitzzabot-summarize -time 5 -channel general -model gpt-4o -prompt "only the technical discussions, dump everything else" -join yes
```

## Run It Locally

**Prerequisites:**
- Node.js v20+
- A [Slack App](https://api.slack.com/apps) with Socket Mode enabled
- A [Gemini API key](https://aistudio.google.com/apikey)
- An [OpenAI API key](https://platform.openai.com/api-keys) (optional, for GPT models)

**1. Clone and install:**

```bash
git clone https://github.com/YOUR_USERNAME/haaitzzabot.git
cd haaitzzabot
npm install
```

**2. Create a `.env` file:**

```env
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_APP_TOKEN=xapp-your-app-token
SLACK_CLIENT_ID=your-client-id
SLACK_CLIENT_SECRET=your-client-secret
GEMINI_API_KEY=your-gemini-api-key
OPENAI_API_KEY=your-openai-api-key
```

**3. Required Slack Bot Scopes:**

| Scope | Why |
|-------|-----|
| `commands` | Register slash commands |
| `chat:write` | Send messages |
| `channels:history` | Read message history |
| `channels:read` | Channel lookup for `-channel` flag |
| `channels:join` | Auto-join via `-join yes` |
| `groups:history` | Read private channel history |

**4. Start:**

```bash
node index.js
```


## Tech Stack

| Layer | Tool |
|-------|------|
| Runtime | Node.js |
| Slack SDK | `@slack/bolt` (Socket Mode) |
| HTTP Client | `axios` |
| AI — Google | Gemini REST API |
| AI — OpenAI | OpenAI Chat Completions API |


