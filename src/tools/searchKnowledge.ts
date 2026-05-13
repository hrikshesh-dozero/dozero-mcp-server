import { convexQuery } from "../convex.js";

export async function handleSearchKnowledge(args: {
  groupId: string;
  query: string;
  limit?: number;
}): Promise<any> {
  const results = await convexQuery<any>("groupKnowledge:searchKnowledge", {
    groupId: args.groupId,
    query: args.query,
    ...(args.limit ? { limit: args.limit } : {}),
  });
  return results;
}
