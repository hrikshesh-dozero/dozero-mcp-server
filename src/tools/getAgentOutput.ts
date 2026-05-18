import { convexQuery } from "../convex.js";

export async function handleGetAgentOutput(args: {
  taskId: string;
}): Promise<any> {
  const task = await convexQuery<any>("tasks:getTaskInternal", {
    taskId: args.taskId,
  });

  if (!task) {
    throw new Error(`Task ${args.taskId} not found or you don't have access to it`);
  }

  return {
    taskId: task._id,
    title: task.title,
    status: task.status,
    result: task.result || null,
    error: task.error || null,
    startedAt: task.startedAt,
    completedAt: task.completedAt,
  };
}
