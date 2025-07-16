#!/bin/bash

# Incident Ticket System Project Setup Script
# Stack: Next.js, Prisma, Tailwind CSS, TypeScript, Baileys JS, MySQL

PROJECT_NAME="incident-ticket-system"
echo "🚀 Creating Incident Ticket System Project Structure..."

# Create main project directory
mkdir -p $PROJECT_NAME
cd $PROJECT_NAME

# Initialize Next.js with TypeScript
echo "📦 Initializing Next.js project with TypeScript..."
npx create-next-app@latest . --typescript --tailwind --eslint --app --use-npm --no-src-dir

# Create main directory structure
echo "📁 Creating project structure..."

# Core directories
mkdir -p {components,lib,types,hooks,utils,middleware}

# Feature-based directories
mkdir -p {app,components,lib}/{auth,incidents,dashboard,reports,notifications}

# Components structure
mkdir -p components/{ui,forms,tables,modals,layouts}
mkdir -p components/incidents/{form,list,detail,status}
mkdir -p components/dashboard/{stats,charts,recent-activities}
mkdir -p components/reports/{filters,export,table}

# API routes structure
mkdir -p app/api/{auth,incidents,users,reports,notifications,whatsapp}

# Database and config
mkdir -p {prisma,config}
mkdir -p prisma/{migrations,seed}

# WhatsApp bot structure
mkdir -p services/{whatsapp,notifications,email}

# Public assets
mkdir -p public/{images,icons,documents}

# Utils and helpers
mkdir -p utils/{date,format,validation,constants}

# Types directory
mkdir -p types/{api,database,components,forms}

# Middleware and auth
mkdir -p middleware/{auth,role,logging}

# Install dependencies
echo "📦 Installing dependencies..."

# Core dependencies
npm install prisma @prisma/client
npm install @baileys/md @adiwajshing/baileys
npm install bcryptjs jsonwebtoken
npm install next-auth
npm install @hookform/resolvers react-hook-form
npm install zod
npm install date-fns
npm install jspdf jspdf-autotable
npm install axios
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
npm install @radix-ui/react-select @radix-ui/react-toast
npm install lucide-react
npm install mysql2

# Dev dependencies
npm install -D @types/bcryptjs @types/jsonwebtoken
npm install -D @types/node
npm install -D prisma

# Create basic configuration files
echo "⚙️ Creating configuration files..."

# Environment variables template
cat > .env.example << 'EOF'
# Database
DATABASE_URL="mysql://username:password@localhost:3306/incident_tickets"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# WhatsApp Bot
WHATSAPP_SESSION_PATH="./whatsapp_session"
WHATSAPP_WEBHOOK_URL="http://localhost:3000/api/whatsapp/webhook"

# Application
APP_NAME="Incident Ticket System"
APP_URL="http://localhost:3000"
EOF

# Prisma schema
cat > prisma/schema.prisma << 'EOF'
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  phone     String?
  role      Role     @default(REPORTER)
  password  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  reportedIncidents Incident[] @relation("ReportedBy")
  qcIncidents      Incident[] @relation("QCBy")
  pmIncidents      Incident[] @relation("PMBy")

  @@map("users")
}

model Incident {
  id          String   @id @default(cuid())
  title       String
  description String   @db.Text
  location    String
  occurredAt  DateTime
  status      Status   @default(PENDING_QC)
  priority    Priority @default(MEDIUM)
  
  reporterId  String
  reporter    User     @relation("ReportedBy", fields: [reporterId], references: [id])
  
  qcId        String?
  qc          User?    @relation("QCBy", fields: [qcId], references: [id])
  qcAt        DateTime?
  qcComment   String?
  
  pmId        String?
  pm          User?    @relation("PMBy", fields: [pmId], references: [id])
  pmAt        DateTime?
  pmComment   String?
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  attachments IncidentAttachment[]
  logs        IncidentLog[]

  @@map("incidents")
}

