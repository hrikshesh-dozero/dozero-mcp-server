export interface BlueprintNode {
  id: string;
  label: string;
  type: "ai" | "human";
  description: string;
}

export interface BlueprintEdge {
  source: string;
  target: string;
}

export interface Blueprint {
  companyName: string;
  tagline: string;
  sharedContext: string;
  nodes: BlueprintNode[];
  edges: BlueprintEdge[];
}

export interface EmployeePlan {
  nodeId: string;
  name: string;
  title: string;
  type: "ai" | "human";
  description: string;
}

export interface Schedule {
  label: string;
  task: string;
  cron: string;
}

export interface EmployeeSpec {
  nodeId: string;
  name: string;
  title: string;
  systemPrompt: string;
  studios: string[];
  schedules: Schedule[];
  capabilities: string[];
}

export interface BuildCompanyEmployee {
  nodeId: string;
  name: string;
  title: string;
  systemPrompt: string;
  capabilities: string[];
  studios: string[];
  schedules: Schedule[];
  enabledTools: string[];
  skills: Array<{
    name: string;
    description: string;
    content: string;
  }>;
}

export interface ConvexMutationResponse<T = unknown> {
  status: "success" | "error";
  value?: T;
  errorMessage?: string;
  errorCode?: string;
}

export interface Group {
  _id: string;
  name: string;
  description: string;
  coordinatorAgentId: string;
  sharedContext: string;
  createdAt: number;
  updatedAt: number;
}

export interface Agent {
  _id: string;
  name: string;
  title: string;
  description: string;
  model: string;
  enabledTools: string[];
  skills: Array<{
    name: string;
    description: string;
    content: string;
  }>;
}
