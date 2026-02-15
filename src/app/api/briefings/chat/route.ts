import { NextRequest, NextResponse } from "next/server";
import {
  briefingsApi,
  companiesApi,
  leadsApi,
  metricsApi,
  newsApi,
} from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const DASHSCOPE_BASE_URL =
  "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";

/* ── Tools ─────────────────────────────────────────────────────── */

const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "get_briefings",
      description:
        "Get outreach briefings for a specific date. Returns company names, opportunity types, email drafts, call scripts, and statuses (pending/reviewed/sent/skipped).",
      parameters: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description:
              "Date in YYYY-MM-DD format. Defaults to today if not specified.",
          },
          status: {
            type: "string",
            enum: ["pending", "reviewed", "sent", "skipped"],
            description: "Optional status filter.",
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_briefing_stats",
      description:
        "Get summary statistics for briefings on a given date: total, pending, reviewed, sent, skipped counts.",
      parameters: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "Date in YYYY-MM-DD format.",
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_briefing_dates",
      description:
        "List dates that have briefing data available. Returns up to 14 most recent dates.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_news",
      description:
        "Get the AI-generated news digest for a specific date. Returns curated tech, SA business, fintech, and B2B news.",
      parameters: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "Date in YYYY-MM-DD format.",
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_lead_metrics",
      description:
        "Get lead and blog metrics: total leads, leads by source breakdown, blog post count, and recent leads activity.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_company_stats",
      description:
        "Get aggregate company database statistics: total count, by source, by province, coverage details.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_companies",
      description:
        "Search the company database by name, category, city, or province.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Free-text search term." },
          city: { type: "string", description: "Filter by city." },
          province: { type: "string", description: "Filter by province." },
          limit: {
            type: "number",
            description: "Max results (default 20, max 50).",
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_leads",
      description:
        "Search leads by name, email, or phone. Returns lead details with source, status, and creation date.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Free-text search term." },
          source: {
            type: "string",
            description: "Filter by lead source (e.g. 'website', 'referral').",
          },
          limit: {
            type: "number",
            description: "Max results (default 20).",
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "web_search",
      description:
        "Search the internet for real-time information about South African business news, industry trends, company research, or any other topic. Use this when the user asks about current events, news, or information not in the database.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query.",
          },
        },
        required: ["query"],
      },
    },
  },
];

/* ── Tool execution ────────────────────────────────────────────── */

