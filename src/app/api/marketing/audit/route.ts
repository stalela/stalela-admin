import { NextRequest, NextResponse } from "next/server";
import { auditsApi, competitorsApi } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const DASHSCOPE_BASE_URL =
  "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";

const SYSTEM_PROMPT = `You are an elite digital marketing auditor and brand strategist. You analyze websites and produce comprehensive, actionable marketing audit reports.

You will receive the raw HTML content of a website's homepage. Analyze it thoroughly and produce a structured JSON report.

You MUST return ONLY valid JSON (no markdown, no code blocks). The JSON must match this exact structure:

{
  "brand_summary": "2-3 sentence summary of what the brand is about, their value proposition, and target audience",
  "market_positioning": "Assessment of how the brand positions itself in its market — is it premium, budget, niche? Who are they trying to reach?",
  "ad_readiness_score": <number 1-100>,
  "recommendations": [
    "Specific, actionable recommendation 1",
    "Specific, actionable recommendation 2",
    "..."
  ],
  "competitor_signals": [
    { "name": "Competitor Name", "website": "https://competitor.com", "notes": "Brief competitive positioning note" }
  ],
  "sections": [
    {
      "title": "Brand & Messaging",
      "content": "Detailed analysis of brand clarity, messaging consistency, value proposition strength, taglines, and tone of voice.",
      "score": <number 1-100>
    },
    {
      "title": "Visual Design & UX",
      "content": "Analysis of visual hierarchy, color scheme, mobile-readiness signals, imagery quality, and overall design professionalism.",
      "score": <number 1-100>
    },
    {
      "title": "SEO & Content",
      "content": "Meta tags, heading structure, keyword usage, content depth, blog presence, and search optimization signals.",
      "score": <number 1-100>
    },
    {
      "title": "Conversion Optimization",
      "content": "CTAs, forms, trust signals, social proof, pricing clarity, and conversion funnel analysis.",
      "score": <number 1-100>
    },
    {
      "title": "Ad Readiness",
      "content": "Landing page suitability for paid traffic, tracking readiness (pixel/GTM hints), offer clarity, and campaign-readiness assessment.",
      "score": <number 1-100>
    },
    {
      "title": "Social & Trust Signals",
      "content": "Social media links, testimonials, reviews, certifications, press mentions, and authority indicators.",
      "score": <number 1-100>
    }
  ]
}

Rules:
- ad_readiness_score is the overall weighted score (1-100).
- Each section score is specific to that aspect (1-100).
- recommendations should have 5-8 specific, actionable items.
- competitor_signals should have 2-4 competitor objects with name, optional website URL, and notes about how they compare.
- Be honest and specific — generic advice is useless.
- If the HTML is minimal or broken, still provide the best analysis possible with lower scores.
- Do NOT wrap JSON in markdown. Return raw JSON only.`;

