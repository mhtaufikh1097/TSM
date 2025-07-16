#!/bin/bash

echo "🚀 Setting up Incident Ticket System..."

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "📄 Creating .env.local from example..."
    cp .env.example .env.local
    echo "⚠️  Please update DATABASE_URL and NEXTAUTH_SECRET in .env.local"
else
    echo "✅ .env.local already exists"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npm run db:generate

# Push database schema
echo "🗄️  Setting up database schema..."
npm run db:push

# Seed the database
echo "🌱 Seeding database with default users..."
npm run db:seed

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Update your DATABASE_URL in .env.local"
echo "2. Generate a secure NEXTAUTH_SECRET:"
echo "   openssl rand -base64 32"
echo "3. Start the development server:"
echo "   npm run dev"
echo ""
echo "👥 Default users created:"
echo "   Admin: admin@wika.co.id / admin123"
echo "   QC: qc@wika.co.id / qc123"
echo "   PM: pm@wika.co.id / pm123"
echo "   Reporter: reporter@wika.co.id / reporter123"
echo ""
echo "🌐 Open http://localhost:3000 to get started!"
