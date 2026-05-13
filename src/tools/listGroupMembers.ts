import { convexQuery } from "../convex.js";

export async function handleListGroupMembers(args: {
  groupId: string;
}): Promise<any[]> {
  const members = await convexQuery<any[]>("groups:listGroupMembers", {
    groupId: args.groupId,
  });
  return members;
}