model IncidentAttachment {
  id         String   @id @default(cuid())
  filename   String
  originalName String
  mimeType   String
  size       Int
  path       String
  
  incidentId String
  incident   Incident @relation(fields: [incidentId], references: [id], onDelete: Cascade)
  
  createdAt  DateTime @default(now())

  @@map("incident_attachments")
}

model IncidentLog {
  id         String   @id @default(cuid())
  action     String
  oldStatus  Status?
  newStatus  Status?
  comment    String?
  userId     String
  incidentId String
  incident   Incident @relation(fields: [incidentId], references: [id], onDelete: Cascade)
  createdAt  DateTime @default(now())

  @@map("incident_logs")
}

enum Role {
  ADMIN
  REPORTER
  QC
  PM
}

enum Status {
  PENDING_QC
  APPROVED_QC
  REJECTED_QC
  PENDING_PM
  APPROVED_PM
  REJECTED_PM
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}
EOF

# Create basic middleware
cat > middleware.ts << 'EOF'
import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(req) {
    // Add middleware logic here
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: ["/dashboard/:path*", "/incidents/:path*", "/reports/:path*"]
}
EOF

# Create basic types
cat > types/index.ts << 'EOF'
export type Role = 'ADMIN' | 'REPORTER' | 'QC' | 'PM'
export type Status = 'PENDING_QC' | 'APPROVED_QC' | 'REJECTED_QC' | 'PENDING_PM' | 'APPROVED_PM' | 'REJECTED_PM'
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface User {
  id: string
  email: string
  name: string
  phone?: string
  role: Role
  createdAt: Date
  updatedAt: Date
}

export interface Incident {
  id: string
  title: string
  description: string
  location: string
  occurredAt: Date
  status: Status
  priority: Priority
  reporter: User
  qc?: User
  pm?: User
  qcAt?: Date
  pmAt?: Date
  qcComment?: string
  pmComment?: string
  attachments: IncidentAttachment[]
  createdAt: Date
  updatedAt: Date
}

export interface IncidentAttachment {
  id: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  path: string
}

export interface WhatsAppMessage {
  to: string
  message: string
  type: 'text' | 'image' | 'document'
}
EOF

# Create basic utils
cat > utils/constants.ts << 'EOF'
export const ROLES = {
  ADMIN: 'ADMIN',
  REPORTER: 'REPORTER',
  QC: 'QC',
  PM: 'PM'
} as const

export const STATUS = {
  PENDING_QC: 'PENDING_QC',
  APPROVED_QC: 'APPROVED_QC',
  REJECTED_QC: 'REJECTED_QC',
  PENDING_PM: 'PENDING_PM',
  APPROVED_PM: 'APPROVED_PM',
  REJECTED_PM: 'REJECTED_PM'
} as const

export const PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
} as const

export const WHATSAPP_MESSAGES = {
  NEW_INCIDENT: (incident: any) => 
    `🚨 *Tiket Insiden Baru*\n\n` +
    `📋 *Judul:* ${incident.title}\n` +
    `📍 *Lokasi:* ${incident.location}\n` +
    `👤 *Pelapor:* ${incident.reporter.name}\n` +
    `🕒 *Waktu:* ${incident.occurredAt}\n\n` +
    `Silakan cek dan proses: ${process.env.APP_URL}/incidents/${incident.id}`,
    
  QC_APPROVED: (incident: any) => 
    `✅ *Tiket Disetujui QC*\n\n` +
    `📋 *Judul:* ${incident.title}\n` +
    `👤 *QC:* ${incident.qc.name}\n` +
    `🕒 *Waktu Approval:* ${incident.qcAt}\n\n` +
    `Menunggu final approval PM: ${process.env.APP_URL}/incidents/${incident.id}`,
    
  QC_REJECTED: (incident: any) => 
    `❌ *Tiket Ditolak QC*\n\n` +
    `📋 *Judul:* ${incident.title}\n` +
    `👤 *QC:* ${incident.qc.name}\n` +
    `💬 *Komentar:* ${incident.qcComment}\n\n` +
    `Detail: ${process.env.APP_URL}/incidents/${incident.id}`,
    
  PM_APPROVED: (incident: any) => 
    `✅ *Tiket Disetujui Final*\n\n` +
    `📋 *Judul:* ${incident.title}\n` +
    `👤 *PM:* ${incident.pm.name}\n` +
    `🕒 *Waktu Approval:* ${incident.pmAt}\n\n` +
    `Tiket telah disetujui dan dapat diproses lebih lanjut.`,
    
  PM_REJECTED: (incident: any) => 
    `❌ *Tiket Ditolak Final*\n\n` +
    `📋 *Judul:* ${incident.title}\n` +
    `👤 *PM:* ${incident.pm.name}\n` +
    `💬 *Komentar:* ${incident.pmComment}\n\n` +
    `Tiket telah ditolak secara final.`
}
EOF