export async function POST(request: NextRequest) {
  try {
    if (!DASHSCOPE_API_KEY) {
      return NextResponse.json(
        { error: "DASHSCOPE_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { url, tenant_id, industry } = body as {
      url: string;
      tenant_id: string;
      industry?: string;
    };

    if (!url || !tenant_id) {
      return NextResponse.json(
        { error: "url and tenant_id are required" },
        { status: 400 }
      );
    }

    // Create audit record in pending state
    const audit = await auditsApi.create({
      tenant_id,
      url,
      status: "crawling",
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        function sendEvent(data: Record<string, unknown>) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        }

        try {
          sendEvent({ status: "Crawling your website...", audit_id: audit.id });

          // Crawl the website
          let pageHtml = "";
          try {
            const crawlRes = await fetch(url, {
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (compatible; StalelaAuditBot/1.0; +https://stalela.com)",
                Accept: "text/html,application/xhtml+xml",
              },
              signal: AbortSignal.timeout(15000),
            });

            if (!crawlRes.ok) {
              throw new Error(`HTTP ${crawlRes.status}`);
            }

            pageHtml = await crawlRes.text();

            // Truncate to ~40k chars to stay within AI token limits
            if (pageHtml.length > 40000) {
              pageHtml = pageHtml.slice(0, 40000);
            }
          } catch (crawlErr) {
            sendEvent({ status: "Could not crawl website, analyzing URL..." });
            pageHtml = `<p>Website at ${url} could not be crawled. Error: ${crawlErr instanceof Error ? crawlErr.message : "unknown"}</p>`;
          }

          // Extract key metadata for crawl_data
          const titleMatch = pageHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
          const descMatch = pageHtml.match(
            /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)/i
          );
          const h1Matches = [...pageHtml.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map(
            (m) => m[1].replace(/<[^>]+>/g, "").trim()
          );

          const crawlData = {
            title: titleMatch?.[1]?.trim() ?? null,
            meta_description: descMatch?.[1]?.trim() ?? null,
            h1_tags: h1Matches.slice(0, 5),
            html_length: pageHtml.length,
            crawled_at: new Date().toISOString(),
          };

          // Save crawl data
          await auditsApi.update(audit.id, {
            status: "analyzing",
            crawl_data: crawlData,
          });

          sendEvent({ status: "Extracting brand elements..." });

          // Build AI prompt
          const industryNote = industry
            ? `\nThe business is in the "${industry}" industry.`
            : "";
          const userPrompt = `Analyze this website and produce a marketing audit report.\n\nURL: ${url}${industryNote}\n\nPage title: ${crawlData.title ?? "N/A"}\nMeta description: ${crawlData.meta_description ?? "N/A"}\nH1 tags: ${crawlData.h1_tags.join(", ") || "N/A"}\n\nFull page HTML (truncated):\n\`\`\`html\n${pageHtml.slice(0, 30000)}\n\`\`\`\n\nReturn your analysis as a raw JSON object matching the required structure.`;

          sendEvent({ status: "Analyzing market positioning..." });

          // Call DashScope in streaming mode
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
            console.error("[audit] DashScope error:", aiResponse.status, errText);
            throw new Error(`AI service error: ${aiResponse.status}`);
          }

          sendEvent({ status: "Evaluating ad readiness..." });

          // Process SSE stream from DashScope
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
                // skip malformed
              }
            }
          }

          sendEvent({ status: "Generating recommendations..." });

          // Parse the AI response into a report
          let report;
          try {
            // Strip any markdown code fences if AI wrapped it
            let cleaned = fullContent.trim();
            if (cleaned.startsWith("```")) {
              cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
            }
            report = JSON.parse(cleaned);
          } catch (parseErr) {
            console.error("[audit] Failed to parse AI report:", parseErr);
            // Create a fallback report
            report = {
              brand_summary: "Unable to fully analyze the website. The AI response could not be parsed.",
              market_positioning: "Analysis incomplete.",
              ad_readiness_score: 0,
              recommendations: ["Ensure website is publicly accessible", "Re-run the audit"],
              competitor_signals: [],
              sections: [],
            };
          }

          // Save the completed audit
          await auditsApi.update(audit.id, {
            status: "complete",
            report,
          });

          // Auto-discover competitors from audit signals
          if (Array.isArray(report.competitor_signals) && report.competitor_signals.length > 0) {
            sendEvent({ status: "Discovering competitors..." });
            try {
              const existing = await competitorsApi.list(tenant_id);
              const existingNames = new Set(existing.map((c: { name: string }) => c.name.toLowerCase()));

              for (const signal of report.competitor_signals.slice(0, 5)) {
                if (!signal.name || existingNames.has(signal.name.toLowerCase())) continue;
                try {
                  await competitorsApi.create({
                    tenant_id,
                    name: signal.name,
                    website: signal.website || null,
                    notes: signal.notes || null,
                    discovered_via: "ai_audit",
                  });
                } catch {
                  // skip individual failures
                }
              }
            } catch {
              // non-critical — don't fail the audit
            }
          }

          sendEvent({
            status: "Your audit is ready!",
            audit_id: audit.id,
            score: report.ad_readiness_score,
          });

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          console.error("[audit] Stream error:", err);

          // Mark audit as failed
          try {
            await auditsApi.update(audit.id, {
              status: "failed",
              error_message:
                err instanceof Error ? err.message : "Unknown error",
            });
          } catch {
            // best effort
          }

          sendEvent({
            status: "Audit failed",
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
    console.error("[audit] Error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
