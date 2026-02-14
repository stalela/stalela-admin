import { NextRequest, NextResponse } from "next/server";
import { companiesApi } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // Agent loop can take longer

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const DASHSCOPE_BASE_URL =
  "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";

/* ------------------------------------------------------------------ */
/*  Tool definitions (OpenAI function-calling format)                  */
/* ------------------------------------------------------------------ */

const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "search_companies",
      description:
        "Search the company database by name, category, city, province, or source. Returns a list of matching companies with full details. Use this to find businesses matching a description or query.",
      parameters: {
        type: "object",
        properties: {
          search: {
            type: "string",
            description:
              "Free-text search term to match against company name, email, or phone.",
          },
          city: {
            type: "string",
            description:
              "Filter by city name (e.g. 'Cape Town', 'Johannesburg').",
          },
          province: {
            type: "string",
            description:
              "Filter by province (e.g. 'Western Cape', 'Gauteng', 'KwaZulu-Natal').",
          },
          source: {
            type: "string",
            description:
              "Filter by data source: 'yep', 'bizcommunity', or 'bestdirectory'.",
          },
          limit: {
            type: "number",
            description: "Max results to return (default 20, max 50).",
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "find_nearby_companies",
      description:
        "Find companies near a specific GPS coordinate within a radius. Use this for proximity/distance queries like 'businesses near X' or 'within Y km of Z'. You need the latitude and longitude of the reference point.",
      parameters: {
        type: "object",
        properties: {
          latitude: {
            type: "number",
            description: "Latitude of the center point.",
          },
          longitude: {
            type: "number",
            description: "Longitude of the center point.",
          },
          radius_km: {
            type: "number",
            description: "Search radius in kilometers (default 10).",
          },
          limit: {
            type: "number",
            description: "Max results to return (default 10).",
          },
        },
        required: ["latitude", "longitude"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_company_details",
      description:
        "Get full details for a specific company by its ID. Use this when you already have a company ID and need more information, or when you need GPS coordinates for a proximity search.",
      parameters: {
        type: "object",
        properties: {
          company_id: {
            type: "string",
            description: "The UUID of the company.",
          },
        },
        required: ["company_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_company_stats",
      description:
        "Get aggregate statistics about all companies in the database: total count, breakdown by source, by province, and counts of companies with phone/email/website/GPS.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_company_graph",
      description:
        "Query the Neo4j graph database to get relationships and connections for a company. Returns connected companies and their relationship types. Use for questions about company networks, suppliers, competitors, or business relationships.",
      parameters: {
        type: "object",
        properties: {
          company_id: {
            type: "string",
            description: "The UUID (supabaseId) of the company.",
          },
          depth: {
            type: "number",
            description:
              "How many relationship hops to traverse (1-3, default 1).",
          },
        },
        required: ["company_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_competitors",
      description:
        "Find companies that compete with a given company based on graph relationships. Returns companies connected via COMPETES_WITH relationship in Neo4j.",
      parameters: {
        type: "object",
        properties: {
          company_id: {
            type: "string",
            description: "The UUID (supabaseId) of the company.",
          },
        },
        required: ["company_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_clusters",
      description:
        "Get an overview of business clusters — how many companies per province, per city (if province given), or per category (if city given). Use for market analysis and business concentrations.",
      parameters: {
        type: "object",
        properties: {
          province: {
            type: "string",
            description:
              "Optional province to drill into (shows cities within).",
          },
          city: {
            type: "string",
            description:
              "Optional city to drill into (shows categories within).",
          },
        },
      },
    },
  },
];

/* ------------------------------------------------------------------ */
/*  Tool execution                                                      */
/* ------------------------------------------------------------------ */

async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  try {
    switch (name) {
      case "search_companies": {
        const result = await companiesApi.list({
          search: args.search as string | undefined,
          city: args.city as string | undefined,
          province: args.province as string | undefined,
          source: args.source as string | undefined,
          limit: Math.min((args.limit as number) || 20, 50),
        });
        const companies = result.companies.map((c) => ({
          id: c.id,
          name: c.name,
          category: c.category,
          categories: c.categories,
          city: c.city,
          province: c.province,
          phone: c.phone,
          email: c.email,
          website: c.website,
          description: c.short_description || c.description,
          latitude: c.latitude,
          longitude: c.longitude,
          source: c.source,
        }));
        return JSON.stringify({
          total: result.total,
          count: companies.length,
          companies,
        });
      }

      case "find_nearby_companies": {
        const lat = args.latitude as number;
        const lng = args.longitude as number;
        const radius = (args.radius_km as number) || 10;
        const limit = Math.min((args.limit as number) || 10, 50);
        const results = await companiesApi.nearby(lat, lng, radius, limit);
        const companies = results.map((c) => ({
          id: c.id,
          name: c.name,
          category: c.category,
          city: c.city,
          province: c.province,
          phone: c.phone,
          email: c.email,
          website: c.website,
          description: c.short_description || c.description,
          distance_km: (c as Record<string, unknown>).distance_km,
        }));
        return JSON.stringify({ count: companies.length, companies });
      }

      case "get_company_details": {
        const company = await companiesApi.getById(args.company_id as string);
        return JSON.stringify(company);
      }

      case "get_company_stats": {
        const stats = await companiesApi.stats();
        return JSON.stringify(stats);
      }

      case "get_company_graph": {
        const { createNeo4jApi } = await import("@/lib/neo4j-api");
        const neo4jApi = createNeo4jApi();
        const depth = Math.min(Math.max((args.depth as number) || 1, 1), 3);
        const graph = await neo4jApi.getGraph(
          args.company_id as string,
          depth
        );
        return JSON.stringify({
          node_count: graph.nodes.length,
          edge_count: graph.edges.length,
          nodes: graph.nodes.map((n) => ({
            id: n.id,
            name: n.name,
            category: n.category,
            connections: n.connectionCount,
          })),
          edges: graph.edges.map((e) => ({
            from: e.source,
            to: e.target,
            relationship: e.type,
          })),
        });
      }

      case "get_competitors": {
        const { createNeo4jApi } = await import("@/lib/neo4j-api");
        const neo4jApi = createNeo4jApi();
        const competitors = await neo4jApi.getCompetitors(
          args.company_id as string
        );
        return JSON.stringify({
          count: competitors.length,
          competitors: competitors.map((c) => ({
            id: c.id,
            name: c.name,
            category: c.category,
          })),
        });
      }

      case "get_clusters": {
        const { createNeo4jApi } = await import("@/lib/neo4j-api");
        const neo4jApi = createNeo4jApi();
        const clusters = await neo4jApi.getClusters(
          args.province as string | undefined,
          args.city as string | undefined
        );
        return JSON.stringify({ clusters });
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (e) {
    console.error(`[chat-tool] Error executing ${name}:`, e);
    return JSON.stringify({
      error: `Tool execution failed: ${e instanceof Error ? e.message : String(e)}`,
    });
  }
}

/* ------------------------------------------------------------------ */
/*  System prompt                                                       */
/* ------------------------------------------------------------------ */

const SYSTEM_PROMPT = `You are an expert B2B sales intelligence assistant for South African businesses. You have tools to query real business databases — use them to answer questions factually.

CAPABILITIES:
- Search companies by name, category, city, province
- Find businesses near a GPS location (proximity search)
- Get detailed company profiles
- View aggregate market statistics
- Explore company relationship graphs (suppliers, competitors, clusters)
- Search the web for additional context

RULES:
1. ALWAYS use the available tools to look up real data before answering — do NOT guess or make up company information.
2. When the user asks about businesses near a specific company, first use get_company_details with the current company's ID to get its GPS coordinates, then use find_nearby_companies with those coordinates.
3. For category/industry queries, use search_companies with relevant search terms.
4. Format results clearly with markdown. Use tables for lists of companies when appropriate.
5. Include actionable details: phone, email, website, distance when available.
6. When you don't have enough data, say so explicitly — don't fabricate.
7. Be concise but thorough. Prioritize useful, actionable intelligence.
8. If a question is about the currently-viewed company and you have its report, use that context too.`;

/* ------------------------------------------------------------------ */
/*  Chat message types                                                  */
/* ------------------------------------------------------------------ */

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/* ------------------------------------------------------------------ */
/*  POST handler                                                        */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  try {
    if (!DASHSCOPE_API_KEY) {
      return NextResponse.json(
        { error: "DASHSCOPE_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { companyId, question, history, report } = body as {
      companyId: string;
      question: string;
      history?: ChatMessage[];
      report?: string;
    };

    if (!companyId || !question?.trim()) {
      return NextResponse.json(
        { error: "companyId and question are required" },
        { status: 400 }
      );
    }

    // Fetch company details for context
    let company;
    try {
      company = await companiesApi.getById(companyId);
    } catch {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    // Build context from company + report
    const contextParts: string[] = [
      `Currently viewing company: **${company.name}** (ID: ${company.id})`,
    ];
    if (company.website) contextParts.push(`Website: ${company.website}`);
    if (company.category) contextParts.push(`Category: ${company.category}`);
    if (company.categories?.length)
      contextParts.push(`Categories: ${company.categories.join(", ")}`);
    if (company.city || company.province)
      contextParts.push(
        `Location: ${[company.address, company.suburb, company.city, company.province, company.country].filter(Boolean).join(", ")}`
      );
    if (company.latitude && company.longitude)
      contextParts.push(`GPS: ${company.latitude}, ${company.longitude}`);
    if (company.phone) contextParts.push(`Phone: ${company.phone}`);
    if (company.email) contextParts.push(`Email: ${company.email}`);

    let systemContent = SYSTEM_PROMPT;
    systemContent += `\n\n--- CURRENT COMPANY CONTEXT ---\n${contextParts.join("\n")}`;
    if (report) {
      systemContent += `\n\n--- EXISTING RESEARCH REPORT ---\n${report}`;
    }

    // Build message history for multi-turn conversation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages: any[] = [{ role: "system", content: systemContent }];

    if (history?.length) {
      for (const msg of history) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    messages.push({ role: "user", content: question });

    // Agentic loop: call LLM, execute tools, repeat until final answer
    const MAX_TOOL_ROUNDS = 6;
    let round = 0;
    let finalContent = "";

    while (round < MAX_TOOL_ROUNDS) {
      round++;

      const response = await fetch(`${DASHSCOPE_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "qwen3-max",
          messages,
          tools: TOOLS,
          tool_choice: "auto",
          enable_search: true,
          search_options: { search_strategy: "agent" },
          enable_thinking: false,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("[chat] DashScope error:", response.status, errText);
        return NextResponse.json(
          { error: `AI service error: ${response.status}` },
          { status: 502 }
        );
      }

      const data = await response.json();
      const choice = data.choices?.[0];

      if (!choice) {
        return NextResponse.json(
          { error: "No response from AI" },
          { status: 502 }
        );
      }

      const assistantMessage = choice.message;

      // Add the assistant's message to context
      messages.push(assistantMessage);

      // Check if the model wants to call tools
      if (
        assistantMessage.tool_calls &&
        assistantMessage.tool_calls.length > 0
      ) {
        // Execute all requested tool calls
        for (const toolCall of assistantMessage.tool_calls) {
          const fnName = toolCall.function.name;
          let fnArgs: Record<string, unknown> = {};
          try {
            fnArgs = JSON.parse(toolCall.function.arguments || "{}");
          } catch {
            fnArgs = {};
          }

          console.log(`[chat] Tool call: ${fnName}`, fnArgs);
          const toolResult = await executeTool(fnName, fnArgs);

          // Add the tool result to conversation
          messages.push({
            role: "tool",
            content: toolResult,
            tool_call_id: toolCall.id,
          });
        }

        // Continue the loop — LLM needs to process tool results
        continue;
      }

      // No tool calls — this is the final text answer
      finalContent = assistantMessage.content || "";
      break;
    }

    // If we exhausted rounds without a final answer
    if (!finalContent && round >= MAX_TOOL_ROUNDS) {
      finalContent =
        "I gathered a lot of data but ran out of processing rounds. Here's what I found so far — please ask a more specific question if you need more detail.";
    }

    // Stream the final response back to the client
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      start(controller) {
        // Send the complete response in small chunks for a streaming feel
        const chunkSize = 20;
        for (let i = 0; i < finalContent.length; i += chunkSize) {
          const chunk = finalContent.slice(i, i + chunkSize);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`)
          );
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    console.error("[chat] Error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