async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);

  try {
    switch (name) {
      case "get_briefings": {
        const date = (args.date as string) || today;
        const status = args.status as string | undefined;
        const result = await briefingsApi.listByDate(
          date,
          status as "pending" | "reviewed" | "sent" | "skipped" | undefined
        );
        return JSON.stringify({
          date,
          total: result.total,
          briefings: result.items.map((b) => ({
            id: b.id,
            company_name: b.company_name,
            company_id: b.company_id,
            opportunity_type: b.opportunity_type,
            opportunity_summary: b.opportunity_summary,
            priority: b.priority,
            status: b.status,
            email_subject: b.email_draft_subject,
            has_email: !!b.email_draft_body,
            has_call_script: !!b.call_script,
            created_at: b.created_at,
          })),
        });
      }

      case "get_briefing_stats": {
        const date = (args.date as string) || today;
        const stats = await briefingsApi.statsForDate(date);
        return JSON.stringify({ date, ...stats });
      }

      case "get_briefing_dates": {
        const dates = await briefingsApi.listDates(14);
        return JSON.stringify({ dates, total: dates.length });
      }

      case "get_news": {
        const date = (args.date as string) || today;
        const news = await newsApi.getByDate(date);
        if (!news) return JSON.stringify({ date, available: false });
        return JSON.stringify({
          date,
          available: true,
          topics: news.topics,
          content: news.content,
        });
      }

      case "get_lead_metrics": {
        const [summary, bySource] = await Promise.all([
          metricsApi.summary(),
          metricsApi.leadsBySource(),
        ]);
        return JSON.stringify({ ...summary, leadsBySource: bySource });
      }

      case "get_company_stats": {
        const stats = await companiesApi.stats();
        return JSON.stringify(stats);
      }

      case "search_companies": {
        const result = await companiesApi.list({
          search: args.search as string | undefined,
          city: args.city as string | undefined,
          province: args.province as string | undefined,
          limit: Math.min((args.limit as number) || 20, 50),
        });
        return JSON.stringify({
          total: result.total,
          companies: result.companies.map((c) => ({
            id: c.id,
            name: c.name,
            category: c.category,
            city: c.city,
            province: c.province,
            phone: c.phone,
            email: c.email,
            website: c.website,
          })),
        });
      }

      case "search_leads": {
        const result = await leadsApi.list({
          search: args.search as string | undefined,
          source: args.source as string | undefined,
          limit: Math.min((args.limit as number) || 20, 50),
        });
        return JSON.stringify({
          total: result.total,
          leads: result.leads.map((l) => ({
            id: l.id,
            name: l.name,
            email: l.email,
            phone: l.phone,
            source: l.source,
            created_at: l.created_at,
          })),
        });
      }

      case "web_search": {
        // This tool is a signal to the LLM to use its web search capability
        // We return an instruction for the model
        return JSON.stringify({
          instruction:
            "Use your built-in web search capability to find information about: " +
            (args.query as string),
        });
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (error) {
    console.error(`[briefings-chat] Tool ${name} error:`, error);
    return JSON.stringify({
      error: `Failed to execute ${name}: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

/* ── System prompt ─────────────────────────────────────────────── */

const SYSTEM_PROMPT = `You are Stalela AI — an intelligent business assistant for a South African B2B services company. You have access to the full Stalela command centre: outreach briefings, lead pipeline, company database, news digests, and metrics.

You help the CEO/founder with:
- **Outreach insights**: Which companies to prioritize, follow-up suggestions, email draft improvements
- **Pipeline analysis**: Lead conversion, source effectiveness, follow-up gaps
- **Market intelligence**: Industry trends from news digests, competitor activity, regional opportunities
- **Metrics & reporting**: Daily/weekly summaries, KPI tracking, growth patterns
- **Strategic advice**: Which industries to target, seasonal opportunities, expansion areas

FORMATTING RULES — follow these strictly:
- Start every response with a **## Title** that summarizes the answer
- Use **### Subsections** to organize different topics
- Use **bold** for company names, key metrics, and critical info
- Use numbered lists (1. 2. 3.) for action items and ranked lists
- Use bullet points (- ) for details and supporting info
- Use markdown tables (| Header | Header |) when comparing data or showing stats
- Use > blockquotes for key insights or recommendations
- Use \`inline code\` for IDs, dates, or technical values
- Use --- horizontal rules to separate major sections
- Add emoji prefixes to section headers for visual scanning: 📊 for metrics, 🎯 for targets, 📧 for email, 📞 for calls, 🏢 for companies, 📰 for news, ⚡ for urgent, ✅ for done, 🔄 for pending
- Keep paragraphs short (2-3 sentences max)
- End with a > **💡 Recommendation:** or > **⚡ Next Step:** when applicable

BEHAVIOR RULES:
1. ALWAYS use tools to look up real data — never guess or fabricate numbers/names.
2. Be concise but actionable. Prioritize insights that drive decisions.
3. When discussing briefings, reference specific companies and opportunities.
4. For follow-up questions, check briefing statuses to see what's been actioned.
5. When asked for summaries, pull data from multiple sources (briefings + metrics + news).
6. Be proactive — if you spot patterns or opportunities in the data, mention them.
7. South African context: ZAR currency, SA provinces, local business culture.
8. Today's date is: ${new Date().toISOString().slice(0, 10)}.`;

/* ── Chat types ────────────────────────────────────────────────── */

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/* ── POST handler ──────────────────────────────────────────────── */

export async function POST(request: NextRequest) {
  try {
    if (!DASHSCOPE_API_KEY) {
      return NextResponse.json(
        { error: "DASHSCOPE_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { question, history } = body as {
      question: string;
      history?: ChatMessage[];
    };

    if (!question?.trim()) {
      return NextResponse.json(
        { error: "question is required" },
        { status: 400 }
      );
    }

    // Build messages
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages: any[] = [{ role: "system", content: SYSTEM_PROMPT }];

    if (history?.length) {
      for (const msg of history) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }
    messages.push({ role: "user", content: question });

    // Agentic loop
    const MAX_TOOL_ROUNDS = 6;
    let round = 0;
    let finalContent = "";

    while (round < MAX_TOOL_ROUNDS) {
      round++;

      const requestBody: Record<string, unknown> = {
        model: "qwen3-max",
        messages,
        tools: TOOLS,
        enable_thinking: false,
      };

      console.log(
        "[briefings-chat] Round",
        round,
        "| messages:",
        messages.length
      );

      const response = await fetch(`${DASHSCOPE_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(
          "[briefings-chat] DashScope error:",
          response.status,
          errText
        );

        if (round === 1) {
          // Fallback without tools
          const fallbackRes = await fetch(
            `${DASHSCOPE_BASE_URL}/chat/completions`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
              },
              body: JSON.stringify({
                model: "qwen3-max",
                messages,
                enable_search: true,
                search_options: { search_strategy: "agent" },
                enable_thinking: false,
              }),
            }
          );

          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json();
            finalContent =
              fallbackData.choices?.[0]?.message?.content || "No response.";
            break;
          }
        }

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
      messages.push(assistantMessage);

      if (
        assistantMessage.tool_calls &&
        assistantMessage.tool_calls.length > 0
      ) {
        for (const toolCall of assistantMessage.tool_calls) {
          const fnName = toolCall.function.name;
          let fnArgs: Record<string, unknown> = {};
          try {
            fnArgs = JSON.parse(toolCall.function.arguments || "{}");
          } catch {
            fnArgs = {};
          }

          console.log(`[briefings-chat] Tool: ${fnName}`, fnArgs);

          // Special handling for web_search — re-call with enable_search
          if (fnName === "web_search") {
            const searchQuery = (fnArgs.query as string) || question;
            const webRes = await fetch(
              `${DASHSCOPE_BASE_URL}/chat/completions`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
                },
                body: JSON.stringify({
                  model: "qwen3-max",
                  messages: [
                    {
                      role: "user",
                      content: `Search the web and provide a concise summary about: ${searchQuery}`,
                    },
                  ],
                  enable_search: true,
                  search_options: { search_strategy: "agent" },
                  enable_thinking: false,
                }),
              }
            );

            let webResult = "Web search failed.";
            if (webRes.ok) {
              const webData = await webRes.json();
              webResult =
                webData.choices?.[0]?.message?.content || "No results.";
            }

            messages.push({
              role: "tool",
              content: webResult,
              tool_call_id: toolCall.id,
            });
          } else {
            const toolResult = await executeTool(fnName, fnArgs);
            messages.push({
              role: "tool",
              content: toolResult,
              tool_call_id: toolCall.id,
            });
          }
        }
        continue;
      }

      finalContent = assistantMessage.content || "";
      break;
    }

    // Force final answer if rounds exhausted
    if (!finalContent) {
      messages.push({
        role: "user",
        content:
          "Summarize all the data you've gathered and provide your final answer now. Do not call any more tools.",
      });

      const finalRes = await fetch(`${DASHSCOPE_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "qwen3-max",
          messages,
          enable_thinking: false,
        }),
      });

      if (finalRes.ok) {
        const finalData = await finalRes.json();
        finalContent =
          finalData.choices?.[0]?.message?.content ||
          "Sorry, I couldn't generate a response.";
      } else {
        finalContent =
          "Sorry, I collected data but couldn't generate a final response.";
      }
    }

    // Stream response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      start(controller) {
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
    console.error("[briefings-chat] Error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
