import { convexQuery } from "../convex.js";

export async function handleListArtifacts(args: {
  groupId?: string;
  agentId?: string;
}): Promise<any[]> {
  const artifacts = await convexQuery<any[]>("artifacts:listArtifactsInternal", {
    ...(args.groupId ? { groupId: args.groupId } : {}),
    ...(args.agentId ? { agentId: args.agentId } : {}),
  });
  return artifacts;
}
