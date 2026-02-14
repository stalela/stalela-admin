import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, Clock, Tag, UserPlus } from "lucide-react";
import { leadsApi } from "@/lib/api";
import { Badge } from "@/components/Badge";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import { Button } from "@/components/Button";
import { PromoteButton } from "./PromoteButton";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function LeadDetailPage({ params }: Props) {
  const { id } = await params;

  let lead;
  try {
    lead = await leadsApi.getById(id);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/contacts/leads"
            className="rounded-md p-2 text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              {lead.name || lead.email}
            </h1>
            <p className="text-sm text-muted">Lead #{lead.id.slice(0, 8)}</p>
          </div>
        </div>
        <PromoteButton leadId={lead.id} leadName={lead.name} leadEmail={lead.email} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contact Info</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-copper-600" />
              <div>
                <p className="text-xs text-muted">Email</p>
                <p className="text-sm text-foreground">{lead.email}</p>
              </div>
            </div>
            {lead.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-copper-600" />
                <div>
                  <p className="text-xs text-muted">Phone</p>
                  <p className="text-sm text-foreground">{lead.phone}</p>
                </div>
              </div>
            )}
            {lead.name && (
              <div className="flex items-center gap-3">
                <UserPlus className="h-4 w-4 text-copper-600" />
                <div>
                  <p className="text-xs text-muted">Name</p>
                  <p className="text-sm text-foreground">{lead.name}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Tag className="h-4 w-4 text-copper-600" />
              <div>
                <p className="text-xs text-muted">Source</p>
                <Badge variant="copper">{lead.source}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-copper-600" />
              <div>
                <p className="text-xs text-muted">Captured</p>
                <p className="text-sm text-foreground">
                  {new Date(lead.created_at).toLocaleString("en-ZA")}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {lead.data && Object.keys(lead.data).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Additional Data</CardTitle>
            </CardHeader>
            <div className="space-y-3">
              {Object.entries(lead.data).map(([key, value]) => (
                <div key={key}>
                  <p className="text-xs font-medium text-muted capitalize">
                    {key.replace(/_/g, " ")}
                  </p>
                  <p className="text-sm text-foreground">
                    {String(value)}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
