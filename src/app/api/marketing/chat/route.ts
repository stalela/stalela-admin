import { NextRequest, NextResponse } from "next/server";
import {
  auditsApi,
  campaignsApi,
  competitorsApi,
  platformsApi,
  tenantsApi,
  chatApi,
} from "@/lib/api";

import type { CampaignPlatform } from "@stalela/commons/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const DASHSCOPE_BASE_URL =
  "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";

/* ------------------------------------------------------------------ */
/*  Tool definitions                                                    */
/* ------------------------------------------------------------------ */

const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "get_audit_report",
      description:
        "Get the latest website audit report for the tenant. Returns brand summary, market positioning, ad readiness score, section analyses, and recommendations.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_campaigns",
      description:
        "List the tenant's marketing campaigns. Returns campaign names, platforms, status, budget, and date range.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            description:
              "Optional filter by status: draft, scheduled, active, paused, completed.",
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_competitors",
      description:
        "List tracked competitors and their AI analysis. Returns competitor names, websites, brand positioning, strengths, weaknesses, and differentiation tips.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_platform_status",
      description:
        "Get the connection status of all ad platforms (Meta, Google, LinkedIn, TikTok, X). Shows which platforms are connected, account names, and connection status.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "generate_ad_copy",
      description:
        "Generate ad copy for a specific platform and goal. Returns headline, primary text, description, and CTA options. Use when the user asks to write or draft ad copy.",
      parameters: {
        type: "object",
        properties: {
          platform: {
            type: "string",
            description:
              "Target platform: meta, google, linkedin, tiktok, or x.",
          },
          goal: {
            type: "string",
            description:
              "Campaign goal or product/service to promote. Be specific about the offer.",
          },
          tone: {
            type: "string",
            description:
              "Desired tone: professional, casual, urgent, playful, authoritative. Default: professional.",
          },
        },
        required: ["platform", "goal"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_campaign_draft",
      description:
        "Create a new campaign draft with the given details. Returns the created campaign. Use when the user wants to start a new campaign.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Campaign name.",
          },
          platform: {
            type: "string",
            description: "Target platform: meta, google, linkedin, tiktok, x.",
          },
          objective: {
            type: "string",
            description:
              "Campaign objective: awareness, traffic, engagement, leads, conversions.",
          },
          budget: {
            type: "number",
            description: "Daily budget in ZAR.",
          },
        },
        required: ["name", "platform"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "analyze_website",
      description:
        "Quickly analyze any website URL and provide marketing insights. Use when the user asks about a specific website or competitor URL.",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "The full URL to analyze.",
          },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_marketing_tips",
      description:
        "Get contextual marketing tips based on the tenant's industry, current audit score, and active campaigns. Use when the user asks for advice or suggestions.",
      parameters: {
        type: "object",
        properties: {
          topic: {
            type: "string",
            description:
              "Specific topic: seo, social_media, paid_ads, email, content, branding, conversion.",
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
  args: Record<string, unknown>,
  tenantId: string,
  tenantContext: TenantContext
): Promise<string> {
  try {
    switch (name) {
      case "get_audit_report": {
        const audits = await auditsApi.list(tenantId);
        const latest = audits.find(
          (a: { status: string }) => a.status === "complete"
        );
        if (!latest || !latest.report) {
          return JSON.stringify({
            message: "No completed audit found. Suggest running a website audit first.",
          });
        }
        return JSON.stringify({
          url: latest.url,
          score: latest.report.ad_readiness_score,
          brand_summary: latest.report.brand_summary,
          market_positioning: latest.report.market_positioning,
          recommendations: latest.report.recommendations,
          sections: latest.report.sections?.map(
            (s: { title: string; score?: number; content: string }) => ({
              title: s.title,
              score: s.score ?? 0,
              summary: s.content?.slice(0, 200),
            })
          ),
        });
      }

      case "get_campaigns": {
        const result = await campaignsApi.list(tenantId);
        const allCampaigns = result.campaigns || result;
        const campaignArray = Array.isArray(allCampaigns) ? allCampaigns : [];
        const filtered = args.status
          ? campaignArray.filter(
              (c: { status: string }) => c.status === args.status
            )
          : campaignArray;
        return JSON.stringify({
          count: filtered.length,
          campaigns: filtered.map(
            (c: {
              id: string;
              name: string;
              platform: string;
              status: string;
              objective: string | null;
              budget: number | null;
              start_date: string | null;
              end_date: string | null;
            }) => ({
              id: c.id,
              name: c.name,
              platform: c.platform,
              status: c.status,
              objective: c.objective,
              budget: c.budget,
              start_date: c.start_date,
              end_date: c.end_date,
            })
          ),
        });
      }

      case "get_competitors": {
        const competitors = await competitorsApi.list(tenantId);
        return JSON.stringify({
          count: competitors.length,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          competitors: competitors.map((c: any) => ({
            id: c.id,
            name: c.name,
            website: c.website,
            analyzed: !!c.ad_analysis,
            analysis_summary: c.ad_analysis
              ? {
                  brand_positioning: c.ad_analysis.brand_positioning,
                  strengths: c.ad_analysis.strengths,
                  weaknesses: c.ad_analysis.weaknesses,
                }
              : null,
            last_analyzed_at: c.last_analyzed_at,
          })),
        });
      }

      case "get_platform_status": {
        const connections = await platformsApi.list(tenantId);
        const platforms = ["meta", "google", "linkedin", "tiktok", "x"];
        return JSON.stringify({
          platforms: platforms.map((p) => {
            const conn = connections.find(
              (c: { platform: string }) => c.platform === p
            );
            return {
              platform: p,
              status: conn?.status || "disconnected",
              account_name: conn?.account_name || null,
            };
          }),
        });
      }

      case "generate_ad_copy": {
        // Use the AI itself to generate — return a structured prompt result
        const platform = (args.platform as string) || "meta";
        const goal = (args.goal as string) || "general promotion";
        const tone = (args.tone as string) || "professional";

        return JSON.stringify({
          platform,
          goal,
          tone,
          instruction: `Generate ${platform} ad copy for: "${goal}" in a ${tone} tone. Include headline (max 40 chars), primary text (max 125 chars for Meta, 90 for Google), description, and 3 CTA options. Consider the tenant's brand: ${tenantContext.companyName}, industry: ${tenantContext.industry}.`,
        });
      }

      case "create_campaign_draft": {
        const campaign = await campaignsApi.create({
          tenant_id: tenantId,
          name: (args.name as string) || "Untitled Campaign",
          platform: ((args.platform as string) || "meta") as CampaignPlatform,
          objective: (args.objective as string) || "awareness",
          status: "draft",
          budget: (args.budget as number) || 0,
        });
        return JSON.stringify({
          success: true,
          campaign_id: campaign.id,
          name: campaign.name,
          message: `Campaign "${campaign.name}" created as draft. View it at /marketing/campaigns/${campaign.id}`,
        });
      }

      case "analyze_website": {
        const url = args.url as string;
        if (!url)
          return JSON.stringify({ error: "URL is required" });

        try {
          const res = await fetch(url, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (compatible; StalelaBot/1.0; +https://stalela.com)",
              Accept: "text/html",
            },
            signal: AbortSignal.timeout(10000),
          });
          const html = await res.text();
          const titleMatch = html.match(
            /<title[^>]*>([\s\S]*?)<\/title>/i
          );
          const descMatch = html.match(
            /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)/i
          );
          const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)]
            .map((m) => m[1].replace(/<[^>]+>/g, "").trim())
            .slice(0, 3);

          return JSON.stringify({
            url,
            title: titleMatch?.[1]?.trim() || null,
            description: descMatch?.[1]?.trim() || null,
            h1_tags: h1s,
            html_length: html.length,
            instruction:
              "Analyze this website's marketing positioning, strengths, and areas for improvement based on the extracted data.",
          });
        } catch (e) {
          return JSON.stringify({
            error: `Could not fetch: ${e instanceof Error ? e.message : "unknown"}`,
          });
        }
      }

      case "get_marketing_tips": {
        const topic = (args.topic as string) || "general";
        return JSON.stringify({
          topic,
          context: {
            industry: tenantContext.industry,
            company: tenantContext.companyName,
            has_audit: tenantContext.hasAudit,
            audit_score: tenantContext.auditScore,
            connected_platforms: tenantContext.connectedPlatforms,
            active_campaigns: tenantContext.activeCampaigns,
          },
          instruction: `Provide 5-7 specific, actionable ${topic} marketing tips for a ${tenantContext.industry || "business"} company named "${tenantContext.companyName}". Consider their audit score of ${tenantContext.auditScore ?? "unknown"}/100, ${tenantContext.connectedPlatforms} connected platforms, and ${tenantContext.activeCampaigns} active campaigns. Be South Africa-market aware.`,
        });
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (e) {
    console.error(`[marketing-chat-tool] Error executing ${name}:`, e);
    return JSON.stringify({
      error: `Tool failed: ${e instanceof Error ? e.message : String(e)}`,
    });
  }
}

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface TenantContext {
  companyName: string;
  website: string | null;
  industry: string | null;
  hasAudit: boolean;
  auditScore: number | null;
  connectedPlatforms: number;
  activeCampaigns: number;
  competitorCount: number;
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
    const { message, session_id, tenant_id, user_id } = body as {
      message: string;
      session_id: string;
      tenant_id: string;
      user_id: string;
    };

    if (!message?.trim() || !session_id || !tenant_id || !user_id) {
      return NextResponse.json(
        { error: "message, session_id, tenant_id, and user_id are required" },
        { status: 400 }
      );
    }

    // Save user message
    await chatApi.addMessage({
      session_id,
      tenant_id,
      user_id,
      role: "user",
      content: message,
    });

    // Build tenant context for system prompt
    let tenantContext: TenantContext = {
      companyName: "Unknown",
      website: null,
      industry: null,
      hasAudit: false,
      auditScore: null,
      connectedPlatforms: 0,
      activeCampaigns: 0,
      competitorCount: 0,
    };

    try {
      const [tenant, audits, connections, campaigns, competitors] =
        await Promise.all([
          tenantsApi.getById(tenant_id).catch(() => null),
          auditsApi.list(tenant_id).catch(() => []),
          platformsApi.list(tenant_id).catch(() => []),
          campaignsApi.list(tenant_id).catch(() => []),
          competitorsApi.list(tenant_id).catch(() => []),
        ]);

      const latestAudit = (audits as { status: string; report?: { ad_readiness_score?: number } }[]).find(
        (a) => a.status === "complete"
      );

      tenantContext = {
        companyName: tenant?.name || "Unknown",
        website: tenant?.website_url || null,
        industry: (tenant?.settings as Record<string, unknown>)?.industry as string || null,
        hasAudit: !!latestAudit,
        auditScore: latestAudit?.report?.ad_readiness_score ?? null,
        connectedPlatforms: (connections as { status: string }[]).filter(
          (c) => c.status === "connected"
        ).length,
        activeCampaigns: (campaigns as { status: string }[]).filter(
          (c) => c.status === "active"
        ).length,
        competitorCount: (competitors as unknown[]).length,
      };
    } catch {
      // best effort
    }

    const systemPrompt = `You are Lalela, an AI marketing assistant for Stalela — a South African B2B marketing platform. You help small and medium businesses improve their digital marketing.

PERSONALITY:
- Warm, knowledgeable, and action-oriented
- Use clear, jargon-free language
- South Africa market-aware (ZAR currency, local platforms, local business context)
- Suggest next steps and provide specific, actionable advice

CURRENT TENANT CONTEXT:
- Company: ${tenantContext.companyName}
- Website: ${tenantContext.website || "Not set"}
- Industry: ${tenantContext.industry || "Not specified"}
- Audit Score: ${tenantContext.auditScore !== null ? `${tenantContext.auditScore}/100` : "No audit yet"}
- Connected Platforms: ${tenantContext.connectedPlatforms}
- Active Campaigns: ${tenantContext.activeCampaigns}
- Tracked Competitors: ${tenantContext.competitorCount}

CAPABILITIES (use your tools):
1. Retrieve the latest website audit report and explain scores
2. List and analyze campaigns
3. View tracked competitors and their analysis
4. Check ad platform connection status
5. Generate ad copy for any platform
6. Create campaign drafts
7. Analyze any website URL
8. Provide contextual marketing tips

RULES:
1. ALWAYS use tools when the user asks about their data — don't guess.
2. When generating ad copy, use the generate_ad_copy tool to get context, then craft the copy yourself.
3. Format responses with markdown — use headers, bullet points, and bold for key information.
4. If the user hasn't run an audit yet, suggest doing one.
5. Be proactive — if you see opportunities while answering, mention them.
6. Keep responses concise but thorough. Aim for actionable advice.
7. When creating campaigns, confirm the details before using create_campaign_draft.`;

    // Load conversation history
    const previousMessages = await chatApi.getMessages(session_id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages: any[] = [{ role: "system", content: systemPrompt }];

    for (const msg of previousMessages) {
      if (msg.role === "user" || msg.role === "assistant") {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    // Current message is already at the end (we just saved it and it's in previousMessages)
    // But since getMessages was called just after addMessage, it should be included.
    // However, to be safe, check if the last message matches:
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role !== "user" || lastMsg?.content !== message) {
      messages.push({ role: "user", content: message });
    }

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
        "[marketing-chat] Round",
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
          "[marketing-chat] DashScope error:",
          response.status,
          errText
        );

        if (round === 1) {
          // Retry without tools
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
                enable_thinking: false,
              }),
            }
          );

          if (fallbackRes.ok) {
            const data = await fallbackRes.json();
            finalContent =
              data.choices?.[0]?.message?.content || "No response.";
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

          console.log(`[marketing-chat] Tool call: ${fnName}`, fnArgs);
          const toolResult = await executeTool(
            fnName,
            fnArgs,
            tenant_id,
            tenantContext
          );

          messages.push({
            role: "tool",
            content: toolResult,
            tool_call_id: toolCall.id,
          });
        }

        continue;
      }

      finalContent = assistantMessage.content || "";
      break;
    }

    // Exhausted rounds — force final answer
    if (!finalContent) {
      messages.push({
        role: "user",
        content:
          "Please summarize all the data you've gathered and provide your final answer now.",
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
          "Sorry, I could not generate a response.";
      } else {
        finalContent =
          "Sorry, I gathered data but could not generate a final response. Please try again.";
      }
    }

    // Save assistant message
    await chatApi.addMessage({
      session_id,
      tenant_id,
      user_id,
      role: "assistant",
      content: finalContent,
    });

    // Auto-title: if this is the first exchange, generate a session title
    const allMessages = await chatApi.getMessages(session_id);
    const userMessages = allMessages.filter(
      (m: { role: string }) => m.role === "user"
    );
    if (userMessages.length === 1) {
      const title =
        message.length > 50 ? message.slice(0, 47) + "..." : message;
      await chatApi.updateSessionTitle(session_id, title).catch(() => {});
    }

    // Stream the response back
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      start(controller) {
        const chunkSize = 30;
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
    console.error("[marketing-chat] Error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
