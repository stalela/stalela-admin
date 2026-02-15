import { NextRequest, NextResponse } from "next/server";
import { campaignsApi } from "@/lib/api";
import type { CampaignContentInsert } from "@stalela/commons/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const DASHSCOPE_BASE_URL =
  "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";

const SYSTEM_PROMPT = `You are an elite AI marketing copywriter specializing in creating high-converting ad copy, social media content, and marketing assets. You produce content that is concise, compelling, and platform-appropriate.

When generating content, you MUST return ONLY a valid JSON array of objects. Each object has:
- "content_type": one of "headline", "ad_copy", "description", "cta", "social_post", "image_prompt"
- "content": the generated text
- "variant_label": a short label like "Variant A", "Variant B", etc.

Rules:
- Generate multiple variants for each requested content type (at least 2-3 per type).
- Match the tone and style to the specified platform.
- For South African markets, consider local idioms and cultural context where appropriate.
- Keep headlines under 30 characters for Google, under 40 for Meta.
- Keep ad copy concise and action-oriented.
- CTAs should be clear, specific, and urgent.
- Image prompts should be detailed and photorealistic-friendly.
- Do NOT wrap the JSON in markdown code blocks. Return raw JSON only.`;

export async function POST(request: NextRequest) {
  try {
    if (!DASHSCOPE_API_KEY) {
      return NextResponse.json(
        { error: "DASHSCOPE_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { campaignId, contentTypes, context, stream } = body as {
      campaignId: string;
      contentTypes: string[];
      context?: string;
      stream?: boolean;
    };

    if (!campaignId || !contentTypes?.length) {
      return NextResponse.json(
        { error: "campaignId and contentTypes are required" },
        { status: 400 }
      );
    }

    // Fetch campaign details for context
    let campaign;
    try {
      campaign = await campaignsApi.getById(campaignId);
    } catch {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    // Build user prompt
    const contextParts: string[] = [
      `**Campaign Name:** ${campaign.name}`,
      `**Platform:** ${campaign.platform}`,
    ];
    if (campaign.objective)
      contextParts.push(`**Objective:** ${campaign.objective}`);
    if (campaign.target_audience)
      contextParts.push(
        `**Target Audience:** ${JSON.stringify(campaign.target_audience)}`
      );
    if (campaign.budget)
      contextParts.push(
        `**Budget:** ${campaign.currency} ${campaign.budget}`
      );
    if (context) contextParts.push(`**Additional Context:** ${context}`);

    const userPrompt = `Generate marketing content for this campaign:\n\n${contextParts.join("\n")}\n\nContent types needed: ${contentTypes.join(", ")}\n\nReturn a JSON array of content items. Generate 2-3 variants per content type.`;

    // Call DashScope
    const aiResponse = await fetch(`${DASHSCOPE_BASE_URL}/chat/completions`, {
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
        stream: !!stream,
        enable_thinking: false,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("DashScope error:", aiResponse.status, errText);
      return NextResponse.json(
        { error: `AI service error: ${aiResponse.status}` },
        { status: 502 }
      );
    }

    // Streaming mode — relay SSE to client
    if (stream) {
      let fullContent = "";
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          const reader = aiResponse.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          try {
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
                    controller.enqueue(
                      encoder.encode(
                        `data: ${JSON.stringify({ content })}\n\n`
                      )
                    );
                  }
                } catch {
                  // Skip malformed chunks
                }
              }
            }

            // Parse and save the full AI output
            if (fullContent.trim()) {
              try {
                const items = JSON.parse(fullContent.trim());
                if (Array.isArray(items)) {
                  const inserts: CampaignContentInsert[] = items.map(
                    (item: Record<string, string>) => ({
                      campaign_id: campaignId,
                      content_type: item.content_type as CampaignContentInsert["content_type"],
                      content: item.content,
                      variant_label: item.variant_label ?? null,
                    })
                  );
                  const saved =
                    await campaignsApi.createContentBatch(inserts);
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ saved: saved.length })}\n\n`
                    )
                  );
                }
              } catch (parseErr) {
                console.error("Failed to parse AI content:", parseErr);
              }
            }

            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (e) {
            console.error("Stream error:", e);
            controller.error(e);
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
    }

    // Non-streaming mode — return parsed content directly
    const result = await aiResponse.json();
    const rawContent = result.choices?.[0]?.message?.content ?? "";

    try {
      const items = JSON.parse(rawContent.trim());
      if (Array.isArray(items)) {
        const inserts: CampaignContentInsert[] = items.map((item: Record<string, string>) => ({
          campaign_id: campaignId,
          content_type: item.content_type as CampaignContentInsert["content_type"],
          content: item.content,
          variant_label: item.variant_label ?? null,
        }));
        const saved = await campaignsApi.createContentBatch(inserts);
        return NextResponse.json({ items: saved }, { status: 201 });
      }
    } catch {
      // AI returned non-JSON — return raw text for the client to handle
    }

    return NextResponse.json({
      raw: rawContent,
      warning: "AI output was not valid JSON. Content was not auto-saved.",
    });
  } catch (e) {
    console.error("AI generate error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
