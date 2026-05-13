import { convexQuery } from "../convex.js";

export async function handleGetPlan(args: {
  planId: string;
}): Promise<any> {
  const plan = await convexQuery<any>("companyPlans:getPlan", {
    planId: args.planId,
  });
  
  if (!plan) {
    throw new Error(`Plan ${args.planId} not found or you don't have access to it.`);
  }

  return plan;
}
