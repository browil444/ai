import crypto from "node:crypto";

const BASE = "https://www.olabiba.com";

const ua =
  "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36";

// ── Cookie helpers ────────────────────────────────────────────────────────────

function nowUnix() {
  return Math.floor(Date.now() / 1000);
}

function buildDefaultCookies() {
  const t = nowUnix();
  const consentUUID = crypto.randomUUID();
  const FCCDCF = encodeURIComponent(
    JSON.stringify([
      null, null, null, null, null, null,
      [[[32, JSON.stringify([consentUUID, [t, 895000000]])]]],
    ])
  );
  return {
    olabiba_consent: `true%3A${t + 604800}`,
    FCCDCF,
  };
}

function cookieHeader(cookies) {
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

function parseSetCookie(headers, cookies) {
  const setCookies =
    typeof headers.getSetCookie === "function"
      ? headers.getSetCookie()
      : headers.get("set-cookie")
      ? [headers.get("set-cookie")]
      : [];

  for (const raw of setCookies) {
    const first = raw.split(";")[0];
    const idx = first.indexOf("=");
    if (idx !== -1) {
      cookies[first.slice(0, idx)] = first.slice(idx + 1);
    }
  }
}

// ── Fetch wrapper ─────────────────────────────────────────────────────────────

async function req(url, options, cookies) {
  const headers = new Headers(options.headers || {});
  headers.set("user-agent", ua);
  headers.set("accept-language", "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7");
  headers.set("cookie", cookieHeader(cookies));

  const response = await fetch(url, { ...options, headers });
  parseSetCookie(response.headers, cookies);
  return response;
}

// ── Text helpers ──────────────────────────────────────────────────────────────

function decodeHtmlLite(text) {
  return text
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'")
    .replaceAll("&#39;", "'");
}

function cleanAnswer(text) {
  let out = text || "";
  const qi = out.indexOf("<!--QUERY:");
  if (qi !== -1) out = out.slice(0, qi);
  const fi = out.search(/\[FOLLOWUP(?::[^\]]*)?\]/i);
  if (fi !== -1) out = out.slice(0, fi);
  const ei = out.search(/\[ELABORATE\]/i);
  if (ei !== -1) out = out.slice(0, ei);
  return out
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\[ELABORATE\]/gi, "")
    .replace(/\[FOLLOWUP(?::[^\]]*)?\][\s\S]*?(?:\[\/FOLLOWUP\])?/gi, "")
    .replace(/\[\/FOLLOWUP\]/gi, "")
    .replace(/\[FOLLOWUP:[^\]]*\]/gi, "")
    .replace(/\\n/g, "\n")
    .replace(/\r/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Olabiba flow ──────────────────────────────────────────────────────────────

async function olabibaChat(prompt, systemPrompt) {
  const cookies = buildDefaultCookies();

  // 1. Init session (GET homepage)
  await req(`${BASE}/`, { method: "GET", headers: { accept: "text/html,*/*;q=0.8" } }, cookies);

  // 2. Build context: inject system prompt sebagai prefix kalau ada
  const finalText = systemPrompt
    ? `[SYSTEM: ${systemPrompt}]\n\n${prompt}`
    : prompt;

  // 3. Send message
  const form = new FormData();
  form.set("text", finalText);
  form.set("mood", "friendly");
  form.set("lang", "id");
  form.set("adblock", "No");
  form.set("theme", "light");

  const sendRes = await req(`${BASE}/php/message.php`, {
    method: "POST",
    body: form,
    headers: {
      accept: "*/*",
      origin: BASE,
      referer: `${BASE}/`,
      "sec-fetch-site": "same-origin",
      "sec-fetch-mode": "cors",
      "sec-fetch-dest": "empty",
    },
  }, cookies);

  await sendRes.text().catch(() => "");

  if (!sendRes.ok) {
    throw new Error(`olabiba send failed: ${sendRes.status}`);
  }

  // 4. Read stream
  const streamRes = await req(`${BASE}/php/stream.php`, {
    method: "GET",
    headers: {
      accept: "text/event-stream",
      "cache-control": "no-cache",
      referer: `${BASE}/`,
      "sec-fetch-site": "same-origin",
      "sec-fetch-mode": "cors",
      "sec-fetch-dest": "empty",
    },
  }, cookies);

  if (!streamRes.body) throw new Error("olabiba: no stream body");

  const reader = streamRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let answer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      answer += decodeHtmlLite(data);
    }
  }

  const cleaned = cleanAnswer(answer);
  if (!cleaned) throw new Error("olabiba: empty answer");

  // 5. fetch_media & save-response (background, tidak perlu await blocking)
  req(`${BASE}/php/fetch_media.php`, {
    method: "POST",
    headers: { accept: "*/*", origin: BASE, referer: `${BASE}/`, "content-length": "0" },
  }, cookies).catch(() => {});

  const saveBody = new URLSearchParams({ question: prompt, answer: cleaned, html: cleaned });
  req(`${BASE}/php/save-response.php`, {
    method: "POST",
    body: saveBody,
    headers: {
      accept: "*/*",
      origin: BASE,
      referer: `${BASE}/`,
      "content-type": "application/x-www-form-urlencoded",
    },
  }, cookies).catch(() => {});

  return cleaned;
}

// ── Vercel handler ────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { messages, system } = req.body || {};
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array required" });
  }

  const systemPrompt =
    system ||
    "Kamu adalah asisten AI yang dibuat oleh Wildann. Ikuti bahasa yang digunakan user. Jawab dengan natural, santai, jelas. Jika ditanya siapa pembuatmu, jawab Wildann.";

  // Gabungkan history jadi satu prompt
  const historyLines = messages.slice(-10).map((m) => {
    if (m.role === "user") return `User: ${m.content}`;
    if (m.role === "assistant") return `Assistant: ${m.content}`;
    return `${m.role}: ${m.content}`;
  });

  // Ambil pesan user terakhir sebagai prompt utama
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUserMsg) {
    return res.status(400).json({ error: "No user message found" });
  }

  // Kalau ada history lebih dari 1 pesan, sertakan sebagai konteks
  const prompt =
    messages.length > 1
      ? historyLines.join("\n")
      : lastUserMsg.content;

  try {
    const answer = await olabibaChat(prompt, systemPrompt);
    return res.status(200).json({
      choices: [{ message: { role: "assistant", content: answer } }],
      model: "epic",
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
