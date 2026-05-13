import { convexQuery } from "../convex.js";

export async function handleListTasks(args: {
  groupId?: string;
  agentId?: string;
  statusFilter?: string;
}): Promise<any[]> {
  const tasks = await convexQuery<any[]>("tasks:listTasks", {
    ...(args.groupId ? { groupId: args.groupId } : {}),
    ...(args.agentId ? { agentId: args.agentId } : {}),
    ...(args.statusFilter ? { statusFilter: args.statusFilter } : {}),
  });
  return tasks;
}
