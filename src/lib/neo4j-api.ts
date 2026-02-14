/**
 * Neo4j API factory for graph-based company queries.
 * Returns data shaped for the graph explorer and relationship views.
 */
import { getNeo4jDriver } from "./neo4j";

export interface GraphNode {
  id: string;
  name: string;
  category: string | null;
  latitude: number | null;
  longitude: number | null;
  source: string;
  connectionCount: number;
}

export interface GraphEdge {
  source: string; // node id
  target: string; // node id
  type: string;   // relationship type
  weight?: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function createNeo4jApi() {
  return {
    /** Get the subgraph around a company (1-3 hops). */
    async getGraph(companyId: string, depth = 1): Promise<GraphData> {
      const driver = getNeo4jDriver();
      const session = driver.session({ database: "neo4j" });

      try {
        const result = await session.run(
          `
          MATCH (c:Company {supabaseId: $companyId})
          CALL apoc.path.subgraphAll(c, {maxLevel: $depth})
          YIELD nodes, relationships
          WITH nodes, relationships
          UNWIND nodes AS n
          WITH collect(DISTINCT {
            id: n.supabaseId,
            name: n.name,
            category: n.category,
            latitude: n.latitude,
            longitude: n.longitude,
            source: n.source,
            connectionCount: COUNT { (n)--() }
          }) AS nodeList, relationships
          UNWIND relationships AS r
          WITH nodeList, collect(DISTINCT {
            source: startNode(r).supabaseId,
            target: endNode(r).supabaseId,
            type: type(r),
            weight: r.weight
          }) AS edgeList
          RETURN nodeList, edgeList
          `,
          { companyId, depth: neo4jInt(depth) }
        );

        if (result.records.length === 0) {
          // Fallback: just get direct relationships without APOC
          return this.getGraphSimple(companyId, depth);
        }

        const nodes = result.records[0].get("nodeList") as GraphNode[];
        const edges = result.records[0].get("edgeList") as GraphEdge[];
        return { nodes, edges };
      } catch {
        // APOC not available, use simple query
        return this.getGraphSimple(companyId, depth);
      } finally {
        await session.close();
      }
    },

    /** Simple subgraph query without APOC dependency. */
    async getGraphSimple(companyId: string, depth = 1): Promise<GraphData> {
      const driver = getNeo4jDriver();
      const session = driver.session({ database: "neo4j" });

      try {
        const depthPattern = depth === 1 ? "1" : depth === 2 ? "1..2" : "1..3";

        const result = await session.run(
          `
          MATCH (c:Company {supabaseId: $companyId})-[r*${depthPattern}]-(other:Company)
          WITH c, collect(DISTINCT other) AS others,
               [p IN collect(r) | p] AS allRels
          WITH c + others AS allNodes, allRels
          UNWIND allNodes AS n
          WITH collect(DISTINCT n) AS nodes, allRels
          RETURN
            [n IN nodes | {
              id: n.supabaseId,
              name: n.name,
              category: n.category,
              latitude: n.latitude,
              longitude: n.longitude,
              source: n.source,
              connectionCount: 0
            }] AS nodeList,
            [] AS edgeList
          `,
          { companyId }
        );

        // Simpler fallback: get direct neighbors
        const directResult = await session.run(
          `
          MATCH (c:Company {supabaseId: $companyId})-[r]-(other:Company)
          RETURN
            collect(DISTINCT {
              id: other.supabaseId,
              name: other.name,
              category: other.category,
              latitude: other.latitude,
              longitude: other.longitude,
              source: other.source,
              connectionCount: COUNT { (other)--() }
            }) AS neighbors,
            collect(DISTINCT {
              source: c.supabaseId,
              target: other.supabaseId,
              type: type(r)
            }) AS edges,
            {
              id: c.supabaseId,
              name: c.name,
              category: c.category,
              latitude: c.latitude,
              longitude: c.longitude,
              source: c.source,
              connectionCount: COUNT { (c)--() }
            } AS center
          `,
          { companyId }
        );

        if (directResult.records.length === 0) {
          return { nodes: [], edges: [] };
        }

        const record = directResult.records[0];
        const center = record.get("center") as GraphNode;
        const neighbors = record.get("neighbors") as GraphNode[];
        const edges = record.get("edges") as GraphEdge[];

        return {
          nodes: [center, ...neighbors],
          edges,
        };
      } finally {
        await session.close();
      }
    },

    /** Get competitors: same category + nearby. */
    async getCompetitors(companyId: string, radiusKm = 2): Promise<GraphNode[]> {
      const driver = getNeo4jDriver();
      const session = driver.session({ database: "neo4j" });

      try {
        const result = await session.run(
          `
          MATCH (c:Company {supabaseId: $companyId})-[:COMPETES_WITH]-(comp:Company)
          RETURN comp {
            .supabaseId, .name, .category, .latitude, .longitude, .source,
            connectionCount: COUNT { (comp)--() }
          } AS competitor
          ORDER BY competitor.name
          LIMIT 20
          `,
          { companyId }
        );

        return result.records.map((r) => {
          const c = r.get("competitor");
          return {
            id: c.supabaseId,
            name: c.name,
            category: c.category,
            latitude: c.latitude,
            longitude: c.longitude,
            source: c.source,
            connectionCount: c.connectionCount?.toNumber?.() ?? c.connectionCount ?? 0,
          };
        });
      } finally {
        await session.close();
      }
    },

    /** Get cluster summary by province/city. */
    async getClusters(province?: string, city?: string) {
      const driver = getNeo4jDriver();
      const session = driver.session({ database: "neo4j" });

      try {
        let query: string;
        const params: Record<string, unknown> = {};

        if (city) {
          query = `
            MATCH (c:Company)-[:IN_CITY]->(city:City {name: $city})
            OPTIONAL MATCH (c)-[:IN_CATEGORY]->(cat:Category)
            RETURN cat.name AS category, count(c) AS count
            ORDER BY count DESC LIMIT 20
          `;
          params.city = city;
        } else if (province) {
          query = `
            MATCH (c:Company)-[:IN_PROVINCE]->(prov:Province {name: $province})
            OPTIONAL MATCH (c)-[:IN_CITY]->(city:City)
            RETURN city.name AS cluster, count(c) AS count
            ORDER BY count DESC LIMIT 20
          `;
          params.province = province;
        } else {
          query = `
            MATCH (c:Company)-[:IN_PROVINCE]->(prov:Province)
            RETURN prov.name AS cluster, count(c) AS count
            ORDER BY count DESC LIMIT 20
          `;
        }

        const result = await session.run(query, params);
        return result.records.map((r) => ({
          name: r.get(0) as string,
          count: (r.get(1) as { toNumber?: () => number })?.toNumber?.() ?? (r.get(1) as number),
        }));
      } finally {
        await session.close();
      }
    },
  };
}

/** Helper to convert JS number to Neo4j integer. */
function neo4jInt(n: number) {
  try {
    const neo4j = require("neo4j-driver");
    return neo4j.int(n);
  } catch {
    return n;
  }
}
