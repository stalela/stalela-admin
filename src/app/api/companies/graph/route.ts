import { NextRequest, NextResponse } from "next/server";
import { companiesApi } from "@/lib/api";

export const dynamic = "force-dynamic";

/** POST /api/companies/graph — body: { companyId, depth } */
export async function POST(request: NextRequest) {
  try {
    const { companyId, depth = 1 } = await request.json();

    if (!companyId || typeof companyId !== "string") {
      return NextResponse.json(
        { error: "companyId is required" },
        { status: 400 }
      );
    }

    // Check Neo4j availability
    if (!process.env.NEO4J_URI || !process.env.NEO4J_USER || !process.env.NEO4J_PASSWORD) {
      return NextResponse.json(
        { error: "Neo4j is not configured" },
        { status: 503 }
      );
    }

    // Look up company to get source:source_id (Neo4j uses this as supabaseId)
    const company = await companiesApi.getById(companyId);
    const neo4jId = `${company.source}:${company.source_id}`;

    // Lazy import to avoid crashes when Neo4j env is not set
    const { createNeo4jApi } = await import("@/lib/neo4j-api");
    const neo4jApi = createNeo4jApi();

    const graphData = await neo4jApi.getGraph(
      neo4jId,
      Math.min(Math.max(Number(depth), 1), 3)
    );

    return NextResponse.json(graphData);
  } catch (err) {
    console.error("Graph query error:", err);
    return NextResponse.json(
      { error: "Failed to query graph" },
      { status: 500 }
    );
  }
}
