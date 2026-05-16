import https from "https";
import crypto from "crypto";

const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36";

// ─── Model: Deep Image AI ───────────────────────────────────────────────────
function deepImageRequest(method, path, body, clientId) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: "api.deep-image.ai",
      path, method,
      headers: {
        accept: "application/json, text/plain, */*",
        "content-type": "application/json",
        "user-agent": UA,
        "x-client-id": clientId,
        origin: "https://deep-image.ai",
        referer: "https://deep-image.ai/",
        "accept-language": "id-ID,id;q=0.9",
        ...(payload ? { "content-length": Buffer.byteLength(payload) } : {}),
      },
    }, (res) => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => { try { resolve(JSON.parse(data)); } catch { reject(new Error("Parse error: " + data)); } });
    });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function generateDeepImage(prompt, width, height) {
  const clientId = crypto.createHash("md5").update(Date.now() + Math.random().toString()).digest("hex");
  const gen = await deepImageRequest("POST", "/api/public/free-image-generator/generate", { prompt, width, height }, clientId);
  if (!gen.job) throw new Error("Gagal dapat job ID dari Deep Image");
  for (let i = 0; i < 40; i++) {
    await sleep(3000);
    const job = await deepImageRequest("GET", `/api/apps/deep_image/v2/jobs/${gen.job}`, null, clientId);
    if (job.is_failed) throw new Error("Deep Image: job gagal");
    if (job.result?.result_url) return job.result.result_url;
  }
  throw new Error("Deep Image: timeout");
}

// ─── Model: FreeGen (WebSocket) ─────────────────────────────────────────────
async function generateFreeGen(prompt) {
  // Step 1: Sign
  const sigRes = await fetch("https://prompt-signer.freegen.app", {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": UA, origin: "https://freegen.app", referer: "https://freegen.app/" },
    body: JSON.stringify({ prompt }),
  });
  const { ts, sig } = await sigRes.json();
  if (!ts || !sig) throw new Error("FreeGen: signer gagal");

  // Step 2: Generate job
  const genRes = await fetch("https://image-generator.freegen.app", {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": UA, origin: "https://freegen.app", referer: "https://freegen.app/" },
    body: JSON.stringify({ prompt, ts, sig, ratio_id: "1:1" }),
  });
  const { job_id } = await genRes.json();
  if (!job_id) throw new Error("FreeGen: job_id tidak ditemukan");

  // Step 3: WebSocket — Vercel serverless tidak support ws native,
  // fallback ke polling via HTTP long-poll jika tersedia, else throw
  // (FreeGen pakai wss:// sehingga di Vercel perlu workaround)
  // Kita gunakan dynamic import ws dari npm
  const { default: WebSocket } = await import("ws");

  return new Promise((resolve, reject) => {
    const ws = new WebSocket("wss://websocket-bridge.freegen.app/ws", {
      headers: { origin: "https://freegen.app", "user-agent": UA },
    });
    const timer = setTimeout(() => { ws.terminate(); reject(new Error("FreeGen: timeout")); }, 110000);
    ws.on("open", () => ws.send(JSON.stringify({ type: "subscribe", job_id })));
    ws.on("message", async (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "result" && msg.image_data) {
          clearTimeout(timer);
          ws.terminate();
          // Upload ke uguu.se supaya dapat URL publik
          const url = await uploadUguu(msg.image_data);
          resolve(url);
        }
        if (msg.type === "error") { clearTimeout(timer); ws.terminate(); reject(new Error(msg.message || "FreeGen WS error")); }
      } catch (e) { clearTimeout(timer); ws.terminate(); reject(e); }
    });
    ws.on("error", (e) => { clearTimeout(timer); reject(e); });
    ws.on("close", () => { clearTimeout(timer); reject(new Error("FreeGen: WS closed")); });
  });
}

