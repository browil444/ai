// fake-saldo-dana.js
// Zero external dependencies — returns SVG as image/svg+xml
// No canvas, no font fetch, no GitHub raw URLs — works on any Vercel serverless

function getTime() {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

function generateSVG(angka) {
  const W = 390;
  const H = 844;
  const time = getTime();

  // Hitung panjang teks nominal supaya ikon mata bisa diposisikan
  // Estimasi: bold 32px sans-serif ~19px per karakter rata-rata
  const nominalText = `Rp${angka}`;
  const estimatedTextW = nominalText.length * 19;
  const eyeX = 36 + estimatedTextW + 16;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#108EE9"/>
      <stop offset="100%" stop-color="#0A6FC9"/>
    </linearGradient>
    <linearGradient id="cardGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1DA1F5"/>
      <stop offset="100%" stop-color="#0E7FD4"/>
    </linearGradient>
    <linearGradient id="promoGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FF6B35"/>
      <stop offset="100%" stop-color="#FF4500"/>
    </linearGradient>
    <clipPath id="cardClip">
      <rect x="16" y="90" width="358" height="170" rx="16"/>
    </clipPath>
    <filter id="cardShadow" x="-5%" y="-5%" width="115%" height="130%">
      <feDropShadow dx="0" dy="6" stdDeviation="9" flood-color="rgba(0,0,0,0.18)"/>
    </filter>
    <filter id="whiteShadow" x="-5%" y="-5%" width="120%" height="140%">
      <feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="rgba(0,0,0,0.10)"/>
    </filter>
  </defs>

  <!-- Background biru atas -->
  <rect width="${W}" height="${H * 0.54}" fill="url(#bgGrad)"/>

  <!-- Background abu bawah -->
  <rect y="${H * 0.52}" width="${W}" height="${H * 0.48}" fill="#F2F4F7"/>

  <!-- Gelombang transisi -->
  <path d="M0,${H * 0.50} Q${W * 0.5},${H * 0.57} ${W},${H * 0.50} L${W},${H} L0,${H} Z" fill="#F2F4F7"/>

  <!-- ═══ STATUS BAR ═══ -->
  <text x="20" y="25" font-family="sans-serif" font-size="13" font-weight="bold" fill="rgba(255,255,255,0.9)">${time}</text>
  <!-- Signal bars -->
  <rect x="340" y="18" width="5" height="4" fill="rgba(255,255,255,0.85)" rx="1"/>
  <rect x="348" y="15" width="5" height="7" fill="rgba(255,255,255,0.85)" rx="1"/>
  <rect x="356" y="12" width="5" height="10" fill="rgba(255,255,255,0.85)" rx="1"/>
  <rect x="364" y="9" width="5" height="13" fill="rgba(255,255,255,0.85)" rx="1"/>
  <!-- Battery -->
  <rect x="370" y="14" width="16" height="9" rx="2" stroke="rgba(255,255,255,0.85)" stroke-width="1.2" fill="none"/>
  <rect x="372" y="16" width="10" height="5" fill="rgba(255,255,255,0.85)" rx="1"/>
  <rect x="386" y="17" width="2" height="3" fill="rgba(255,255,255,0.7)" rx="1"/>

  <!-- ═══ HEADER ═══ -->
  <!-- Back arrow -->
  <polyline points="28,68 16,60 28,52" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Title -->
  <text x="${W / 2}" y="65" font-family="sans-serif" font-size="17" font-weight="bold" fill="white" text-anchor="middle">Dompet</text>
  <!-- 3 dots menu -->
  <circle cx="${W - 22}" cy="54" r="2.2" fill="white"/>
  <circle cx="${W - 22}" cy="60" r="2.2" fill="white"/>
  <circle cx="${W - 22}" cy="66" r="2.2" fill="white"/>

  <!-- ═══ CARD SALDO ═══ -->
  <rect x="16" y="90" width="358" height="170" rx="16" fill="url(#cardGrad)" filter="url(#cardShadow)"/>
  <!-- Dekorasi lingkaran dalam card -->
  <circle cx="344" cy="120" r="80" fill="rgba(255,255,255,0.06)" clip-path="url(#cardClip)"/>
  <circle cx="36" cy="280" r="60" fill="rgba(255,255,255,0.06)" clip-path="url(#cardClip)"/>

  <!-- Avatar lingkaran -->
  <circle cx="52" cy="130" r="22" fill="rgba(255,255,255,0.25)"/>
  <text x="52" y="136" font-family="sans-serif" font-size="16" font-weight="bold" fill="white" text-anchor="middle">D</text>

  <!-- Nama & nomor -->
  <text x="84" y="123" font-family="sans-serif" font-size="13" fill="rgba(255,255,255,0.85)">Akun DANA</text>
  <text x="84" y="142" font-family="sans-serif" font-size="12" fill="rgba(255,255,255,0.6)">+62 ●●● ●●●● ●●●●</text>

  <!-- Divider dalam card -->
  <line x1="32" y1="164" x2="358" y2="164" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>

  <!-- Label Saldo -->
  <text x="36" y="180" font-family="sans-serif" font-size="12" fill="rgba(255,255,255,0.75)">Saldo</text>

  <!-- ★ NOMINAL — ini yang berubah sesuai input ★ -->
  <text x="36" y="220" font-family="sans-serif" font-size="32" font-weight="bold" fill="white">${nominalText}</text>

  <!-- Ikon mata -->
  <ellipse cx="${eyeX}" cy="210" rx="11" ry="7" fill="rgba(255,255,255,0.45)"/>
  <circle cx="${eyeX}" cy="210" r="3.5" fill="#1DA1F5"/>
  <circle cx="${eyeX}" cy="210" r="1.5" fill="rgba(255,255,255,0.8)"/>

  <!-- ═══ TOMBOL AKSI ═══ -->
  <!-- Kirim -->
  <rect x="16" y="276" width="110" height="56" rx="12" fill="white" filter="url(#whiteShadow)"/>
  <circle cx="71" cy="296" r="16" fill="#EAF4FE"/>
  <text x="71" y="301" font-family="sans-serif" font-size="16" font-weight="bold" fill="#108EE9" text-anchor="middle">↑</text>
  <text x="71" y="322" font-family="sans-serif" font-size="11" fill="#444" text-anchor="middle">Kirim</text>
  <!-- Terima -->
  <rect x="140" y="276" width="110" height="56" rx="12" fill="white" filter="url(#whiteShadow)"/>
  <circle cx="195" cy="296" r="16" fill="#EAF4FE"/>
  <text x="195" y="301" font-family="sans-serif" font-size="16" font-weight="bold" fill="#108EE9" text-anchor="middle">↓</text>
  <text x="195" y="322" font-family="sans-serif" font-size="11" fill="#444" text-anchor="middle">Terima</text>
  <!-- Tarik -->
  <rect x="264" y="276" width="110" height="56" rx="12" fill="white" filter="url(#whiteShadow)"/>
  <circle cx="319" cy="296" r="16" fill="#EAF4FE"/>
  <text x="319" y="301" font-family="sans-serif" font-size="16" font-weight="bold" fill="#108EE9" text-anchor="middle">⇌</text>
  <text x="319" y="322" font-family="sans-serif" font-size="11" fill="#444" text-anchor="middle">Tarik</text>

  <!-- ═══ PROMO BANNER ═══ -->
  <rect x="16" y="348" width="358" height="56" rx="12" fill="white" filter="url(#whiteShadow)"/>
  <rect x="26" y="358" width="36" height="36" rx="8" fill="url(#promoGrad)"/>
  <text x="44" y="380" font-family="sans-serif" font-size="18" font-weight="bold" fill="white" text-anchor="middle">%</text>
  <text x="72" y="368" font-family="sans-serif" font-size="13" font-weight="bold" fill="#222">Promo &amp; Cashback</text>
  <text x="72" y="385" font-family="sans-serif" font-size="11" fill="#888">Cek penawaran spesial untukmu</text>
  <polyline points="362,372 370,376 362,380" stroke="#bbb" stroke-width="1.5" fill="none" stroke-linecap="round"/>

  <!-- ═══ RIWAYAT TRANSAKSI ═══ -->
  <rect x="16" y="420" width="358" height="200" rx="12" fill="white" filter="url(#whiteShadow)"/>
  <text x="30" y="440" font-family="sans-serif" font-size="13" font-weight="bold" fill="#222">Riwayat Transaksi</text>
  <text x="360" y="440" font-family="sans-serif" font-size="11" fill="#108EE9" text-anchor="end">Lihat Semua</text>
  <line x1="30" y1="452" x2="360" y2="452" stroke="#F0F0F0" stroke-width="1"/>

  <!-- Row 1: Transfer keluar -->
  <circle cx="42" cy="472" r="14" fill="rgba(231,76,60,0.13)"/>
  <text x="42" y="477" font-family="sans-serif" font-size="13" font-weight="bold" fill="#E74C3C" text-anchor="middle">→</text>
  <text x="64" y="468" font-family="sans-serif" font-size="12" font-weight="bold" fill="#222">Transfer ke</text>
  <text x="64" y="483" font-family="sans-serif" font-size="11" fill="#999">Ahmad S.</text>
  <text x="360" y="474" font-family="sans-serif" font-size="12" font-weight="bold" fill="#E74C3C" text-anchor="end">-Rp50.000</text>
  <line x1="30" y1="494" x2="360" y2="494" stroke="#F5F5F5" stroke-width="1"/>

  <!-- Row 2: Terima -->
  <circle cx="42" cy="514" r="14" fill="rgba(39,174,96,0.13)"/>
  <text x="42" y="519" font-family="sans-serif" font-size="13" font-weight="bold" fill="#27AE60" text-anchor="middle">←</text>
  <text x="64" y="510" font-family="sans-serif" font-size="12" font-weight="bold" fill="#222">Terima dari</text>
  <text x="64" y="525" font-family="sans-serif" font-size="11" fill="#999">Budi R.</text>
  <text x="360" y="516" font-family="sans-serif" font-size="12" font-weight="bold" fill="#27AE60" text-anchor="end">+Rp100.000</text>
  <line x1="30" y1="536" x2="360" y2="536" stroke="#F5F5F5" stroke-width="1"/>

  <!-- Row 3: Pulsa -->
  <circle cx="42" cy="556" r="14" fill="rgba(243,156,18,0.13)"/>
  <text x="42" y="561" font-family="sans-serif" font-size="13" font-weight="bold" fill="#F39C12" text-anchor="middle">☎</text>
  <text x="64" y="552" font-family="sans-serif" font-size="12" font-weight="bold" fill="#222">Pulsa</text>
  <text x="64" y="567" font-family="sans-serif" font-size="11" fill="#999">08xx-xxxx-xxxx</text>
  <text x="360" y="558" font-family="sans-serif" font-size="12" font-weight="bold" fill="#E74C3C" text-anchor="end">-Rp25.000</text>
  <line x1="30" y1="578" x2="360" y2="578" stroke="#F5F5F5" stroke-width="1"/>

  <!-- Row 4: Bayar listrik -->
  <circle cx="42" cy="598" r="14" fill="rgba(52,152,219,0.13)"/>
  <text x="42" y="603" font-family="sans-serif" font-size="13" font-weight="bold" fill="#3498DB" text-anchor="middle">⚡</text>
  <text x="64" y="594" font-family="sans-serif" font-size="12" font-weight="bold" fill="#222">Listrik PLN</text>
  <text x="64" y="609" font-family="sans-serif" font-size="11" fill="#999">123456789012</text>
  <text x="360" y="600" font-family="sans-serif" font-size="12" font-weight="bold" fill="#E74C3C" text-anchor="end">-Rp150.000</text>

  <!-- ═══ BOTTOM NAV ═══ -->
  <rect x="0" y="772" width="${W}" height="72" fill="white"/>
  <line x1="0" y1="772" x2="${W}" y2="772" stroke="#E8E8E8" stroke-width="1"/>
  <!-- Beranda (aktif) -->
  <text x="49" y="798" font-family="sans-serif" font-size="22" text-anchor="middle">🏠</text>
  <text x="49" y="818" font-family="sans-serif" font-size="10" fill="#108EE9" text-anchor="middle">Beranda</text>
  <!-- Transaksi -->
  <text x="147" y="798" font-family="sans-serif" font-size="22" text-anchor="middle">💳</text>
  <text x="147" y="818" font-family="sans-serif" font-size="10" fill="#AAAAAA" text-anchor="middle">Transaksi</text>
  <!-- Notifikasi -->
  <text x="245" y="798" font-family="sans-serif" font-size="22" text-anchor="middle">🔔</text>
  <text x="245" y="818" font-family="sans-serif" font-size="10" fill="#AAAAAA" text-anchor="middle">Notifikasi</text>
  <!-- Akun -->
  <text x="343" y="798" font-family="sans-serif" font-size="22" text-anchor="middle">👤</text>
  <text x="343" y="818" font-family="sans-serif" font-size="10" fill="#AAAAAA" text-anchor="middle">Akun</text>

</svg>`;
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
    const svg = generateSVG(angka);
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Content-Disposition', `inline; filename="dana_${raw}.svg"`);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(svg);
  } catch (err) {
    console.error('[fake-saldo-dana] Error:', err);
    return res.status(500).json({ error: err.message || 'Gagal generate.' });
  }
}
