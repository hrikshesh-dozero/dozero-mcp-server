import { convexQuery } from "../convex.js";
import type { Agent } from "../types.js";

export async function handleListAgents(): Promise<Agent[]> {
  return convexQuery<Agent[]>("agents:listAgentsInternal");
}
