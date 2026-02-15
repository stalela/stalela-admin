import { NextRequest, NextResponse } from "next/server";
import { campaignsApi } from "@/lib/api";
import type { CampaignContentInsert } from "@stalela/commons/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const content = await campaignsApi.listContent(id);
    return NextResponse.json(content);
  } catch (error) {
    console.error("[admin/marketing/campaigns/content] List error:", error);
    return NextResponse.json({ error: "Failed to list content" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Support batch insert (array) or single insert
    if (Array.isArray(body)) {
      const items: CampaignContentInsert[] = body.map((item: Record<string, unknown>) => ({
        campaign_id: id,
        content_type: item.content_type as CampaignContentInsert["content_type"],
        content: item.content as string,
        variant_label: (item.variant_label as string) ?? null,
      }));
      const content = await campaignsApi.createContentBatch(items);
      return NextResponse.json(content, { status: 201 });
    }

    if (!body.content_type || !body.content) {
      return NextResponse.json(
        { error: "content_type and content are required." },
        { status: 400 }
      );
    }

    const content = await campaignsApi.createContent({
      ...body,
      campaign_id: id,
    });
    return NextResponse.json(content, { status: 201 });
  } catch (error) {
    console.error("[admin/marketing/campaigns/content] Create error:", error);
    return NextResponse.json({ error: "Failed to create content" }, { status: 500 });
  }
}
