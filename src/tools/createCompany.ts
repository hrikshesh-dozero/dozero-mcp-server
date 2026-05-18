import { convexHttpPostSSE, convexHttpPost, convexMutation } from "../convex.js";
import type {
  Blueprint,
  EmployeePlan,
  EmployeeSpec,
  BuildCompanyEmployee,
} from "../types.js";

/**
 * Parse the SSE stream from /api/company-blueprint/stream.
 * Finds the `event: done` frame and extracts the JSON payload.
 */
function parseBlueprintSSE(sseText: string): Blueprint {
  const lines = sseText.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === "event: done" && lines[i + 1]?.startsWith("data: ")) {
      const jsonStr = lines[i + 1].slice(6);
      return JSON.parse(jsonStr) as Blueprint;
    }
  }

  // Check for SSE error event
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === "event: error" && lines[i + 1]?.startsWith("data: ")) {
      const errorMsg = lines[i + 1].slice(6);
      throw new Error(`Blueprint generation failed: ${errorMsg}`);
    }
  }

  throw new Error(
    "Failed to parse blueprint from SSE response. No 'event: done' frame found. " +
      `Response preview: ${sseText.slice(0, 500)}`
  );
}

async function fetchBlueprint(idea: string): Promise<Blueprint> {
  const sseText = await convexHttpPostSSE("/api/company-blueprint/stream", {
    idea,
    qa: [],
  });
  return parseBlueprintSSE(sseText);
}

async function fetchEmployeePlan(
  idea: string,
  blueprint: Blueprint,
  selectedNodes: Blueprint["nodes"]
): Promise<EmployeePlan[]> {
  return convexHttpPost<EmployeePlan[]>("/api/company-employees/plan", {
    idea,
    qa: [],
    blueprint: {
      companyName: blueprint.companyName,
      tagline: blueprint.tagline,
      nodes: selectedNodes.map((n) => ({
        id: n.id,
        label: n.label,
        type: n.type,
        description: n.description,
      })),
    },
  });
}

async function fetchBuildOne(
  idea: string,
  employee: EmployeePlan,
  blueprint: Blueprint
): Promise<EmployeeSpec> {
  return convexHttpPost<EmployeeSpec>("/api/company-employees/build-one", {
    idea,
    employee: {
      nodeId: employee.nodeId,
      name: employee.name,
      title: employee.title,
      description: employee.description,
      type: employee.type,
    },
    blueprint: {
      companyName: blueprint.companyName,
      tagline: blueprint.tagline,
    },
  });
}

export async function handleCreateCompany(args: {
  idea: string;
  numAgents?: number;
}): Promise<{
  groupId: string;
  companyName: string;
  tagline: string;
  agentCount: number;
  agents: Array<{ name: string; title: string }>;
}> {
  const { idea, numAgents = 3 } = args;
  const clampedNum = Math.min(Math.max(numAgents, 1), 8);

  // Step 1: Generate blueprint via SSE
  const blueprint = await fetchBlueprint(idea);

  // Filter to AI nodes only, cap at requested count
  const aiNodes = blueprint.nodes.filter((n) => n.type === "ai");
  const selectedNodes = aiNodes.slice(0, clampedNum);

  if (selectedNodes.length === 0) {
    throw new Error(
      "Blueprint generated zero AI agent nodes. Try rephrasing your company idea."
    );
  }

  // Step 2: Get employee roster
  const roster = await fetchEmployeePlan(idea, blueprint, selectedNodes);

  // Step 3: Build full spec for each employee (parallel)
  const employeeSpecs = await Promise.all(
    roster.map((employee) => fetchBuildOne(idea, employee, blueprint))
  );

  // Step 4: Provision in Convex DB
  const employees: BuildCompanyEmployee[] = employeeSpecs.map((spec) => ({
    nodeId: spec.nodeId,
    name: spec.name,
    title: spec.title,
    systemPrompt: spec.systemPrompt,
    capabilities: spec.capabilities || [],
    studios: spec.studios || [],
    schedules: spec.schedules || [],
    enabledTools: ["webSearch", "planning"],
    skills: [],
  }));

  const groupId = await convexMutation<string>("agents:buildCompanyInternal", {
    idea,
    numAgents,
    companyName: blueprint.companyName,
    tagline: blueprint.tagline,
    sharedContext: blueprint.sharedContext,
    employees,
  });

  return {
    groupId,
    companyName: blueprint.companyName,
    tagline: blueprint.tagline,
    agentCount: employeeSpecs.length,
    agents: employeeSpecs.map((s) => ({ name: s.name, title: s.title })),
  };
}
