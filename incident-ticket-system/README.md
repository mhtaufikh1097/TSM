# Incident Ticket System

Sistem manajemen tiket insiden dengan approval workflow dan notifikasi WhatsApp otomatis.

## Fitur Utama

- 🎫 **Pelaporan Insiden** - Form input dengan upload bukti
- 🔄 **Alur Approval** - QC → PM workflow
- 📱 **Notifikasi WhatsApp** - Pesan otomatis untuk setiap aksi
- 📊 **Dashboard & Laporan** - Tracking status dan export PDF
- 🔐 **Role Management** - Pelapor, QC, PM, Admin

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: MySQL
- **WhatsApp**: Baileys JS
- **Authentication**: NextAuth.js

## Setup

1. Clone dan install dependencies:
```bash
npm install
```

2. Setup database:
```bash
cp .env.example .env
# Edit .env dengan konfigurasi database
npm run db:push
```

3. Jalankan development server:
```bash
npm run dev
```

4. Setup WhatsApp Bot:
- QR code akan muncul di terminal
- Scan dengan WhatsApp

## Struktur Project

```
incident-ticket-system/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   ├── dashboard/         # Dashboard pages
│   ├── incidents/         # Incident management
│   └── reports/           # Reporting pages
├── components/            # React components
├── lib/                   # Utilities & configurations
├── prisma/               # Database schema & migrations
├── services/             # External services (WhatsApp, etc)
├── types/                # TypeScript definitions
└── utils/                # Helper functions
```

## Pengembangan

Lihat file `DEVELOPMENT_STRATEGY.md` untuk panduan pengembangan tahap demi tahap.
