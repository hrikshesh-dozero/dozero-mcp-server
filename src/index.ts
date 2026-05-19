#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import express from "express";
import cors from "cors";
import { handleAuthorize, handleCallback, handleOAuthMetadata, handleToken } from "./oauth.js";
import { handleCreateCompany } from "./tools/createCompany.js";
import { handleListCompanies } from "./tools/listCompanies.js";
import { handleListAgents } from "./tools/listAgents.js";
import { handleCreateAgent } from "./tools/createAgent.js";
import { handleRunTask } from "./tools/runTask.js";
import { handleGetAgentOutput } from "./tools/getAgentOutput.js";
import { handleBuildWorkflow } from "./tools/buildWorkflow.js";
import { handleSearchKnowledge } from "./tools/searchKnowledge.js";
import { handleSaveKnowledge } from "./tools/saveKnowledge.js";
import { handleGetArtifact } from "./tools/getArtifact.js";
import { handleListArtifacts } from "./tools/listArtifacts.js";
import { handleGetPlan } from "./tools/getPlan.js";
import { handleRunPlan } from "./tools/runPlan.js";
import { handleListGroupMembers } from "./tools/listGroupMembers.js";
import { handleListTasks } from "./tools/listTasks.js";

const server = new McpServer({
  name: "dozero",
  version: "1.0.0",
});

