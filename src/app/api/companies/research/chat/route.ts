import { NextRequest, NextResponse } from "next/server";
import { companiesApi } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const DASHSCOPE_BASE_URL =
  "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";

const SYSTEM_PROMPT = `You are an expert B2B sales intelligence assistant specializing in South African businesses. You have access to a previously-generated research report on a company. 

Answer the user's questions about this company using the report as context. If the question goes beyond the report, use your general knowledge but make it clear when you're going beyond the available data.

Rules:
- Be concise and actionable
- Use markdown formatting for readability
- If asked to draft emails, calls, or messages — make them highly personalized using the report context
- Stay professional but conversational`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

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
      `**Company Name:** ${company.name}`,
    ];
    if (company.website) contextParts.push(`**Website:** ${company.website}`);
    if (company.category) contextParts.push(`**Category:** ${company.category}`);
    if (company.city || company.province)
      contextParts.push(
        `**Location:** ${[company.city, company.province, company.country]
          .filter(Boolean)
          .join(", ")}`
      );
    if (company.phone) contextParts.push(`**Phone:** ${company.phone}`);
    if (company.email) contextParts.push(`**Email:** ${company.email}`);

    let systemContent = SYSTEM_PROMPT;
    systemContent += `\n\n--- COMPANY INFO ---\n${contextParts.join("\n")}`;
    if (report) {
      systemContent += `\n\n--- RESEARCH REPORT ---\n${report}`;
    }

    // Build message history for multi-turn conversation
    const messages: { role: string; content: string }[] = [
      { role: "system", content: systemContent },
    ];

    if (history?.length) {
      for (const msg of history) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    messages.push({ role: "user", content: question });

    // Call DashScope with streaming
    const response = await fetch(`${DASHSCOPE_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "qwen3-max",
        messages,
        stream: true,
        enable_search: true,
        search_options: { search_strategy: "agent" },
        enable_thinking: false,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("DashScope chat error:", response.status, errText);
      return NextResponse.json(
        { error: `AI service error: ${response.status}` },
        { status: 502 }
      );
    }

    // Stream the response via SSE
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
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
                  );
                }
              } catch {
                // Skip malformed chunks
              }
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (e) {
          console.error("Chat stream error:", e);
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
    console.error("Research chat API error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
