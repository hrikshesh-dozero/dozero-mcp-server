import { convexQuery } from "../convex.js";

export async function handleGetArtifact(args: {
  artifactId: string;
}): Promise<any> {
  const artifact = await convexQuery<any>("artifacts:getArtifact", {
    artifactId: args.artifactId,
  });
  
  if (!artifact) {
    throw new Error(`Artifact ${args.artifactId} not found or you don't have access to it.`);
  }

  return artifact;
}
