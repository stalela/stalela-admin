"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageSquare,
  X,
  Send,
  Plus,
  Loader2,
  Trash2,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatSession, ChatMessage } from "@stalela/commons/types";

interface Props {
  tenantId: string;
  userId: string;
}

export default function MarketingChat({ tenantId, userId }: Props) {
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [streamContent, setStreamContent] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamContent, scrollToBottom]);

  // Load sessions when panel opens
  useEffect(() => {
    if (open) {
      loadSessions();
    }
  }, [open]);

  async function loadSessions() {
    try {
      const res = await fetch(
        `/api/marketing/chat/sessions?tenant_id=${tenantId}&user_id=${userId}`
      );
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
        // If no active session and sessions exist, load the latest
        if (!activeSessionId && data.length > 0) {
          loadSession(data[0].id);
        }
      }
    } catch {
      // skip
    }
  }

  async function loadSession(sessionId: string) {
    try {
      const res = await fetch(
        `/api/marketing/chat/sessions/${sessionId}`
      );
      if (res.ok) {
        const data = await res.json();
        setActiveSessionId(sessionId);
        setMessages(data.messages);
        setShowSessions(false);
      }
    } catch {
      // skip
    }
  }

  async function createNewSession() {
    try {
      const res = await fetch("/api/marketing/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: tenantId, user_id: userId }),
      });
      if (res.ok) {
        const session = await res.json();
        setSessions((prev) => [session, ...prev]);
        setActiveSessionId(session.id);
        setMessages([]);
        setShowSessions(false);
      }
    } catch {
      // skip
    }
  }

  async function deleteSession(sessionId: string) {
    try {
      const res = await fetch(
        `/api/marketing/chat/sessions/${sessionId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        if (activeSessionId === sessionId) {
          setActiveSessionId(null);
          setMessages([]);
        }
      }
    } catch {
      // skip
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || loading || streaming) return;

    let sessionId = activeSessionId;

    // Auto-create session if none
    if (!sessionId) {
      try {
        const res = await fetch("/api/marketing/chat/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tenant_id: tenantId, user_id: userId }),
        });
        if (res.ok) {
          const session = await res.json();
          sessionId = session.id;
          setActiveSessionId(session.id);
          setSessions((prev) => [session, ...prev]);
        }
      } catch {
        return;
      }
    }

    if (!sessionId) return;

    // Optimistic UI: add user message
    const userMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      session_id: sessionId,
      tenant_id: tenantId,
      user_id: userId,
      role: "user",
      content: text,
      tool_calls: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setStreamContent("");

    try {
      const res = await fetch("/api/marketing/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          session_id: sessionId,
          tenant_id: tenantId,
          user_id: userId,
        }),
      });

      if (!res.ok) {
        throw new Error("Chat request failed");
      }

      setLoading(false);
      setStreaming(true);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No response stream");

      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullContent += parsed.content;
                setStreamContent(fullContent);
              }
            } catch {
              // skip
            }
          }
        }
      }

      // Replace stream with final message
      const assistantMsg: ChatMessage = {
        id: `temp-assistant-${Date.now()}`,
        session_id: sessionId,
        tenant_id: tenantId,
        user_id: userId,
        role: "assistant",
        content: fullContent,
        tool_calls: null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setStreamContent("");

      // Update session title in sidebar if first message
      const userMsgCount = messages.filter((m) => m.role === "user").length + 1;
      if (userMsgCount === 1) {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  title:
                    userMsg.content.length > 50
                      ? userMsg.content.slice(0, 47) + "..."
                      : userMsg.content,
                }
              : s
          )
        );
      }
    } catch (err) {
      console.error("Chat error:", err);
      const errorMsg: ChatMessage = {
        id: `temp-error-${Date.now()}`,
        session_id: sessionId,
        tenant_id: tenantId,
        user_id: userId,
        role: "assistant",
        content:
          "Sorry, something went wrong. Please try again.",
        tool_calls: null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-copper-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-copper-700 hover:shadow-xl"
        >
          <Sparkles className="h-4 w-4" />
          Ask Lalela
        </button>
      )}

      {/* Slide-out panel */}
      {open && (
        <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-background shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-copper-600/20">
                <Sparkles className="h-4 w-4 text-copper-light" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Lalela
                </h3>
                <p className="text-xs text-muted">Marketing Assistant</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={createNewSession}
                title="New conversation"
                className="rounded-lg p-2 text-muted hover:bg-surface-hover hover:text-foreground"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                onClick={() => setShowSessions(!showSessions)}
                title="Conversation history"
                className={cn(
                  "rounded-lg p-2 text-muted hover:bg-surface-hover hover:text-foreground",
                  showSessions && "bg-surface-hover text-foreground"
                )}
              >
                <MessageSquare className="h-4 w-4" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-muted hover:bg-surface-hover hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Session title */}
          {activeSession && !showSessions && (
            <div className="flex items-center justify-between border-b border-border/50 px-4 py-2">
              <span className="truncate text-xs text-muted">
                {activeSession.title}
              </span>
              <button
                onClick={() => setShowSessions(true)}
                className="flex items-center gap-1 text-xs text-copper-light hover:underline"
              >
                <ChevronDown className="h-3 w-3" />
                History
              </button>
            </div>
          )}

          {/* Session list */}
          {showSessions && (
            <div className="max-h-64 overflow-y-auto border-b border-border bg-surface">
              <div className="p-2">
                <button
                  onClick={createNewSession}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-copper-light hover:bg-surface-hover"
                >
                  <Plus className="h-4 w-4" />
                  New conversation
                </button>
                {sessions.length === 0 && (
                  <p className="px-3 py-2 text-xs text-muted">
                    No conversations yet
                  </p>
                )}
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={cn(
                      "group flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                      session.id === activeSessionId
                        ? "bg-copper-600/10 text-foreground"
                        : "text-muted hover:bg-surface-hover hover:text-foreground"
                    )}
                  >
                    <button
                      onClick={() => loadSession(session.id)}
                      className="flex-1 truncate text-left"
                    >
                      {session.title}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(session.id);
                      }}
                      className="ml-2 shrink-0 rounded p-1 text-muted opacity-0 hover:text-danger group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 && !streaming && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <Sparkles className="h-10 w-10 text-copper-light/30" />
                <h4 className="mt-3 text-sm font-semibold text-foreground">
                  Hi, I&apos;m Lalela!
                </h4>
                <p className="mt-1 max-w-xs text-xs text-muted">
                  Your AI marketing assistant. Ask me about your campaigns,
                  competitors, ad copy, or marketing strategy.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {[
                    "How's my website audit score?",
                    "Write Meta ad copy for my business",
                    "What are my competitors doing?",
                    "Marketing tips for my industry",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        setInput(suggestion);
                        inputRef.current?.focus();
                      }}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-copper-600/50 hover:text-foreground"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-xl px-4 py-2.5 text-sm",
                      msg.role === "user"
                        ? "bg-copper-600 text-white"
                        : "bg-surface border border-border text-foreground"
                    )}
                  >
                    {msg.role === "assistant" ? (
                      <div
                        className="prose prose-sm dark:prose-invert max-w-none [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-xs [&_p]:text-sm [&_li]:text-sm [&_strong]:text-copper-light"
                        dangerouslySetInnerHTML={{
                          __html: formatMarkdown(msg.content),
                        }}
                      />
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {/* Streaming indicator */}
              {streaming && streamContent && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground">
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-xs [&_p]:text-sm [&_li]:text-sm [&_strong]:text-copper-light"
                      dangerouslySetInnerHTML={{
                        __html: formatMarkdown(streamContent),
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Loading indicator */}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
                    <Loader2 className="h-4 w-4 animate-spin text-copper-light" />
                    Lalela is thinking...
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input */}
          <div className="border-t border-border p-4">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Lalela anything..."
                rows={1}
                className="max-h-24 min-h-[40px] flex-1 resize-none rounded-lg border border-border bg-surface-elevated px-4 py-2.5 text-sm text-foreground placeholder:text-muted/40 focus:border-copper-600 focus:outline-none focus:ring-1 focus:ring-copper-600/50"
                style={{
                  height: "auto",
                  minHeight: "40px",
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height =
                    Math.min(target.scrollHeight, 96) + "px";
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading || streaming}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-copper-600 text-white transition-all hover:bg-copper-700 disabled:opacity-30"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Simple markdown-to-HTML (no external deps)                          */
/* ------------------------------------------------------------------ */

function formatMarkdown(text: string): string {
  if (!text) return "";

  let html = text
    // Escape HTML
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Headers
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // Bold + italic
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="rounded bg-surface-elevated px-1 py-0.5 text-xs text-copper-light">$1</code>')
    // Unordered lists
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
    // Line breaks
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br />");

  // Wrap consecutive <li> in <ul>
  html = html.replace(
    /(<li>[\s\S]*?<\/li>)(?=\s*(?:<li>|$))/g,
    (match) => match
  );
  html = html.replace(
    /(?:<li>[\s\S]*?<\/li>\s*)+/g,
    (match) => `<ul>${match}</ul>`
  );

  return `<p>${html}</p>`;
}
