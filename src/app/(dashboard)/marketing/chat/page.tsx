import { redirect } from "next/navigation";
import Link from "next/link";
import { MessageSquare, Trash2, Clock, ArrowLeft, Plus, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase-server";
import { getTenantContext, isTenantUser } from "@/lib/tenant-context";
import { chatApi } from "@/lib/api";
import { Card } from "@/components/Card";
import type { ChatSession } from "@stalela/commons/types";

export const dynamic = "force-dynamic";

export default async function ChatHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const ctx = await getTenantContext(user.id);
  if (!isTenantUser(ctx.role) || !ctx.tenantId) redirect("/marketing");

  let sessions: ChatSession[] = [];
  try {
    sessions = await chatApi.listSessions(ctx.tenantId, user.id);
  } catch {
    // skip
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/marketing"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-copper-light"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Marketing
        </Link>

        <div className="mt-3 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Chat History
            </h1>
            <p className="mt-1 text-sm text-muted">
              Your conversations with Lalela, the AI marketing assistant.
            </p>
          </div>
        </div>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-16">
            <Sparkles className="h-12 w-12 text-muted/30" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              No conversations yet
            </h3>
            <p className="mt-1 text-sm text-muted">
              Click the &quot;Ask Lalela&quot; button at the bottom right to
              start your first conversation.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-3">
          {sessions.map((session) => (
            <Card key={session.id}>
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-copper-600/10">
                    <MessageSquare className="h-4 w-4 text-copper-light" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {session.title}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-muted">
                      <Clock className="h-3 w-3" />
                      {new Date(session.updated_at).toLocaleDateString(
                        "en-ZA",
                        {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
