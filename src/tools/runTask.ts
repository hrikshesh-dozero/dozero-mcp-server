import { convexMutation } from "../convex.js";

export async function handleRunTask(args: {
  groupId: string;
  agentId: string;
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high" | "critical";
}): Promise<{ taskId: string }> {
  const taskId = await convexMutation<string>("tasks:enqueueTaskInternal", {
    groupId: args.groupId,
    agentId: args.agentId,
    title: args.title,
    ...(args.description ? { description: args.description } : {}),
    ...(args.priority ? { priority: args.priority } : {}),
  });

  return { taskId };
}