// ─── Model: Flux via Upsampler ──────────────────────────────────────────────
async function generateFlux(prompt, width = 1024, height = 1024) {
  const SPACE = "https://black-forest-labs-flux-2-klein-4b.hf.space";
  const sessionHash = crypto.randomBytes(8).toString("hex");

  const joinRes = await fetch(`${SPACE}/gradio_api/queue/join?`, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": UA, origin: "https://upsampler.com", referer: "https://upsampler.com/", "x-gradio-user": "api" },
    body: JSON.stringify({
      data: [prompt, [], "Distilled (4 steps)", 0, true, width, height, 4, 1, false],
      event_data: null, fn_index: 6, trigger_id: null, session_hash: sessionHash,
    }),
  });
  const { event_id } = await joinRes.json();
  if (!event_id) throw new Error("Flux: event_id tidak ditemukan");
  return await pollGradioSSE(SPACE, sessionHash, event_id, /https:\/\/black-forest-labs-flux-2-klein-4b\.hf\.space\/gradio_api\/file=[^"'\\\s]+/);
}

// ─── Model: Ernie Image Turbo ────────────────────────────────────────────────
async function generateErnie(prompt) {
  const SPACE = "https://baidu-ernie-image-turbo.hf.space";
  const sessionHash = crypto.randomBytes(8).toString("hex");

  const joinRes = await fetch(`${SPACE}/gradio_api/queue/join?`, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": UA, origin: "https://upsampler.com", referer: "https://upsampler.com/", "x-gradio-user": "api" },
    body: JSON.stringify({
      data: [prompt, "1024x1024", -1, true],
      event_data: null, fn_index: 1, trigger_id: null, session_hash: sessionHash,
    }),
  });
  const { event_id } = await joinRes.json();
  if (!event_id) throw new Error("Ernie: event_id tidak ditemukan");
  return await pollGradioSSE(SPACE, sessionHash, event_id, /https:\/\/baidu-ernie-image-turbo\.hf\.space\/gradio_api\/file=[^"'\\\s]+/);
}

// ─── Shared: Gradio SSE polling ──────────────────────────────────────────────
async function pollGradioSSE(spaceUrl, sessionHash, eventId, urlRegex) {
  const res = await fetch(`${spaceUrl}/gradio_api/queue/data?session_hash=${sessionHash}`, {
    headers: { accept: "text/event-stream", "user-agent": UA },
  });
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  const deadline = Date.now() + 180000;

  while (Date.now() < deadline) {
    const { value, done } = await reader.read();
    if (done) throw new Error("SSE stream ended prematurely");
    buf += dec.decode(value, { stream: true });
    const blocks = buf.split("\n\n");
    buf = blocks.pop() || "";
    for (const block of blocks) {
      const line = block.split("\n").find(l => l.startsWith("data: "));
      if (!line) continue;
      const raw = line.slice(6).trim();
      if (!raw || raw === "[DONE]") continue;
      try {
        const json = JSON.parse(raw);
        if (json.event_id && json.event_id !== eventId) continue;
        if (json.msg === "process_completed") {
          const text = JSON.stringify(json.output || "");
          const m = text.match(urlRegex);
          if (m) return m[0].replace(/\\u0026/g, "&").replace(/\\\//g, "/");
          // fallback: cari field url
          const urlField = text.match(/"url":"(https?:\/\/[^"]+)"/);
          if (urlField) return urlField[1].replace(/\\u0026/g, "&").replace(/\\\//g, "/");
          throw new Error("URL gambar tidak ditemukan di response");
        }
        if (json.msg === "process_failed") throw new Error("Generate gagal di server");
      } catch (e) { throw e; }
    }
  }
  throw new Error("SSE timeout");
}

// ─── Shared: Upload ke uguu.se ───────────────────────────────────────────────
async function uploadUguu(base64String) {
  const b64 = base64String.includes("base64,") ? base64String.split("base64,")[1] : base64String;
  const buf = Buffer.from(b64, "base64");
  const boundary = "----FormBoundary" + crypto.randomBytes(8).toString("hex");
  const filename = `img-${Date.now()}.jpg`;
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="files[]"; filename="${filename}"\r\nContent-Type: image/jpeg\r\n\r\n`),
    buf,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  const res = await fetch("https://uguu.se/upload", {
    method: "POST",
    headers: { "content-type": `multipart/form-data; boundary=${boundary}`, "user-agent": UA, accept: "application/json" },
    body,
  });
  const data = await res.json();
  const url = data?.files?.[0]?.url;
  if (!url) throw new Error("Upload uguu gagal");
  return String(url).replace(/\\/g, "");
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Handler ─────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { prompt, model = "flux", width = 1024, height = 1024 } = req.body || {};
  if (!prompt || !prompt.trim()) return res.status(400).json({ error: "Parameter 'prompt' wajib diisi." });

  const w = Math.min(Math.max(parseInt(width) || 1024, 256), 1536);
  const h = Math.min(Math.max(parseInt(height) || 1024, 256), 1536);

  try {
    let image_url;
    if (model === "deepimage") {
      image_url = await generateDeepImage(prompt.trim(), w, h);
    } else if (model === "freegen") {
      image_url = await generateFreeGen(prompt.trim());
    } else if (model === "ernie") {
      image_url = await generateErnie(prompt.trim());
    } else {
      // default: flux
      image_url = await generateFlux(prompt.trim(), w, h);
    }
    return res.status(200).json({ success: true, model, prompt: prompt.trim(), image_url });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Internal server error." });
  }
}
