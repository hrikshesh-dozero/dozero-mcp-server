import { convexQuery } from "../convex.js";
import type { Group } from "../types.js";

export async function handleListCompanies(): Promise<Group[]> {
  return convexQuery<Group[]>("groups:listGroups");
}
