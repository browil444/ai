const API = "https://feelbetterbot.com/";

function makeMemoryId() {
  const animals = ["owl", "fox", "cat", "wolf", "bear", "lion", "deer", "bird"];
  const words = ["safe", "calm", "soft", "kind", "warm", "bright", "gentle"];
  const word = words[Math.floor(Math.random() * words.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  const number = Math.floor(1000 + Math.random() * 9000);
  return `${word}-${animal}-${number}`;
}

function parseChunk(line) {
  let data = line.trim();
  if (!data) return "";
  if (data === "[DONE]") return "";
  if (data.startsWith("data:")) data = data.slice(5).trim();
  if (!data || data === "[DONE]") return "";
  try {
    const json = JSON.parse(data);
    if (typeof json === "string") return json;
    if (typeof json.content === "string") return json.content;
    if (typeof json.text === "string") return json.text;
    if (typeof json.delta === "string") return json.delta;
    if (typeof json.message === "string") return json.message;
    if (typeof json.response === "string") return json.response;
    if (typeof json.answer === "string") return json.answer;
    const openAiContent = json.choices?.[0]?.delta?.content;
    if (typeof openAiContent === "string") return openAiContent;
    return "";
  } catch {
    return data;
  }
}

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

  const memoryId = makeMemoryId();

  const SYSTEM_MESSAGE =
    system ||
    "Kamu adalah asisten AI yang dibuat oleh Wildann. Ikuti bahasa yang digunakan user dalam percakapan. Jika user memakai bahasa Indonesia, jawab dalam bahasa Indonesia yang natural, santai, jelas, dan mudah dipahami. Jangan tiba-tiba pindah bahasa kecuali user memintanya. Jika user bertanya siapa pembuatmu, penciptamu, developermu, atau siapa yang membuatmu, jawab bahwa pembuatmu adalah wildann.";

  const DEFAULT_ASSISTANT_MESSAGE =
    "Hi, I'm FeelBetterBot — I'm here to listen and help you carry whatever feels heavy, without judgment. I draw on gentle, proven ways of working through hard things, but mostly I just want to understand what you're going through. So, how are you doing right now?";

  const body = {
    messages: [
      { role: "system", content: SYSTEM_MESSAGE },
      { role: "assistant", content: DEFAULT_ASSISTANT_MESSAGE },
      ...messages,
    ],
  };

  const headers = {
    "sec-ch-ua-platform": `"Android"`,
    "user-agent":
      "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36",
    "sec-ch-ua": `"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"`,
    "content-type": "application/json",
    "sec-ch-ua-mobile": "?1",
    accept: "*/*",
    origin: "https://feelbetterbot.com",
    referer: "https://feelbetterbot.com/",
    "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    cookie: `feelbet-memory=${memoryId}`,
    priority: "u=1, i",
  };

  try {
    const response = await fetch(API, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(502).json({ error: "Upstream error", detail: text.slice(0, 500) });
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let answer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const rawLine of lines) {
        const chunk = parseChunk(rawLine);
        if (chunk) answer += chunk;
      }
    }

    if (buffer.trim()) {
      const chunk = parseChunk(buffer);
      if (chunk) answer += chunk;
    }

    if (!answer) {
      return res.status(502).json({ error: "No answer from upstream" });
    }

    return res.status(200).json({
      choices: [{ message: { role: "assistant", content: answer } }],
      model: "epic",
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
