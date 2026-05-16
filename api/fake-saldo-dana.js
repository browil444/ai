import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const CONFIG = {
  rp:    { x: 70,  y: 62,  fontSize: 19,  color: '#a9e6ff' },
  saldo: { x: 101, y: 53,  fontSize: 29,  color: '#FFFFFF' },
  icon:  { gap: 8,  y: 64,  size: 20 },
};

// Cache font path agar tidak re-download setiap request
const fontCache = {};

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': '*/*',
  'Cache-Control': 'no-cache',
};

async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

async function loadFont(url, name) {
  // Kalau sudah pernah di-load dan file masih ada, skip
  if (fontCache[name] && existsSync(fontCache[name])) {
    return fontCache[name];
  }

  const res = await fetchWithTimeout(url, { headers: FETCH_HEADERS });
  if (!res.ok) throw new Error(`Gagal fetch font ${name}: HTTP ${res.status}`);

  const buf     = Buffer.from(await res.arrayBuffer());
  const tmpPath = join(tmpdir(), `${name}.ttf`); // nama tetap, tidak pakai timestamp agar bisa re-use
  writeFileSync(tmpPath, buf);
  GlobalFonts.registerFromPath(tmpPath, name);
  fontCache[name] = tmpPath;
  return tmpPath;
}

async function generate(angka) {
  // Load font & background paralel
  const [, , bg] = await Promise.all([
    loadFont(
      'https://raw.githubusercontent.com/Ditzzx-vibecoder/Assets/main/Font/iconfont.ttf',
      'FontRp'
    ),
    loadFont(
      'https://raw.githubusercontent.com/Ditzzx-vibecoder/Assets/main/Font/f5803c-1772975107907.ttf',
      'FontSaldo'
    ),
    (async () => {
      const res = await fetchWithTimeout(
        'https://raw.githubusercontent.com/Ditzzx-vibecoder/Assets/main/Image/_20260501192538912.jpg',
        { headers: FETCH_HEADERS }
      );
      if (!res.ok) throw new Error(`Gagal fetch background: HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      return loadImage(buf);
    })(),
  ]);

  const canvas = createCanvas(bg.width, bg.height);
  const ctx    = canvas.getContext('2d');

  ctx.drawImage(bg, 0, 0);

  // Tulis "Rp"
  ctx.font         = `${CONFIG.rp.fontSize}px FontRp`;
  ctx.fillStyle    = CONFIG.rp.color;
  ctx.textBaseline = 'top';
  ctx.fillText('Rp', CONFIG.rp.x, CONFIG.rp.y);

  // Tulis nominal
  ctx.font         = `${CONFIG.saldo.fontSize}px FontSaldo`;
  ctx.fillStyle    = CONFIG.saldo.color;
  ctx.textBaseline = 'top';
  ctx.fillText(angka, CONFIG.saldo.x, CONFIG.saldo.y);

  // Ikon mata
  const textWidth = ctx.measureText(angka).width;
  const iconX     = CONFIG.saldo.x + textWidth + CONFIG.icon.gap;
  ctx.font      = `${CONFIG.icon.size}px sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.fillText('●', iconX, CONFIG.icon.y);

  return canvas.toBuffer('image/png');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const rawNominal =
    req.query?.nominal ||
    req.body?.nominal ||
    null;

  if (!rawNominal) {
    return res.status(400).json({
      error: "Parameter 'nominal' wajib diisi.",
      contoh: '/api/fake-saldo-dana?nominal=150000',
    });
  }

  const raw = Number(String(rawNominal).replace(/\./g, '').replace(/,/g, ''));
  if (isNaN(raw) || raw < 0) {
    return res.status(400).json({ error: 'Nominal tidak valid. Contoh: 150000' });
  }

  const angka = raw.toLocaleString('id-ID');

  try {
    const buffer = await generate(angka);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="dana_${raw}.png"`);
    return res.status(200).send(buffer);
  } catch (err) {
    console.error('[fake-saldo-dana] Error:', err);
    return res.status(500).json({
      error: err.message || 'Gagal generate gambar.',
      hint: 'Pastikan asset GitHub bisa diakses dari server Vercel.',
    });
  }
}
