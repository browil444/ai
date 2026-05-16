import { createCanvas } from '@napi-rs/canvas';

// ─── Ukuran canvas (proporsi layar HP) ───────────────────────────────────────
const W = 390;
const H = 844;

// ─── Helper: rounded rect ────────────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─── Helper: jam sekarang ─────────────────────────────────────────────────────
function getTime() {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

// ─── Generate ─────────────────────────────────────────────────────────────────
function generate(angka) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // ── Background utama (biru DANA) ──────────────────────────────────────────
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H * 0.55);
  bgGrad.addColorStop(0, '#108EE9');
  bgGrad.addColorStop(1, '#0A6FC9');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // ── Background bawah (abu) ───────────────────────────────────────────────
  ctx.fillStyle = '#F2F4F7';
  ctx.fillRect(0, H * 0.52, W, H * 0.48);

  // ── Gelombang transisi biru → abu ────────────────────────────────────────
  ctx.fillStyle = '#F2F4F7';
  ctx.beginPath();
  ctx.moveTo(0, H * 0.50);
  ctx.quadraticCurveTo(W * 0.5, H * 0.57, W, H * 0.50);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();

  // ── Status bar ───────────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = 'bold 13px sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText(getTime(), 20, 14);

  // Signal bars
  for (let i = 0; i < 4; i++) {
    const bh = 4 + i * 3;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(W - 50 + i * 8, 22 - bh, 5, bh);
  }
  // WiFi
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 1.5;
  for (let r of [5, 9, 13]) {
    ctx.beginPath();
    ctx.arc(W - 80, 24, r, Math.PI * 1.25, Math.PI * 1.75);
    ctx.stroke();
  }
  // Battery
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 1.2;
  roundRect(ctx, W - 30, 14, 20, 10, 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillRect(W - 28, 16, 14, 6);
  ctx.fillRect(W - 10, 17, 2, 4);

  // ── Header bar ──────────────────────────────────────────────────────────
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(30, 68);
  ctx.lineTo(18, 60);
  ctx.lineTo(30, 52);
  ctx.stroke();

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 17px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText('Dompet', W / 2, 60);
  ctx.textAlign = 'left';

  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(W - 30, 54 + i * 6, 2.2, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  }

  // ── Card saldo utama ─────────────────────────────────────────────────────
  const cardX = 16;
  const cardY = 90;
  const cardW = W - 32;
  const cardH = 170;

  ctx.shadowColor = 'rgba(0,0,0,0.18)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;

  const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
  cardGrad.addColorStop(0, '#1DA1F5');
  cardGrad.addColorStop(1, '#0E7FD4');
  ctx.fillStyle = cardGrad;
  roundRect(ctx, cardX, cardY, cardW, cardH, 16);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Dekorasi lingkaran
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath();
  ctx.arc(cardX + cardW - 30, cardY + 30, 80, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cardX + 20, cardY + cardH + 20, 60, 0, Math.PI * 2);
  ctx.fill();

  // Avatar
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.arc(cardX + 36, cardY + 40, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText('D', cardX + 36, cardY + 40);
  ctx.textAlign = 'left';

  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '13px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('Akun DANA', cardX + 68, cardY + 33);

  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '12px sans-serif';
  ctx.fillText('+62 ●●● ●●●● ●●●●', cardX + 68, cardY + 52);

  // Divider
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX + 16, cardY + 74);
  ctx.lineTo(cardX + cardW - 16, cardY + 74);
  ctx.stroke();

  // Label saldo
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '12px sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText('Saldo', cardX + 20, cardY + 84);

  // ★ NOMINAL SALDO — ini yang berubah sesuai input ★
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 32px sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText(`Rp${angka}`, cardX + 20, cardY + 104);

  // Ikon mata
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.ellipse(cardX + cardW - 30, cardY + 120, 10, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1DA1F5';
  ctx.beginPath();
  ctx.arc(cardX + cardW - 30, cardY + 120, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // ── Tombol aksi ──────────────────────────────────────────────────────────
  const btnY = cardY + cardH + 14;
  const btns = ['Kirim', 'Terima', 'Tarik'];
  const icons = ['↑', '↓', '⇌'];
  const btnW2 = (cardW - 16) / 3;

  btns.forEach((label, i) => {
    const bx = cardX + i * (btnW2 + 8);

    ctx.shadowColor = 'rgba(0,0,0,0.10)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;

    ctx.fillStyle = '#fff';
    roundRect(ctx, bx, btnY, btnW2, 56, 12);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.fillStyle = '#EAF4FE';
    ctx.beginPath();
    ctx.arc(bx + btnW2 / 2, btnY + 20, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#108EE9';
    ctx.font = 'bold 15px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(icons[i], bx + btnW2 / 2, btnY + 20);

    ctx.fillStyle = '#444';
    ctx.font = '11px sans-serif';
    ctx.fillText(label, bx + btnW2 / 2, btnY + 44);
    ctx.textAlign = 'left';
  });

  // ── Promo banner ─────────────────────────────────────────────────────────
  const promoY = btnY + 72;

  ctx.shadowColor = 'rgba(0,0,0,0.08)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = '#fff';
  roundRect(ctx, cardX, promoY, cardW, 56, 12);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  const promoBadgeGrad = ctx.createLinearGradient(cardX + 6, promoY + 8, cardX + 6, promoY + 44);
  promoBadgeGrad.addColorStop(0, '#FF6B35');
  promoBadgeGrad.addColorStop(1, '#FF4500');
  ctx.fillStyle = promoBadgeGrad;
  roundRect(ctx, cardX + 10, promoY + 10, 36, 36, 8);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText('%', cardX + 28, promoY + 28);
  ctx.textAlign = 'left';

  ctx.fillStyle = '#222';
  ctx.font = 'bold 13px sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText('Promo & Cashback', cardX + 56, promoY + 12);
  ctx.fillStyle = '#888';
  ctx.font = '11px sans-serif';
  ctx.fillText('Cek penawaran spesial untukmu', cardX + 56, promoY + 30);

  ctx.strokeStyle = '#bbb';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(W - 28, promoY + 24);
  ctx.lineTo(W - 20, promoY + 28);
  ctx.lineTo(W - 28, promoY + 32);
  ctx.stroke();

  // ── Riwayat transaksi ────────────────────────────────────────────────────
  const riwY = promoY + 68;

  ctx.shadowColor = 'rgba(0,0,0,0.07)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = '#fff';
  roundRect(ctx, cardX, riwY, cardW, 180, 12);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#222';
  ctx.font = 'bold 13px sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText('Riwayat Transaksi', cardX + 14, riwY + 14);

  ctx.fillStyle = '#108EE9';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('Lihat Semua', cardX + cardW - 14, riwY + 16);
  ctx.textAlign = 'left';

  ctx.strokeStyle = '#F0F0F0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX + 14, riwY + 38);
  ctx.lineTo(cardX + cardW - 14, riwY + 38);
  ctx.stroke();

  const rows = [
    { icon: '→', color: '#E74C3C', label: 'Transfer ke', sub: 'Ahmad S.', amount: '-Rp50.000', amtColor: '#E74C3C' },
    { icon: '←', color: '#27AE60', label: 'Terima dari', sub: 'Budi R.', amount: '+Rp100.000', amtColor: '#27AE60' },
    { icon: '☎', color: '#F39C12', label: 'Pulsa', sub: '08xx-xxxx-xxxx', amount: '-Rp25.000', amtColor: '#E74C3C' },
  ];

  rows.forEach((row, i) => {
    const ry = riwY + 48 + i * 42;

    ctx.fillStyle = row.color + '22';
    ctx.beginPath();
    ctx.arc(cardX + 26, ry + 14, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = row.color;
    ctx.font = 'bold 13px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(row.icon, cardX + 26, ry + 14);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#222';
    ctx.font = 'bold 12px sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText(row.label, cardX + 48, ry + 4);

    ctx.fillStyle = '#999';
    ctx.font = '11px sans-serif';
    ctx.fillText(row.sub, cardX + 48, ry + 20);

    ctx.fillStyle = row.amtColor;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(row.amount, cardX + cardW - 14, ry + 10);
    ctx.textAlign = 'left';

    if (i < rows.length - 1) {
      ctx.strokeStyle = '#F5F5F5';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cardX + 14, ry + 36);
      ctx.lineTo(cardX + cardW - 14, ry + 36);
      ctx.stroke();
    }
  });

  // ── Bottom nav ───────────────────────────────────────────────────────────
  const navY = H - 72;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, navY, W, 72);

  ctx.strokeStyle = '#E8E8E8';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, navY);
  ctx.lineTo(W, navY);
  ctx.stroke();

  const navItems = ['🏠', '💳', '🔔', '👤'];
  const navLabels = ['Beranda', 'Transaksi', 'Notifikasi', 'Akun'];
  navItems.forEach((icon, i) => {
    const nx = (W / 4) * i + W / 8;
    ctx.font = '22px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillStyle = i === 0 ? '#108EE9' : '#AAAAAA';
    ctx.fillText(icon, nx, navY + 24);
    ctx.font = '10px sans-serif';
    ctx.fillStyle = i === 0 ? '#108EE9' : '#AAAAAA';
    ctx.fillText(navLabels[i], nx, navY + 48);
  });
  ctx.textAlign = 'left';

  return canvas.toBuffer('image/png');
}

// ─── Handler ──────────────────────────────────────────────────────────────────
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
    const buffer = generate(angka);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="dana_${raw}.png"`);
    return res.status(200).send(buffer);
  } catch (err) {
    console.error('[fake-saldo-dana] Error:', err);
    return res.status(500).json({ error: err.message || 'Gagal generate gambar.' });
  }
}