# Create basic WhatsApp service
cat > services/whatsapp/index.ts << 'EOF'
import { makeWASocket, DisconnectReason, useMultiFileAuthState } from '@baileys/md'
import { Boom } from '@hapi/boom'
import path from 'path'

class WhatsAppService {
  private socket: any = null
  private isConnected = false

  async initialize() {
    try {
      const { state, saveCreds } = await useMultiFileAuthState(
        path.join(process.cwd(), 'whatsapp_session')
      )

      this.socket = makeWASocket({
        auth: state,
        printQRInTerminal: true,
      })

      this.socket.ev.on('connection.update', this.handleConnectionUpdate.bind(this))
      this.socket.ev.on('creds.update', saveCreds)

      return this.socket
    } catch (error) {
      console.error('WhatsApp initialization error:', error)
      throw error
    }
  }

  private handleConnectionUpdate(update: any) {
    const { connection, lastDisconnect } = update
    
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
      console.log('Connection closed due to:', lastDisconnect?.error)
      
      if (shouldReconnect) {
        this.initialize()
      }
    } else if (connection === 'open') {
      console.log('WhatsApp connected successfully')
      this.isConnected = true
    }
  }

  async sendMessage(to: string, message: string) {
    if (!this.socket || !this.isConnected) {
      throw new Error('WhatsApp not connected')
    }

    try {
      // Format phone number (remove + and add @s.whatsapp.net)
      const formattedNumber = to.replace(/\+/g, '') + '@s.whatsapp.net'
      
      await this.socket.sendMessage(formattedNumber, {
        text: message
      })
      
      console.log(`Message sent to ${to}:`, message)
      return { success: true }
    } catch (error) {
      console.error('Send message error:', error)
      throw error
    }
  }
}

export const whatsappService = new WhatsAppService()
EOF

# Create package.json scripts
cat > package.json.temp << 'EOF'
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio",
    "postinstall": "prisma generate"
  }
}
EOF

# Merge with existing package.json
node -e "
const existing = require('./package.json');
const temp = require('./package.json.temp');
const merged = { ...existing, scripts: { ...existing.scripts, ...temp.scripts } };
require('fs').writeFileSync('./package.json', JSON.stringify(merged, null, 2));
"
rm package.json.temp

# Create basic README
cat > README.md << 'EOF'
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
EOF

echo "✅ Project structure created successfully!"
echo ""
echo "📋 Next Steps:"
echo "1. cd $PROJECT_NAME"
echo "2. Copy .env.example to .env and configure"
echo "3. Setup MySQL database"
echo "4. Run: npm run db:push"
echo "5. Run: npm run dev"
echo ""
echo "🤖 WhatsApp Bot Setup:"
echo "- Make sure to scan QR code when prompted"
echo "- Keep the session files secure"
echo ""
echo "📖 Check README.md for detailed setup instructions"