import crypto from "node:crypto";
import fs from "node:fs/promises";

const BASE = "https://www.olabiba.com";
const SESSION_FILE = "./olabiba-session.json";

const USER_PROMPT = "Halo bro sekarang gimana mood mu";

const mood = "friendly";
const lang = "en";
const adblock = "No";
const theme = "light";

const ua =
  "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36";

async function loadSession() {
  try {
    const raw = await fs.readFile(SESSION_FILE, "utf8");
    const session = JSON.parse(raw);

    return {
      sessionId: session.sessionId || crypto.randomUUID(),
      deviceId: session.deviceId || crypto.randomUUID(),
      cookies: session.cookies || {},
      messages: Array.isArray(session.messages) ? session.messages : [],
    };
  } catch {
    return {
      sessionId: crypto.randomUUID(),
      deviceId: crypto.randomUUID(),
      cookies: {},
      messages: [],
    };
  }
}

async function saveSession(session) {
  await fs.writeFile(SESSION_FILE, JSON.stringify(session, null, 2), "utf8");
}

function nowUnix() {
  return Math.floor(Date.now() / 1000);
}

function getCookieHeader(session) {
  return Object.entries(session.cookies || {})
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");
}

function saveSetCookie(session, headers) {
  const setCookies =
    typeof headers.getSetCookie === "function"
      ? headers.getSetCookie()
      : headers.get("set-cookie")
        ? [headers.get("set-cookie")]
        : [];

  if (!session.cookies) session.cookies = {};

  for (const raw of setCookies) {
    const first = raw.split(";")[0];
    const idx = first.indexOf("=");

    if (idx !== -1) {
      session.cookies[first.slice(0, idx)] = first.slice(idx + 1);
    }
  }
}

function setDefaultClientCookies(session) {
  if (!session.cookies) session.cookies = {};

  const t = nowUnix();

  if (!session.cookies.olabiba_consent) {
    session.cookies.olabiba_consent = `true%3A${t + 604800}`;
  }

  if (!session.cookies.FCCDCF) {
    const consentUUID = crypto.randomUUID();

    session.cookies.FCCDCF = encodeURIComponent(
      JSON.stringify([
        null,
        null,
        null,
        null,
        null,
        null,
        [[[32, JSON.stringify([consentUUID, [t, 895000000]])]]],
      ])
    );
  }
}

async function request(session, url, options = {}) {
  const headers = new Headers(options.headers || {});

  headers.set("user-agent", ua);
  headers.set("accept-language", "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7");

  const cookie = getCookieHeader(session);
  if (cookie) headers.set("cookie", cookie);

  const response = await fetch(url, {
    ...options,
    headers,
  });

  saveSetCookie(session, response.headers);

  return response;
}

async function initSession(session) {
  setDefaultClientCookies(session);

  await request(session, `${BASE}/`, {
    method: "GET",
    headers: {
      accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    },
  });
}

function buildContextPrompt(session, prompt) {
  const history = session.messages
    .slice(-10)
    .map((msg) => {
      if (msg.role === "user") return `User: ${msg.content}`;
      if (msg.role === "assistant") return `Assistant: ${msg.content}`;
      return `${msg.role}: ${msg.content}`;
    })
    .join("\n");

  if (!history) return prompt;

  return `${history}
User: ${prompt}`;
}

async function sendMessage(session, text) {
  const form = new FormData();

  form.set("text", text);
  form.set("mood", mood);
  form.set("lang", lang);
  form.set("adblock", adblock);
  form.set("theme", theme);

  const response = await request(session, `${BASE}/php/message.php`, {
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
  });

  await response.text().catch(() => "");

  return response.status;
}

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
  let output = text || "";

  const queryIndex = output.indexOf("<!--QUERY:");
  if (queryIndex !== -1) {
    output = output.slice(0, queryIndex);
  }

  const followupIndex = output.search(/\[FOLLOWUP(?::[^\]]*)?\]/i);
  if (followupIndex !== -1) {
    output = output.slice(0, followupIndex);
  }

  const elaborateIndex = output.search(/\[ELABORATE\]/i);
  if (elaborateIndex !== -1) {
    output = output.slice(0, elaborateIndex);
  }

  return output
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\[ELABORATE\]/gi, "")
    .replace(/\[FOLLOWUP(?::[^\]]*)?\][\s\S]*?(?:\[\/FOLLOWUP\])?/gi, "")
    .replace(/\[\/FOLLOWUP\]/gi, "")
    .replace(/\[FOLLOWUP:[^\]]*\]/gi, "")
    .replace(/\\n/g, " ")
    .replace(/\n/g, " ")
    .replace(/\r/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function readStreamAnswer(session) {
  const response = await request(session, `${BASE}/php/stream.php`, {
    method: "GET",
    headers: {
      accept: "text/event-stream",
      "cache-control": "no-cache",
      referer: `${BASE}/`,
      "sec-fetch-site": "same-origin",
      "sec-fetch-mode": "cors",
      "sec-fetch-dest": "empty",
    },
  });

  if (!response.body) {
    return {
      status: response.status,
      answer: "",
    };
  }

  const reader = response.body.getReader();
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

  return {
    status: response.status,
    answer: cleanAnswer(answer),
  };
}

async function fetchMedia(session) {
  const response = await request(session, `${BASE}/php/fetch_media.php`, {
    method: "POST",
    headers: {
      accept: "*/*",
      origin: BASE,
      referer: `${BASE}/`,
      "content-length": "0",
      "sec-fetch-site": "same-origin",
      "sec-fetch-mode": "cors",
      "sec-fetch-dest": "empty",
    },
  });

  await response.text().catch(() => "");
}

async function saveResponse(session, question, answer) {
  const body = new URLSearchParams({
    question,
    answer,
    html: answer,
  });

  const response = await request(session, `${BASE}/php/save-response.php`, {
    method: "POST",
    body,
    headers: {
      accept: "*/*",
      origin: BASE,
      referer: `${BASE}/`,
      "content-type": "application/x-www-form-urlencoded",
      "sec-fetch-site": "same-origin",
      "sec-fetch-mode": "cors",
      "sec-fetch-dest": "empty",
    },
  });

  await response.text().catch(() => "");
}

async function ask() {
  const session = await loadSession();

  const finalPrompt = buildContextPrompt(session, USER_PROMPT);

  const userMessage = {
    id: crypto.randomUUID(),
    role: "user",
    content: USER_PROMPT,
  };

  await initSession(session);

  const messageStatus = await sendMessage(session, finalPrompt);
  const stream = await readStreamAnswer(session);

  if (messageStatus === 200 && stream.answer) {
    await fetchMedia(session);
    await saveResponse(session, USER_PROMPT, stream.answer);

    const assistantMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: stream.answer,
    };

    session.messages.push(userMessage, assistantMessage);
    await saveSession(session);
  }

  return {
    status: stream.status === 200 && Boolean(stream.answer),
    code: stream.status,
    question: USER_PROMPT,
    answer: stream.answer,
  };
}

ask()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error) => {
    console.log(
      JSON.stringify(
        {
          status: false,
          code: 500,
          question: USER_PROMPT,
          answer: "",
          error: error.message,
        },
        null,
        2
      )
    );

    process.exit(1);
  });
