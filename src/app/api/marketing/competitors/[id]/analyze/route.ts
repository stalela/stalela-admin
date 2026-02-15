import { NextRequest, NextResponse } from "next/server";
import { competitorsApi } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const DASHSCOPE_BASE_URL =
  "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";

const SYSTEM_PROMPT = `You are an elite competitive intelligence analyst specializing in digital marketing and advertising strategy. You analyze competitor websites and provide structured, actionable intelligence.

You will receive the HTML content of a competitor's website. Analyze it thoroughly and produce a structured JSON report.

You MUST return ONLY valid JSON (no markdown, no code blocks). The JSON must match this exact structure:

{
  "brand_positioning": "How this competitor positions itself — premium vs budget, niche vs broad, what unique value they claim",
  "target_audience": "Who they're targeting based on messaging, imagery, pricing, and content — demographics, psychographics, industry verticals",
  "messaging_strategy": "Core messaging themes, tone of voice, key value propositions, taglines, emotional appeals they use",
  "platform_presence": ["Platform1", "Platform2"],
  "ad_patterns": ["Pattern 1 — e.g., heavy use of testimonials", "Pattern 2 — e.g., free trial CTAs"],
  "strengths": ["Strength 1", "Strength 2"],
  "weaknesses": ["Weakness 1", "Weakness 2"],
  "differentiation_tips": ["Tip 1 — how the client can differentiate against this competitor", "Tip 2"]
}

Rules:
- platform_presence: list all social/ad platforms you can detect from links, icons, or meta tags (e.g. Facebook, Instagram, LinkedIn, TikTok, Google Ads, YouTube)
- ad_patterns: infer likely advertising patterns from CTAs, landing page structure, promotional content
- strengths/weaknesses: each should have 3-5 items
- differentiation_tips: provide 3-5 actionable tips for the client
- Be specific and evidence-based — reference actual content from the website
- Do NOT wrap JSON in markdown. Return raw JSON only.`;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!DASHSCOPE_API_KEY) {
      return NextResponse.json(
        { error: "DASHSCOPE_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { tenant_name, tenant_industry } = body as {
      tenant_name?: string;
      tenant_industry?: string;
    };

    // Get competitor info
    let competitor;
    try {
      competitor = await competitorsApi.getById(id);
    } catch {
      return NextResponse.json(
        { error: "Competitor not found" },
        { status: 404 }
      );
    }

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        function sendEvent(data: Record<string, unknown>) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        }

        try {
          sendEvent({ status: "Crawling competitor website..." });

          // Crawl the competitor's website
          let pageHtml = "";
          if (competitor.website) {
            try {
              const crawlRes = await fetch(competitor.website, {
                headers: {
                  "User-Agent":
                    "Mozilla/5.0 (compatible; StalelaAuditBot/1.0; +https://stalela.com)",
                  Accept: "text/html,application/xhtml+xml",
                },
                signal: AbortSignal.timeout(15000),
              });

              if (crawlRes.ok) {
                pageHtml = await crawlRes.text();
                if (pageHtml.length > 40000) {
                  pageHtml = pageHtml.slice(0, 40000);
                }
              }
            } catch {
              pageHtml = `<p>Could not crawl ${competitor.website}</p>`;
            }
          }

          sendEvent({ status: "Analyzing competitive positioning..." });

          // Build prompt
          const contextParts = [
            `**Competitor:** ${competitor.name}`,
          ];
          if (competitor.website) contextParts.push(`**Website:** ${competitor.website}`);
          if (competitor.industry) contextParts.push(`**Industry:** ${competitor.industry}`);
          if (tenant_name) contextParts.push(`**Client (analyzing for):** ${tenant_name}`);
          if (tenant_industry) contextParts.push(`**Client industry:** ${tenant_industry}`);

          const userPrompt = `Analyze this competitor and produce a competitive intelligence report.\n\n${contextParts.join("\n")}\n\n${pageHtml ? `Website HTML (truncated):\n\`\`\`html\n${pageHtml.slice(0, 30000)}\n\`\`\`\n\n` : ""}Return your analysis as raw JSON matching the required structure.`;

          // Call DashScope
          const aiResponse = await fetch(
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
                  { role: "system", content: SYSTEM_PROMPT },
                  { role: "user", content: userPrompt },
                ],
                stream: true,
                enable_thinking: false,
              }),
            }
          );

          if (!aiResponse.ok) {
            const errText = await aiResponse.text();
            console.error("[competitor-analyze] DashScope error:", aiResponse.status, errText);
            throw new Error(`AI service error: ${aiResponse.status}`);
          }

          sendEvent({ status: "Evaluating strengths and weaknesses..." });

          // Process SSE stream
          const reader = aiResponse.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let fullContent = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const data = trimmed.slice(5).trim();
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  fullContent += content;
                }
              } catch {
                // skip
              }
            }
          }

          sendEvent({ status: "Generating differentiation tips..." });

          // Parse AI response
          let analysis;
          try {
            let cleaned = fullContent.trim();
            if (cleaned.startsWith("```")) {
              cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
            }
            analysis = JSON.parse(cleaned);
          } catch (parseErr) {
            console.error("[competitor-analyze] Parse error:", parseErr);
            analysis = {
              brand_positioning: "Analysis could not be completed",
              target_audience: "Unknown",
              messaging_strategy: "Unknown",
              platform_presence: [],
              ad_patterns: [],
              strengths: [],
              weaknesses: [],
              differentiation_tips: ["Re-run the analysis"],
            };
          }

          // Save analysis to competitor record
          await competitorsApi.update(id, {
            ad_analysis: analysis,
            last_analyzed_at: new Date().toISOString(),
          });

          sendEvent({
            status: "Analysis complete!",
            analysis,
          });

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          console.error("[competitor-analyze] Stream error:", err);
          sendEvent({
            status: "Analysis failed",
            error: err instanceof Error ? err.message : "Unknown error",
          });
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
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
    console.error("[competitor-analyze] Error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
