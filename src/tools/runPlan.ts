import { convexMutation } from "../convex.js";

export async function handleRunPlan(args: {
  planId: string;
}): Promise<any> {
  const result = await convexMutation<any>("companyPlans:runPlanInternal", {
    planId: args.planId,
  });
  return result;
}
