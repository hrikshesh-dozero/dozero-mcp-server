# DoZero MCP Server

An MCP (Model Context Protocol) server that lets Claude Desktop create AI companies and agents in [DoZero](https://dozero.dev) — directly from your chat.

```
You: "Create a fitness startup with 3 AI agents"
     ↓
Claude → MCP Server → DoZero Backend → Company + Agents created ✅
```

## Quick Start

### 1. Install

```bash
npm install -g dozero-mcp-server
```

Or clone and install locally:

```bash
git clone https://github.com/your-org/dozero-mcp-server.git
cd dozero-mcp-server
npm install
```

### 2. Get your API key

1. Go to [dozero.dev](https://dozero.dev)
2. Navigate to **Settings → API Keys**
3. Click **Generate API Key**
4. Copy the key (starts with `dk_`)

### 3. Add to Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "dozero": {
      "command": "npx",
      "args": ["dozero-mcp-server"],
      "env": {
        "DOZERO_CONVEX_URL": "https://tacit-akita-384.eu-west-1.convex.cloud",
        "DOZERO_API_KEY": "dk_your_api_key_here"
      }
    }
  }
}
```

**Fully quit and restart Claude Desktop.** You'll see a 🔧 tools icon confirming the connection.

## Available Tools

| Tool | Description |
|------|-------------|
| `create_company` | Creates a full AI company with a team of agents from a plain-English idea |
| `list_companies` | Lists all companies in your DoZero workspace |
| `list_agents` | Lists all individual AI agents |
| `create_agent` | Creates a single standalone agent with a name, description, and system prompt |
| `run_task` | Triggers an agent to perform a background task |
| `get_agent_output` | Fetches the output of an agent's background task |
| `build_workflow` | Schedules a recurring task for an agent using a cron expression |
| `search_knowledge` | Searches through the group's shared memory and assets |
| `save_knowledge` | Permanently stores facts, rules, or context for the company in shared memory |
| `get_artifact` | Fetches the generated content (HTML, code, design spec) of a specific artifact |
| `list_artifacts` | Enumerates artifacts produced by the team |
| `get_plan` | Reads the overarching status, steps, and progress of a company plan |
| `run_plan_step` | Triggers the next pending step of a company plan |
| `list_group_members` | Views the exact team roster, roles, and enabled studios for a company |
| `list_tasks` | Views the backlog of tasks currently queued, running, or failed for the group |

## Example Prompts

Once connected in Claude Desktop, try:

- *"Create a company for a fitness app that makes personalized workout plans, with 4 agents"*
- *"List all my companies in DoZero"*
- *"Create an agent called 'Research Analyst' that finds market trends for SaaS startups"*

## How It Works

The `create_company` tool runs a 4-step pipeline:

1. **Blueprint** — Generates company structure (name, tagline, org chart)
2. **Employee Plan** — Creates a roster with names and titles for each role
3. **Build Specs** — Generates system prompts & schedules for each agent (parallel)
4. **Provision** — Writes everything to the DoZero database

All calls are authenticated via your API key and go through DoZero's MCP gateway (`/api/mcp/*`).

## Project Structure

```
src/
├── index.ts              ← MCP server entry point (registers tools, stdio transport)
├── convex.ts             ← HTTP client (API key auth, calls /api/mcp/* gateway)
├── types.ts              ← TypeScript type definitions
└── tools/                ← Tool handlers mapping to backend services
    ├── createCompany.ts  
    ├── listCompanies.ts  
    ├── ... (15 tool handlers total)

## Development

```bash
# Run locally (reads .env)
npm run dev

# Build for production
npm run build
npm start
```

## Troubleshooting

| Error | Fix |
|-------|-----|
| `Authentication failed (401)` | Your API key is invalid or revoked. Generate a new one in DoZero Settings. |
| `DOZERO_CONVEX_URL is not set` | Make sure the env var is set in Claude Desktop config or `.env` |
| No 🔧 icon in Claude | Restart Claude Desktop. Check the path in your config is absolute. |
| `Failed to parse blueprint` | The company idea may be too vague. Try a more specific description. |

## License

MIT