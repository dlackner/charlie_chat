// app/api/chat/route.ts
/**
 * MFOS - AI Coach Chat API (Responses + Vector Stores, multi-turn)
 *
 * - Direct OpenAI Responses API (no Assistants)
 * - Per-PDF ephemeral Vector Store reused across follow-ups
 * - File indexing wait before first Q&A
 * - Optional Web Search, toggled only when needed
 * - Compatible with your existing Assistants-UI style payloads
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// ---------- Config ----------

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const OPENAI_BASE = "https://api.openai.com/v1";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Number of prior turns to send for context
const HISTORY_TURNS = 4;

// Max seconds to wait for file indexing
const INDEXING_TIMEOUT_SEC = 25;

// ---------- Helpers: Auth / User ----------

async function getUserId() {
  try {
    const store = await cookies();
    const all = store.getAll();
    const sessionCookie = all.find(
      (c) => c.name.includes("auth-token") && !c.name.includes("code-verifier")
    );
    if (!sessionCookie?.value) return null;

    let tokenVal = sessionCookie.value;
    if (tokenVal.startsWith("base64-")) {
      tokenVal = Buffer.from(tokenVal.substring(7), "base64").toString("utf-8");
    }
    const token = JSON.parse(tokenVal)?.access_token;
    if (!token) return null;

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    return user.id as string;
  } catch (e) {
    console.error("getUserId error:", e);
    return null;
  }
}

// ---------- Helpers: DB (thread + attachments) ----------

async function getOrCreateThread(userId: string) {
  // Use most recent thread or create one
  const { data: threads, error } = await supabase
    .from("chat_threads")
    .select("id, active_vs_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("getOrCreateThread select error:", error);
  }

  if (threads && threads.length > 0) {
    return { id: threads[0].id as number, active_vs_id: threads[0].active_vs_id as string | null };
  }

  const { data: inserted, error: insErr } = await supabase
    .from("chat_threads")
    .insert({
      user_id: userId,
      title: "Chat Session",
      openai_thread_id: crypto.randomUUID()
    })
    .select("id, active_vs_id")
    .single();

  if (insErr) {
    console.error("getOrCreateThread insert error:", insErr);
    throw new Error("Failed to create thread");
  }
  return { id: inserted!.id as number, active_vs_id: inserted!.active_vs_id as string | null };
}

async function setActiveVectorStore(threadId: number, vsId: string | null) {
  const { error } = await supabase
    .from("chat_threads")
    .update({ active_vs_id: vsId })
    .eq("id", threadId);
  if (error) console.error("setActiveVectorStore error:", error);
}

async function saveAttachmentRow(userId: string, threadId: number, fileId: string, fileName: string, contentType = "application/pdf") {
  const { error } = await supabase.from("chat_attachments").insert({
    thread_id: threadId,
    user_id: userId,
    openai_file_id: fileId,
    file_name: fileName,
    content_type: contentType
  });
  if (error) console.error("saveAttachmentRow error:", error);
}

// ---------- Helpers: OpenAI Vector Stores ----------

async function createVectorStore(name: string) {
  const r = await fetch(`${OPENAI_BASE}/vector_stores`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ name })
  });
  if (!r.ok) throw new Error(`Vector store create failed: ${await r.text()}`);
  return (await r.json()).id as string;
}

async function addFilesToVectorStore(vsId: string, fileIds: string[]) {
  // Use file_batches to attach multiple files
  const r = await fetch(`${OPENAI_BASE}/vector_stores/${vsId}/file_batches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ file_ids: fileIds })
  });
  if (!r.ok) throw new Error(`Add files failed: ${await r.text()}`);
  return (await r.json()).id as string; // batch_id
}

async function waitForBatchComplete(vsId: string, batchId: string, timeoutSec = INDEXING_TIMEOUT_SEC) {
  const started = Date.now();
  while (true) {
    const r = await fetch(`${OPENAI_BASE}/vector_stores/${vsId}/file_batches/${batchId}`, {
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` }
    });
    if (!r.ok) throw new Error(`Poll batch failed: ${await r.text()}`);
    const json = await r.json();
    // statuses: "in_progress" | "completed" | "failed" (plus counts)
    if (json.status === "completed") return true;
    if (json.status === "failed") throw new Error("Vector store indexing failed");
    if ((Date.now() - started) / 1000 > timeoutSec) return false; // timeout -> let the app answer w/ "still processing"
    await new Promise((res) => setTimeout(res, 1000));
  }
}

async function deleteVectorStore(vsId: string) {
  const r = await fetch(`${OPENAI_BASE}/vector_stores/${vsId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` }
  });
  // Best-effort cleanup; ignore non-200s
  if (!r.ok) console.warn("Vector store delete warning:", await r.text());
}

// ---------- Heuristics ----------

function extractText(res: any): string {
  if (typeof res.output_text === "string" && res.output_text.trim()) return res.output_text.trim();
  const parts: string[] = [];
  if (Array.isArray(res.output)) {
    for (const it of res.output) {
      if (it?.type === "message" && Array.isArray(it.content)) {
        for (const c of it.content) {
          if ((c.type === "output_text" || c.type === "text") && typeof c.text === "string") {
            parts.push(c.text);
          }
        }
      }
    }
  }
  return parts.join("\n").trim();
}

function extractUserTextFromAssistantsUI(lastMessage: any): string {
  if (!lastMessage) return "";
  if (typeof lastMessage.content === "string") return lastMessage.content;
  if (Array.isArray(lastMessage.content)) {
    return lastMessage.content
      .filter((p: any) => p?.type === "text" && p?.text)
      .map((p: any) => p.text)
      .join(" ");
  }
  return "";
}

function extractFileIdsFromAssistantsUI(lastMessage: any): { fileIds: string[]; named: { id: string; name: string }[] } {
  const fileIds: string[] = [];
  const named: { id: string; name: string }[] = [];
  if (Array.isArray(lastMessage?.content)) {
    for (const part of lastMessage.content) {
      const id = part?.fileId;
      if (typeof id === "string" && id.startsWith("file-")) {
        fileIds.push(id);
        const name = part?.text?.match(/\[File:\s*(.+?)\]/)?.[1] || `File ${id}`;
        named.push({ id, name });
      }
    }
  }
  return { fileIds, named };
}

function needsFreshWeb(msg: string): boolean {
  const s = msg.toLowerCase();
  return /(current|now|today|latest|2024|2025|cap rate|rent|average|trend|yoy|submarket|vacancy|absorption)/.test(s);
}

function mapClientHistoryToResponsesInput(messages: any[]): any[] {
  // We'll only keep the last few user/assistant text exchanges.
  const trimmed = (messages ?? []).slice(-HISTORY_TURNS);
  const out: any[] = [];
  for (const m of trimmed) {
    if (m.role === "user" || m.role === "assistant") {
      let text = "";
      if (typeof m.content === "string") text = m.content;
      else if (Array.isArray(m.content)) {
        text = m.content.filter((p: any) => p?.type === "text" && p?.text).map((p: any) => p.text).join(" ");
      }
      if (text?.trim()) out.push({ role: m.role, content: text.trim() });
    }
  }
  return out;
}

// ---------- POST: chat ----------

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    // 1) figure out the text & files for THIS turn
    let userMsg = payload.message ?? "";
    if (!userMsg && Array.isArray(payload.messages)) {
      const lastMsg = payload.messages.at(-1);
      userMsg = extractUserTextFromAssistantsUI(lastMsg);
    }
    if (!userMsg?.trim()) return new Response("Missing message", { status: 400 });

    const lastMsg = Array.isArray(payload.messages) ? payload.messages.at(-1) : null;
    const { fileIds: currentFileIds, named: namedFiles } = extractFileIdsFromAssistantsUI(lastMsg);
    // Also support legacy attachments array
    if (Array.isArray(payload.attachments)) {
      for (const a of payload.attachments) {
        const id = a?.content?.[0]?.file_id;
        if (id?.startsWith("file-") && !currentFileIds.includes(id)) {
          currentFileIds.push(id);
          namedFiles.push({ id, name: a?.name || `File ${id}` });
        }
      }
    }

    // 2) user & thread
    const userId = await getUserId();
    const { id: threadId, active_vs_id } = userId
      ? await getOrCreateThread(userId)
      : { id: 0, active_vs_id: null as string | null }; // anonymous session path if needed

    // 3) Compute intent once and use consistently
    const intent: "doc" | "market" | "both" | "neither" = 
      currentFileIds.length > 0 ? "doc" : routeIntent(userMsg);
    
    console.log(`🎯 Intent detected: ${intent}`);

    // 4) Vector store policy with intelligent intent routing
    type Intent = "doc" | "market" | "both" | "neither";

    function routeIntent(msg: string): Intent {
      const s = msg.toLowerCase();

      const docHints = /(this (property|om|pdf|document)|in the uploaded|on page|unit mix|noi|rent roll|what does it say)/;
      const marketHints = /(current|now|latest|as of|2024|2025|cap rate|average rent|class [abc]\b|submarket|vacancy|bls|yoy|trend|market|city|state|msa|zip)/;

      const isDoc = docHints.test(s);
      const isMarket = marketHints.test(s) && !/this (property|document|om)/.test(s);

      if (isDoc && isMarket) return "both";
      if (isDoc) return "doc";
      if (isMarket) return "market";
      return "neither";
    }

    function wantsReset(msg: string) {
      return /(new topic|reset|clear (pdf|file|document)|ignore (pdf|document)|switch (deal|market))/i.test(msg);
    }
    
    let vsIdToUse: string | null = null;
    let indexingReady = true;

    if (currentFileIds.length > 0) {
      // NEW FILE: Create brand-new vector store
      // Optional cleanup: delete old store if switching docs
      if (active_vs_id) {
        await deleteVectorStore(active_vs_id).catch(() => {});
      }
      // Create brand-new store for this PDF set
      vsIdToUse = await createVectorStore(`session-${userId || "anon"}-${Date.now()}`);
      const batchId = await addFilesToVectorStore(vsIdToUse, currentFileIds);
      indexingReady = await waitForBatchComplete(vsIdToUse, batchId, INDEXING_TIMEOUT_SEC);
      if (userId) await setActiveVectorStore(threadId, vsIdToUse);
      // persist attachment rows for your "recent uploads" page
      if (userId) {
        for (const nf of namedFiles) {
          await saveAttachmentRow(userId, threadId, nf.id, nf.name, "application/pdf");
        }
      }
    } else {
      // Check if user wants to reset/clear document context
      if (wantsReset(userMsg)) {
        // RESET: Clear active document and cleanup
        if (active_vs_id) {
          await deleteVectorStore(active_vs_id).catch(() => {});
          if (userId) await setActiveVectorStore(threadId, null);
        }
        vsIdToUse = null;
        console.log("🔄 Reset requested - cleared document context");
        
        // Return immediate confirmation for reset requests
        const resetResponse = "✅ Document context cleared. Ready for new topics or documents!";
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(`0:${JSON.stringify(resetResponse)}\n`));
            controller.close();
          },
        });
        return new Response(stream, {
          headers: {
            "Content-Type": "text/plain",
            "x-response-type": "reset-confirmation",
          },
        });
      } else {
        // Use the pre-computed intent
        if ((intent === "doc" || intent === "both") && active_vs_id) {
          // FOLLOW-UP ABOUT EXISTING DOCUMENT: Reuse existing vector store
          vsIdToUse = active_vs_id;
          console.log("📄 Reusing existing document for follow-up question");
        } else {
          // GENERAL CHAT OR MARKET QUESTION: No file search needed
          vsIdToUse = null;
          console.log("💬 General chat/market mode - no file search");
        }
      }
    }

    // 5) Build the Responses call
    const tools: any[] = [];

    // Power user overrides (explicit tool selection)
    const forceDoc = /\b(use|from)\s+(doc|pdf|om)\b/i.test(userMsg);
    const forceWeb = /\b(use|do)\s+web\b/i.test(userMsg);
    
    if (forceDoc && active_vs_id) {
      tools.unshift({ type: "file_search", vector_store_ids: [active_vs_id] });
    } else if (vsIdToUse) {
      // Standard logic: use file search based on intent
      tools.push({ type: "file_search", vector_store_ids: [vsIdToUse] });
    }
    
    if (forceWeb) {
      tools.push({ type: "web_search" });
    } else if (intent === "market" || intent === "both" || needsFreshWeb(userMsg)) {
      // Standard logic: use web search based on intent
      tools.push({ type: "web_search" });
    }

    // Include a little history (from the client) so follow-ups make sense
    const history = Array.isArray(payload.messages)
      ? mapClientHistoryToResponsesInput(payload.messages)
      : [];

    // Dynamic model selection based on tools needed
    const usesWeb = tools.some(t => t.type === "web_search");
    
    const body: any = {
      model: usesWeb ? "gpt-4o" : "gpt-4o-mini", // use standard models, tools handle web search
      max_output_tokens: 600,
      input: [
        { role: "system", content: "You are a concise real estate expert. If the user's question is market-level (city/region trends) and not explicitly about the uploaded file, do not use file_search. Use web_search instead. Only use file_search for questions about the uploaded document's contents (e.g., NOI, unit mix, page references). Keep answers ≤ 6 bullets." },
        ...history,
        { role: "user", content: userMsg }
      ],
    };

    if (tools.length) body.tools = tools;

    // If indexing is still running, tell the user gracefully but proceed (sometimes retrieval still works for some pages)
    if (!indexingReady && vsIdToUse) {
      body.input.unshift({
        role: "system",
        content: "Note: The newly uploaded document is still indexing; answer with any available sections and say if something isn't found yet."
      });
    }

    // 5) Call Responses
    const r = await fetch(`${OPENAI_BASE}/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const errTxt = await r.text();
      console.error("OpenAI error:", errTxt);
      return new Response(errTxt, { status: 500 });
    }

    const json = await r.json();
    console.log("📥 OpenAI response structure:", JSON.stringify(json, null, 2));
    
    // Extract text using robust helper
    const text = extractText(json) || "No response received.";
    
    console.log("📝 Extracted text:", text);

    // 6) Stream a single chunk for Assistants-UI compatibility
    const encoder = new TextEncoder();
    const streamData = `0:${JSON.stringify(text)}\n`;
    console.log("📤 Streaming data:", streamData);
    
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(streamData));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain",
        "x-response-type": "direct-api",
      },
    });

  } catch (e) {
    console.error("❌ Chat error:", e);
    return new Response("Internal Server Error", { status: 500 });
  }
}

// ---------- GET: quick status / recent attachments ----------

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized", userId: null }, { status: 401 });
    }

    const { data: thread } = await supabase
      .from("chat_threads")
      .select("id, active_vs_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const { data: attachments } = await supabase
      .from("chat_attachments")
      .select("openai_file_id, file_name, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    return NextResponse.json({
      userId,
      active_vs_id: thread?.active_vs_id ?? null,
      attachments: attachments ?? [],
    });
  } catch (e) {
    console.error("GET error:", e);
    return new Response("Internal Server Error", { status: 500 });
  }
}