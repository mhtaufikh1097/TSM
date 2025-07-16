# Authentication System

Sistem authentication lengkap untuk Incident Ticket System menggunakan NextAuth.js dengan role-based access control.

## Fitur

- 🔐 **Login/Register** - Email & password authentication
- 👥 **Role-based Access** - ADMIN, REPORTER, QC, PM
- 🛡️ **Protected Routes** - Middleware untuk melindungi halaman
- 🔒 **Password Hashing** - bcrypt untuk keamanan password
- 🎫 **Session Management** - JWT token dengan NextAuth.js

## Role Permissions

### ADMIN
- Akses ke semua fitur sistem
- Dapat melihat dan mengelola semua user
- Akses penuh ke dashboard dan laporan

### REPORTER  
- Dapat membuat tiket insiden baru
- Melihat tiket yang dilaporkan sendiri
- Mengupload bukti/attachment

### QC (Quality Control)
- Review dan approve/reject tiket dari reporter
- Menambahkan komentar QC
- Melihat semua tiket yang perlu di-review

### PM (Project Manager)
- Final approval/rejection tiket yang sudah disetujui QC
- Menambahkan komentar PM
- Akses ke laporan dan analytics

## Setup

1. **Install Dependencies**
```bash
npm install next-auth@beta @auth/prisma-adapter bcryptjs zod lucide-react
npm install -D @types/bcryptjs
```

2. **Environment Variables**
Buat file `.env.local` berdasarkan `.env.example`:
```bash
cp .env.example .env.local
```

Update `NEXTAUTH_SECRET` dengan random string minimal 32 karakter:
```bash
# Generate secret
openssl rand -base64 32
```

3. **Database Setup**
```bash
# Push schema ke database
npm run db:push

# Seed default users
npm run db:seed
```

4. **Default Users**
Setelah seeding, gunakan kredensial berikut untuk testing:
- **Admin**: admin@wika.co.id / admin123
- **QC**: qc@wika.co.id / qc123
- **PM**: pm@wika.co.id / pm123
- **Reporter**: reporter@wika.co.id / reporter123

## File Structure

```
lib/auth/
├── index.ts           # Main NextAuth configuration
├── auth.config.ts     # Auth options & callbacks
└── password.ts        # Password utilities

components/auth/
├── AuthProvider.tsx   # Session provider wrapper
├── LogoutButton.tsx   # Logout component
└── RoleGuard.tsx      # Role-based access component

app/auth/
├── login/page.tsx     # Login page
└── register/page.tsx  # Registration page

app/api/auth/
├── [...nextauth]/route.ts  # NextAuth API route
└── register/route.ts       # Registration API

middleware.ts          # Route protection middleware
types/auth.ts          # TypeScript type definitions
```

## Penggunaan

### Menggunakan Authentication Hook
```tsx
import { useAuth } from '@/hooks/useAuth'

export default function MyComponent() {
  const { user, isAuthenticated, role } = useAuth()
  
  if (!isAuthenticated) {
    return <div>Please login</div>
  }
  
  return <div>Welcome {user?.name}!</div>
}
```

### Role-based Access Control
```tsx
import RoleGuard from '@/components/auth/RoleGuard'

export default function AdminPanel() {
  return (
    <RoleGuard allowedRoles={['ADMIN']}>
      <div>Admin only content</div>
    </RoleGuard>
  )
}
```

### Server-side Authentication
```tsx
import { auth } from '@/lib/auth'

export default async function ServerComponent() {
  const session = await auth()
  
  if (!session) {
    redirect('/auth/login')
  }
  
  return <div>Protected content</div>
}
```

## API Routes Protection

```tsx
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Check role if needed
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  // Protected logic here
}
```

## Testing

1. **Jalankan aplikasi**
```bash
npm run dev
```

2. **Test Authentication Flow**
   - Buka http://localhost:3000
   - Coba login dengan kredensial default
   - Test role-based access di dashboard
   - Test logout functionality

3. **Test Registration**
   - Buka /auth/register
   - Daftar user baru dengan role berbeda
   - Verify di database

## Security Features

- ✅ Password hashing dengan bcrypt (cost: 12)
- ✅ CSRF protection via NextAuth.js
- ✅ Secure JWT tokens
- ✅ Role-based authorization
- ✅ Protected API routes
- ✅ Middleware route protection
- ✅ Input validation dengan Zod

## Troubleshooting

### Error: "NEXTAUTH_SECRET is missing"
Pastikan environment variable `NEXTAUTH_SECRET` sudah diset dengan string minimal 32 karakter.

### Error: "Database connection failed"
Pastikan `DATABASE_URL` benar dan database MySQL sudah running.

### Error: "Invalid credentials"
Pastikan email dan password benar. Reset dengan seeding ulang jika perlu.

### Session tidak persist
Pastikan `NEXTAUTH_URL` sesuai dengan URL aplikasi yang running.