// ── Tool 1: create_company ──────────────────────────────────────────────────────
server.tool(
  "create_company",
  "Creates a full AI company in DoZero with a team of agents. Takes a plain-English business idea and automatically generates the company structure, agent team, system prompts, and schedules. This takes 30-60 seconds as it calls multiple LLM endpoints.",
  {
    idea: z
      .string()
      .describe(
        "Plain English description of the company/startup idea. E.g. 'A fitness app that creates personalized workout plans'"
      ),
    numAgents: z
      .number()
      .min(1)
      .max(8)
      .default(3)
      .describe("Approximate number of AI agents to create (default: 3, max: 8)"),
  },
  async ({ idea, numAgents }) => {
    try {
      const result = await handleCreateCompany({ idea, numAgents });

      const agentList = result.agents
        .map((a, i) => `  ${i + 1}. ${a.name} — ${a.title}`)
        .join("\n");

      return {
        content: [
          {
            type: "text" as const,
            text: [
              ` Company created successfully!`,
              ``,
              ` Company: ${result.companyName}`,
              ` Tagline: ${result.tagline}`,
              ` Group ID: ${result.groupId}`,
              ` Agents (${result.agentCount}):`,
              agentList,
              ``,
              `Open DoZero in your browser to see your new company and interact with the agents.`,
            ].join("\n"),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: ` Failed to create company: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ── Tool 2: list_companies ──────────────────────────────────────────────────────
server.tool(
  "list_companies",
  "Lists all companies (agent groups) that exist in the user's DoZero workspace.",
  {},
  async () => {
    try {
      const groups = await handleListCompanies();

      if (groups.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No companies found in your DoZero workspace. Use create_company to create one!",
            },
          ],
        };
      }

      const lines = groups.map(
        (g, i) =>
          `${i + 1}. **${g.name}** (ID: ${g._id})\n   ${g.description || "No description"}`
      );

      return {
        content: [
          {
            type: "text" as const,
            text: `Found ${groups.length} companies:\n\n${lines.join("\n\n")}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: ` Failed to list companies: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ── Tool 3: list_agents ─────────────────────────────────────────────────────────
server.tool(
  "list_agents",
  "Lists all individual AI agents in the user's DoZero workspace.",
  {},
  async () => {
    try {
      const agents = await handleListAgents();

      if (agents.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No agents found in your DoZero workspace. Use create_company or create_agent to get started!",
            },
          ],
        };
      }

      const lines = agents.map(
        (a, i) =>
          `${i + 1}. **${a.name}** — ${a.title || "No title"} (ID: ${a._id})\n   ${a.description || "No description"}`
      );

      return {
        content: [
          {
            type: "text" as const,
            text: `Found ${agents.length} agents:\n\n${lines.join("\n\n")}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: ` Failed to list agents: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ── Tool 4: create_agent ────────────────────────────────────────────────────────
server.tool(
  "create_agent",
  "Creates a single standalone AI agent in DoZero with a name, description, and system prompt.",
  {
    name: z.string().describe("Agent name, e.g. 'Content Writer'"),
    description: z.string().describe("What this agent does"),
    systemPrompt: z.string().describe("Instruction prompt for the agent"),
    model: z
      .string()
      .default("anthropic/claude-sonnet-4-5")
      .describe("LLM model ID (optional, defaults to Claude Sonnet 4.5)"),
  },
  async ({ name, description, systemPrompt, model }) => {
    try {
      const result = await handleCreateAgent({
        name,
        description,
        systemPrompt,
        model,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: [
              ` Agent created successfully!`,
              ``,
              ` Name: ${result.name}`,
              ` Agent ID: ${result.agentId}`,
              ``,
              `Open DoZero in your browser to interact with this agent.`,
            ].join("\n"),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: ` Failed to create agent: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);
// ── Tool 5: run_task ────────────────────────────────────────────────────────────
server.tool(
  "run_task",
  "Triggers an agent to do something right now by enqueueing a background task. The agent must belong to a group.",
  {
    groupId: z.string().describe("ID of the group the agent belongs to"),
    agentId: z.string().describe("ID of the agent to run the task"),
    title: z.string().describe("Short title of the task"),
    description: z.string().optional().describe("Detailed description of what the agent should do"),
    priority: z.enum(["low", "medium", "high", "critical"]).optional().describe("Task priority"),
  },
  async ({ groupId, agentId, title, description, priority }) => {
    try {
      const result = await handleRunTask({
        groupId,
        agentId,
        title,
        description,
        priority,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: [
              ` Task enqueued successfully!`,
              ``,
              ` Task ID: ${result.taskId}`,
              ``,
              `Use get_agent_output to check the status or result of this task.`,
            ].join("\n"),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: ` Failed to enqueue task: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ── Tool 6: get_agent_output ────────────────────────────────────────────────────
server.tool(
  "get_agent_output",
  "Fetches the status and output of a background task run by an agent.",
  {
    taskId: z.string().describe("ID of the task to check"),
  },
  async ({ taskId }) => {
    try {
      const result = await handleGetAgentOutput({ taskId });

      return {
        content: [
          {
            type: "text" as const,
            text: [
              ` Task Output:`,
              ``,
              ` Title: ${result.title}`,
              ` Status: ${result.status}`,
              result.startedAt ? ` Started At: ${new Date(result.startedAt).toLocaleString()}` : "",
              result.completedAt ? ` Completed At: ${new Date(result.completedAt).toLocaleString()}` : "",
              ``,
              result.error ? ` Error: ${result.error}` : "",
              result.result ? ` Result:\n${result.result}` : (result.status !== "completed" && result.status !== "failed" ? " Wait a moment and check again for the result." : ""),
            ].filter(Boolean).join("\n"),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: ` Failed to get agent output: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ── Tool 7: build_workflow ──────────────────────────────────────────────────────
server.tool(
  "build_workflow",
  "Creates a repeatable process (schedule) for an agent using a cron expression.",
  {
    agentId: z.string().describe("ID of the agent to schedule"),
    groupId: z.string().optional().describe("ID of the group the agent belongs to"),
    label: z.string().describe("Human-readable label for this schedule, e.g. 'Daily morning report'"),
    task: z.string().describe("What the agent should do when this schedule fires"),
    cron: z.string().describe("A valid cron expression, e.g. '0 9 * * *'"),
  },
  async ({ agentId, groupId, label, task, cron }) => {
    try {
      const result = await handleBuildWorkflow({
        agentId,
        groupId,
        label,
        task,
        cron,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: [
              ` Workflow schedule created successfully!`,
              ``,
              ` Schedule ID: ${result.scheduleId}`,
              ` Label: ${label}`,
              ` Cron: ${cron}`,
            ].join("\n"),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: ` Failed to build workflow: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ── Tool 8: search_knowledge ────────────────────────────────────────────────────
server.tool(
  "search_knowledge",
  "Searches through the group's shared memory and assets.",
  {
    groupId: z.string().describe("ID of the group"),
    query: z.string().describe("Search query text"),
    limit: z.number().optional().describe("Max number of results to return"),
  },
  async ({ groupId, query, limit }) => {
    try {
      const results = await handleSearchKnowledge({ groupId, query, limit });
      return {
        content: [
          {
            type: "text" as const,
            text: `Search results:\n${JSON.stringify(results, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: `Failed to search knowledge: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
);

// ── Tool 9: save_knowledge ──────────────────────────────────────────────────────
server.tool(
  "save_knowledge",
  "Permanently stores facts, rules, or context for the company in shared memory.",
  {
    groupId: z.string().describe("ID of the group"),
    content: z.string().describe("The knowledge/fact to store"),
    createdByAgentId: z.string().optional().describe("ID of the agent storing this (optional)"),
  },
  async ({ groupId, content, createdByAgentId }) => {
    try {
      const { memoryId } = await handleSaveKnowledge({ groupId, content, createdByAgentId });
      return {
        content: [{ type: "text" as const, text: `Knowledge saved successfully. Memory ID: ${memoryId}` }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: `Failed to save knowledge: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
);

// ── Tool 10: get_artifact ───────────────────────────────────────────────────────
server.tool(
  "get_artifact",
  "Fetches the generated content (HTML, code, design spec) of a specific artifact.",
  {
    artifactId: z.string().describe("ID of the artifact"),
  },
  async ({ artifactId }) => {
    try {
      const artifact = await handleGetArtifact({ artifactId });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(artifact, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: `Failed to get artifact: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
);

// ── Tool 11: list_artifacts ─────────────────────────────────────────────────────
server.tool(
  "list_artifacts",
  "Enumerates artifacts produced by the team.",
  {
    groupId: z.string().optional().describe("Filter by group ID"),
    agentId: z.string().optional().describe("Filter by agent ID"),
  },
  async ({ groupId, agentId }) => {
    try {
      const artifacts = await handleListArtifacts({ groupId, agentId });
      return {
        content: [{ type: "text" as const, text: `Found ${artifacts.length} artifacts:\n${JSON.stringify(artifacts, null, 2)}` }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: `Failed to list artifacts: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
);

// ── Tool 12: get_plan ───────────────────────────────────────────────────────────
server.tool(
  "get_plan",
  "Reads the overarching status, steps, and progress of a company plan.",
  {
    planId: z.string().describe("ID of the plan"),
  },
  async ({ planId }) => {
    try {
      const plan = await handleGetPlan({ planId });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(plan, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: `Failed to get plan: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
);

// ── Tool 13: run_plan_step ──────────────────────────────────────────────────────
server.tool(
  "run_plan_step",
  "Triggers the next pending step of a company plan.",
  {
    planId: z.string().describe("ID of the plan"),
  },
  async ({ planId }) => {
    try {
      const result = await handleRunPlan({ planId });
      return {
        content: [{ type: "text" as const, text: `Plan step triggered successfully.\n${JSON.stringify(result, null, 2)}` }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: `Failed to run plan step: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
);

// ── Tool 14: list_group_members ─────────────────────────────────────────────────
server.tool(
  "list_group_members",
  "Views the exact team roster, roles, and enabled studios for a company.",
  {
    groupId: z.string().describe("ID of the group"),
  },
  async ({ groupId }) => {
    try {
      const members = await handleListGroupMembers({ groupId });
      return {
        content: [{ type: "text" as const, text: `Found ${members.length} members:\n${JSON.stringify(members, null, 2)}` }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: `Failed to list group members: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
);

// ── Tool 15: list_tasks ─────────────────────────────────────────────────────────
server.tool(
  "list_tasks",
  "Views the backlog of tasks currently queued, running, or failed for the group.",
  {
    groupId: z.string().optional().describe("Filter by group ID"),
    agentId: z.string().optional().describe("Filter by agent ID"),
    statusFilter: z.string().optional().describe("Filter by status (e.g., 'queued', 'running', 'completed', 'failed')"),
  },
  async ({ groupId, agentId, statusFilter }) => {
    try {
      const tasks = await handleListTasks({ groupId, agentId, statusFilter });
      return {
        content: [{ type: "text" as const, text: `Found ${tasks.length} tasks:\n${JSON.stringify(tasks, null, 2)}` }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: `Failed to list tasks: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
);

// ── Express SSE Server ──────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.url} - Headers: ${JSON.stringify(req.headers)}`);
  next();
});

// Store active SSE transports keyed by session ID
const transports = new Map<string, SSEServerTransport>();

// ── OAuth 2.0 Routes ────────────────────────────────────────────────────

// RFC 8414 — OAuth server metadata (Claude Web auto-discovers this)
app.get("/.well-known/oauth-authorization-server", handleOAuthMetadata);
app.get("/sse/.well-known/oauth-authorization-server", handleOAuthMetadata);

// Step 1: Claude Web redirects user here to start login
app.get("/authorize", handleAuthorize);

// Step 2: WorkOS redirects back here after user logs in
app.get("/callback", handleCallback);

// Step 3: Claude Web exchanges the auth code for an access token
app.post("/token", handleToken);

// ── MCP SSE Routes ────────────────────────────────────────────────────────

/**
 * GET /sse
 * Claude Web opens this SSE stream. We extract the WorkOS Bearer token
 * from the Authorization header and store it on the transport so every
 * tool handler can forward it to Convex as the auth credential.
 */
app.get("/", (_req, res) => {
  res.json({ status: "running", message: "DoZero MCP Server is active. Use /sse for the SSE endpoint." });
});

app.get("/sse", async (req, res) => {
  // Prevent Render/Nginx from buffering the SSE stream
  res.setHeader("X-Accel-Buffering", "no");

  // Extract Bearer token sent by Claude Web
  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  // Inject the token as an env var so convex.ts can pick it up per-request.
  // In a multi-tenant production setup, use AsyncLocalStorage instead.
  // Fall back to the DOZERO_AUTH_TOKEN from .env for local testing if no header is present
  process.env.DOZERO_AUTH_TOKEN = token || process.env.DOZERO_AUTH_TOKEN || "fake-test-token";

  console.log("New authenticated Claude Web connection:", req.ip);
  const transport = new SSEServerTransport("/messages", res);
  transports.set(transport.sessionId, transport);

  res.on("close", () => {
    console.log("Connection closed:", transport.sessionId);
    transports.delete(transport.sessionId);
  });

  // If the single-tenant server is already connected to another transport, close it first
  if (server.isConnected()) {
    console.log("Closing existing MCP server connection to accept new connection");
    try {
      await server.close();
    } catch (err) {
      console.error("Error closing existing server connection:", err);
    }
  }

  await server.connect(transport);
});

/**
 * POST /messages
 * Claude Web POSTs tool-call requests here.
 */
app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports.get(sessionId);

  if (!transport) {
    res.status(400).json({ error: "No active session found. Please reconnect." });
    return;
  }

  await transport.handlePostMessage(req, res);
});

/**
 * GET /health
 * Simple health check for deployment platforms.
 */
app.get("/health", (_req, res) => {
  res.json({ status: "ok", server: "dozero-mcp", tools: 15 });
});

const PORT = parseInt(process.env.PORT ?? "3000", 10);
app.listen(PORT, () => {
  console.log(`DoZero MCP server running at http://localhost:${PORT}`);
  console.log(`OAuth metadata: http://localhost:${PORT}/.well-known/oauth-authorization-server`);
  console.log(`Connect Claude Web to: http://localhost:${PORT}/sse`);
});
