/**
 * Neo4j client for graph relationship queries.
 * Lazy-initialised to avoid crashes during `next build`.
 *
 * Env vars:
 *   NEO4J_URI       — bolt://localhost:7687 or neo4j+s://xxx.databases.neo4j.io
 *   NEO4J_USER      — default: neo4j
 *   NEO4J_PASSWORD   — your password
 */
import neo4j, { type Driver } from "neo4j-driver";

let driver: Driver | undefined;

export function getNeo4jDriver(): Driver {
  if (!driver) {
    const uri = process.env.NEO4J_URI;
    const user = process.env.NEO4J_USER ?? "neo4j";
    const password = process.env.NEO4J_PASSWORD;

    if (!uri || !password) {
      throw new Error(
        "Missing NEO4J_URI or NEO4J_PASSWORD environment variables"
      );
    }

    driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  }
  return driver;
}

export async function closeNeo4j() {
  if (driver) {
    await driver.close();
    driver = undefined;
  }
}
