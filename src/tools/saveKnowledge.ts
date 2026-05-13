import { convexMutation } from "../convex.js";

export async function handleSaveKnowledge(args: {
  groupId: string;
  content: string;
  createdByAgentId?: string;
}): Promise<{ memoryId: string }> {
  const memoryId = await convexMutation<string>("groupKnowledge:saveMemory", {
    groupId: args.groupId,
    content: args.content,
    ...(args.createdByAgentId ? { createdByAgentId: args.createdByAgentId } : {}),
  });
  return { memoryId };
}
