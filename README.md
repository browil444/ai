# OrdinaryAi

Web AI chat berbasis Next.js/Vercel dengan multiple model.

## Struktur Project

```
ordinaryai/
├── api/
│   ├── epic.js            # Model Epic (FeelBetterBot)
│   ├── legend.js          # Model Legend (GPT-4o via Overchat)
│   ├── mythic.js          # Model Mythic (Claude Haiku via Overchat)
│   ├── fake-saldo-dana.js # Generator saldo Dana palsu
│   └── text-to-image.js   # Text to Image (Deep Image AI)
├── public/
│   └── index.html         # Frontend UI
├── .gitignore
├── package.json
├── vercel.json
└── README.md
```

## Deploy ke Vercel

### 1. Push ke GitHub

```bash
git init
git add .
git commit -m "init: OrdinaryAi project"
git branch -M main
git remote add origin https://github.com/USERNAME/ordinaryai.git
git push -u origin main
```

### 2. Connect ke Vercel

1. Buka [vercel.com](https://vercel.com) → New Project
2. Import repo GitHub kamu
3. Framework Preset: **Other**
4. Root Directory: `.` (default)
5. Klik **Deploy**

### 3. Update BASE_URL di HTML

Setelah deploy, update baris ini di `public/index.html`:

```js
const BASE_URL = "https://NAMA-PROJECT-KAMU.vercel.app";
```

Ganti `NAMA-PROJECT-KAMU` dengan nama project Vercel kamu.

## API Endpoints

| Endpoint | Method | Body |
|----------|--------|------|
| `/api/epic` | POST | `{ messages: [...], system?: "..." }` |
| `/api/legend` | POST | `{ messages: [...], system?: "..." }` |
| `/api/mythic` | POST | `{ messages: [...], system?: "..." }` |
| `/api/fake-saldo-dana` | POST/GET | `{ nominal: 150000 }` atau `?nominal=150000` |
| `/api/text-to-image` | POST | `{ prompt: "...", width?: 768, height?: 1152 }` |

## Catatan

- `fake-saldo-dana` butuh `skia-canvas` — bisa jadi lambat di cold start Vercel
- `text-to-image` bisa timeout kalau gambar lama di-generate (max 2 menit)
- Semua endpoint sudah include CORS headers
