import Link from "next/link";
import {
  ArrowLeft,
  Edit,
  Sparkles,
} from "lucide-react";
import { campaignsApi } from "@/lib/api";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import { ContentGenerator } from "@/components/ContentGenerator";
import type { CampaignContent } from "@stalela/commons/types";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

const statusVariant: Record<string, "success" | "warning" | "danger" | "default" | "info"> = {
  active: "success",
  draft: "default",
  paused: "warning",
  completed: "info",
  archived: "default",
};

export default async function CampaignDetailPage({ params }: PageProps) {
  const { id } = await params;
  const campaign = await campaignsApi.getById(id);
  const content = await campaignsApi.listContent(id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/marketing/tenants/${campaign.tenant_id}`}
            className="rounded-md p-2 text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              {campaign.name}
            </h1>
            {campaign.objective && (
              <p className="text-sm text-muted">{campaign.objective}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusVariant[campaign.status] ?? "default"}>
            {campaign.status}
          </Badge>
          <Badge variant="copper">{campaign.platform}</Badge>
          <Link href={`/marketing/campaigns/${id}/edit`}>
            <Button size="sm" variant="outline">
              <Edit className="h-3 w-3" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Campaign details */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            Budget
          </p>
          <p className="mt-1 text-lg font-bold text-foreground">
            {campaign.budget
              ? `${campaign.currency} ${campaign.budget.toLocaleString()}`
              : "—"}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            Start Date
          </p>
          <p className="mt-1 text-lg font-bold text-foreground">
            {campaign.start_date ?? "—"}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            End Date
          </p>
          <p className="mt-1 text-lg font-bold text-foreground">
            {campaign.end_date ?? "—"}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            Content Items
          </p>
          <p className="mt-1 text-lg font-bold text-foreground">
            {content.length}
          </p>
        </Card>
      </div>

      {/* AI Content Generator */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Sparkles className="mr-2 inline h-4 w-4 text-copper-600" />
            AI Content Generator
          </CardTitle>
        </CardHeader>
        <ContentGenerator campaignId={id} />
      </Card>

      {/* Existing content */}
      <Card>
        <CardHeader>
          <CardTitle>Generated Content ({content.length})</CardTitle>
        </CardHeader>

        {content.length === 0 ? (
          <p className="text-sm text-muted">
            No content yet. Use the AI generator above to create ad copy,
            headlines, and more.
          </p>
        ) : (
          <div className="space-y-3">
            {content.map((item: CampaignContent) => (
              <div
                key={item.id}
                className="rounded-lg border border-border bg-surface-elevated p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <Badge variant="copper">{item.content_type}</Badge>
                      {item.variant_label && (
                        <span className="text-xs text-muted">
                          {item.variant_label}
                        </span>
                      )}
                      {item.approved && (
                        <Badge variant="success">Approved</Badge>
                      )}
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {item.content}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
