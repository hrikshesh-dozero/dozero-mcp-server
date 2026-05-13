# DoZero MCP Server

An MCP (Model Context Protocol) server that lets Claude Desktop create AI companies and agents in [DoZero](https://dozero.dev) — directly from your chat.

```
You: "Create a fitness startup with 3 AI agents"
     ↓
Claude → MCP Server → DoZero Convex Backend → Company + Agents created ✅
```

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up your environment

Copy the example and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```bash
# Your Convex deployment URL (from the DoZero project's convex.json or .env.local)
DOZERO_CONVEX_URL=https://your-deployment.convex.cloud

# Your WorkOS JWT access token
# Get it from: DoZero browser → DevTools → Network tab → any convex.cloud request → Authorization header
DOZERO_ACCESS_TOKEN=eyJhbG...
```

> **Token expires in ~1 hour.** Re-copy from the browser when it does. The server will give you a clear error message when this happens.

### 3. Add to Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dozero": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/dozero-mcp-server/src/index.ts"],
      "env": {
        "DOZERO_CONVEX_URL": "https://your-deployment.convex.cloud",
        "DOZERO_ACCESS_TOKEN": "eyJhbG..."
      }
    }
  }
}
```

**Fully quit and restart Claude Desktop.** You'll see a 🔌 icon in the chat bar confirming the connection.

## Available Tools

| Tool | Description |
|------|-------------|
| `create_company` | Creates a full AI company with a team of agents from a plain-English idea |
| `list_companies` | Lists all companies in your DoZero workspace |
| `list_agents` | Lists all individual AI agents |
| `create_agent` | Creates a single standalone agent with a name, description, and system prompt |

## Example Prompts

Once connected in Claude Desktop, try:

- *"Create a company for a fitness app that makes personalized workout plans, with 4 agents"*
- *"List all my companies in DoZero"*
- *"Create an agent called 'Research Analyst' that finds market trends for SaaS startups"*

## How It Works

The `create_company` tool runs a 4-step pipeline:

1. **Blueprint** — Calls `/api/company-blueprint/stream` (SSE) to generate company structure
2. **Employee Plan** — Calls `/api/company-employees/plan` to create a roster with names and titles
3. **Build Specs** — Calls `/api/company-employees/build-one` for each agent (in parallel) to generate system prompts & schedules
4. **Provision** — Calls the `agents:buildCompany` Convex mutation to write everything to the database

## Project Structure

```
src/
├── index.ts              ← MCP server entry point (registers tools, stdio transport)
├── convex.ts             ← HTTP helpers (convexQuery, convexMutation, convexHttpPost)
├── types.ts              ← TypeScript type definitions
└── tools/
    ├── createCompany.ts  ← 4-step company creation pipeline
    ├── listCompanies.ts  ← List all groups
    ├── listAgents.ts     ← List all agents
    └── createAgent.ts    ← Create a single agent
```

## Troubleshooting

| Error | Fix |
|-------|-----|
| `Authentication failed (401)` | Your token expired. Re-copy from the browser. |
| `DOZERO_CONVEX_URL is not set` | Make sure the env var is set in Claude Desktop config or `.env` |
| No 🔌 icon in Claude | Restart Claude Desktop. Check the path in your config is absolute. |
| `Failed to parse blueprint` | The company idea may be too vague. Try a more specific description. |