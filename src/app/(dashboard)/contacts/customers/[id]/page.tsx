import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Clock,
  Pencil,
  StickyNote,
} from "lucide-react";
import { customersApi } from "@/lib/api";
import { Badge } from "@/components/Badge";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import { Button } from "@/components/Button";
import { CustomerStatusUpdate } from "./CustomerStatusUpdate";

export const dynamic = "force-dynamic";

const statusVariant: Record<string, "success" | "warning" | "default"> = {
  active: "success",
  prospect: "warning",
  inactive: "default",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CustomerDetailPage({ params }: Props) {
  const { id } = await params;

  let customer;
  try {
    customer = await customersApi.getById(id);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/contacts/customers"
            className="rounded-md p-2 text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              {customer.name}
            </h1>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant={statusVariant[customer.status] ?? "default"}>
                {customer.status}
              </Badge>
              {customer.lead_id && (
                <span className="text-xs text-muted">
                  From lead #{customer.lead_id.slice(0, 8)}
                </span>
              )}
            </div>
          </div>
        </div>
        <Link href={`/contacts/customers/${customer.id}/edit`}>
          <Button variant="secondary">
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        </Link>
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
                <p className="text-sm text-foreground">{customer.email}</p>
              </div>
            </div>
            {customer.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-copper-600" />
                <div>
                  <p className="text-xs text-muted">Phone</p>
                  <p className="text-sm text-foreground">{customer.phone}</p>
                </div>
              </div>
            )}
            {customer.company && (
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-copper-600" />
                <div>
                  <p className="text-xs text-muted">Company</p>
                  <p className="text-sm text-foreground">{customer.company}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-copper-600" />
              <div>
                <p className="text-xs text-muted">Customer Since</p>
                <p className="text-sm text-foreground">
                  {new Date(customer.created_at).toLocaleDateString("en-ZA")}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <CustomerStatusUpdate customerId={customer.id} currentStatus={customer.status} />

          <Card>
            <CardHeader>
              <CardTitle>
                <span className="flex items-center gap-2">
                  <StickyNote className="h-4 w-4" /> Notes
                </span>
              </CardTitle>
            </CardHeader>
            <p className="text-sm text-muted whitespace-pre-wrap">
              {customer.notes || "No notes added yet."}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
