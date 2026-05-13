import { convexMutation } from "../convex.js";

export async function handleBuildWorkflow(args: {
  agentId: string;
  groupId?: string;
  label: string;
  task: string;
  cron: string;
}): Promise<{ scheduleId: string }> {
  const scheduleId = await convexMutation<string>("agents:createAgentSchedule", {
    agentId: args.agentId,
    label: args.label,
    task: args.task,
    cron: args.cron,
    ...(args.groupId ? { groupId: args.groupId } : {}),
  });

  return { scheduleId };
}
