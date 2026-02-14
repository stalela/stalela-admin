import { NextRequest, NextResponse } from "next/server";
import { companiesApi, researchApi } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60s for AI streaming

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const DASHSCOPE_BASE_URL =
  "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";

const SYSTEM_PROMPT = `You are an elite B2B sales intelligence analyst specializing in South African businesses. Your job is to produce a comprehensive, actionable research dossier on a company that will be used for personalized cold outreach (email and phone).

You MUST search the web for the most current information about this company. Use the company name, website, and any other identifiers provided to find real, current data.

Structure your report in EXACTLY these sections using markdown:

## Company Overview
Brief summary of who they are, what industry they operate in, founding date if known, and headquarters location.

## Current Offerings & Services
Their products, services, pricing tiers (if public), key differentiators, and target market.

## Web & Digital Presence
- **Website:** Analysis of their website (design quality, messaging, SEO indicators, tech stack if visible)
- **Social Media:** LinkedIn, Facebook, Twitter/X, Instagram presence — follower counts, posting frequency, engagement quality
- **Online Reviews:** Google reviews, Trustpilot, HelloPeter, or industry-specific review sites

## Key People & Leadership
Founders, CEO, directors, key decision-makers with their titles and LinkedIn profiles if findable.

## Recent News & Activity
Any press releases, news articles, awards, events, or industry mentions from the last 12 months.

## Pain Points & Challenges
Based on their industry, size, digital presence, and any publicly available reviews or complaints — what are their likely operational or growth challenges?

## Strategic Direction & Growth Trajectory
Where does this company appear to be heading? Are they growing, pivoting, expanding geographically, or struggling?

## Personalized Cold Email Draft
Write a ready-to-send cold email that:
- Has a compelling, personalized subject line
- References something specific about their business
- Connects to a relevant pain point
- Offers a clear value proposition
- Has a soft CTA (no hard sell)
- Is under 150 words
- Tone: professional but warm, not corporate

## Personalized Cold Call Script
Write a phone script that:
- Has a strong opening hook (first 10 seconds)
- Includes 2-3 discovery questions relevant to their business
- Has a pivot to value based on anticipated answers
- Handles the "I'm busy" objection
- Ends with a clear next step

Keep all analysis factual and grounded. If you cannot find information on a topic, say so explicitly rather than making assumptions. Cite sources where possible.`;

export async function POST(request: NextRequest) {
  try {
    if (!DASHSCOPE_API_KEY) {
      return NextResponse.json(
        { error: "DASHSCOPE_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { companyId, force } = body as {
      companyId: string;
      force?: boolean;
    };

    if (!companyId) {
      return NextResponse.json(
        { error: "companyId is required" },
        { status: 400 }
      );
    }

    // Fetch company details
    let company;
    try {
      company = await companiesApi.getById(companyId);
    } catch {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    // Check cache (unless force refresh)
    if (!force) {
      try {
        const cached = await researchApi.getLatest(companyId, 7);
        if (cached) {
          return NextResponse.json({
            cached: true,
            report: cached.report,
            model: cached.model,
            created_at: cached.created_at,
          });
        }
      } catch {
        // Cache miss — continue to generate
      }
    }

    // Build the user prompt with all available company context
    const contextParts: string[] = [
      `**Company Name:** ${company.name}`,
    ];
    if (company.website) contextParts.push(`**Website:** ${company.website}`);
    if (company.category) contextParts.push(`**Category:** ${company.category}`);
    if (company.categories?.length)
      contextParts.push(`**Categories:** ${company.categories.join(", ")}`);
    if (company.description)
      contextParts.push(`**Description:** ${company.description}`);
    if (company.short_description)
      contextParts.push(`**Short Description:** ${company.short_description}`);
    if (company.city || company.province)
      contextParts.push(
        `**Location:** ${[company.city, company.province, company.country]
          .filter(Boolean)
          .join(", ")}`
      );
    if (company.phone) contextParts.push(`**Phone:** ${company.phone}`);
    if (company.email) contextParts.push(`**Email:** ${company.email}`);
    if (company.registration_number)
      contextParts.push(`**Registration #:** ${company.registration_number}`);
    if (company.contact_name)
      contextParts.push(`**Contact Person:** ${company.contact_name}`);

    const userPrompt = `Research this South African company and produce a full intelligence dossier:\n\n${contextParts.join("\n")}\n\nSearch the web thoroughly for the most current and comprehensive information. This report will be used for B2B cold outreach, so make the analysis actionable and the outreach drafts highly personalized.`;

    // Call DashScope with streaming + web search
    const response = await fetch(`${DASHSCOPE_BASE_URL}/chat/completions`, {
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
        enable_search: true,
        search_options: { search_strategy: "agent" },
        enable_thinking: false,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("DashScope error:", response.status, errText);
      return NextResponse.json(
        { error: `AI service error: ${response.status}` },
        { status: 502 }
      );
    }

    // Stream the response via SSE
    let fullReport = "";
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();
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
                  fullReport += content;
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
                  );
                }
              } catch {
                // Skip malformed chunks
              }
            }
          }

          // Save completed report to DB
          if (fullReport.trim()) {
            try {
              await researchApi.save(companyId, fullReport, "qwen3-max");
            } catch (e) {
              console.error("Failed to save research report:", e);
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
  } catch (e) {
    console.error("Research API error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
