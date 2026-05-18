import { convexMutation } from "../convex.js";

export async function handleCreateAgent(args: {
  name: string;
  description: string;
  systemPrompt: string;
  model?: string;
}): Promise<{ agentId: string; name: string }> {
  const agentId = await convexMutation<string>("agents:createAgentWithConfigInternal", {
    name: args.name,
    description: args.description,
    systemPrompt: args.systemPrompt,
    ...(args.model ? { model: args.model } : {}),
  });

  return { agentId, name: args.name };
}
