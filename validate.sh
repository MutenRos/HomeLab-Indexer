#!/bin/bash

# HomeLab Indexer - Validation Checklist
# Run this to validate the installation

echo "🔍 HomeLab Indexer Installation Validator"
echo "=========================================="
echo ""

# Check Node.js
echo "1️⃣ Checking Node.js..."
if command -v node &> /dev/null; then
  echo "   ✅ Node.js installed: $(node --version)"
else
  echo "   ❌ Node.js not found"
  exit 1
fi

# Check npm
echo "2️⃣ Checking npm..."
if command -v npm &> /dev/null; then
  echo "   ✅ npm installed: $(npm --version)"
else
  echo "   ❌ npm not found"
  exit 1
fi

# Check Docker (optional)
echo "3️⃣ Checking Docker..."
if command -v docker &> /dev/null; then
  echo "   ✅ Docker installed: $(docker --version)"
else
  echo "   ⚠️  Docker not found (optional, needed for docker-compose)"
fi

# Check project structure
echo "4️⃣ Checking project structure..."
required_dirs=(
  "apps/api"
  "apps/ui"
  "apps/scanner"
  "packages/shared"
  "infra/docker"
  "infra/migrations"
  "docs"
)

all_exist=true
for dir in "${required_dirs[@]}"; do
  if [ -d "$dir" ]; then
    echo "   ✅ $dir/"
  else
    echo "   ❌ Missing: $dir/"
    all_exist=false
  fi
done

if [ "$all_exist" = false ]; then
  exit 1
fi

# Check key files
echo "5️⃣ Checking key files..."
required_files=(
  ".env.example"
  "docker-compose.yml"
  "package.json"
  "README.md"
  "apps/api/src/index.ts"
  "apps/api/src/db/database.ts"
  "apps/ui/src/App.tsx"
  "infra/migrations/001-init.sql"
)

all_exist=true
for file in "${required_files[@]}"; do
  if [ -f "$file" ]; then
    echo "   ✅ $file"
  else
    echo "   ❌ Missing: $file"
    all_exist=false
  fi
done

if [ "$all_exist" = false ]; then
  exit 1
fi

# Check dependencies (if node_modules exists)
echo "6️⃣ Checking dependencies..."
if [ -d "node_modules" ]; then
  echo "   ✅ Dependencies installed"
else
  echo "   ⚠️  Dependencies not installed. Run 'npm install'"
fi

# Check database
echo "7️⃣ Checking database..."
if [ -f "data/indexer.db" ]; then
  echo "   ✅ Database exists"
else
  echo "   ⚠️  Database not created. Run 'npm run db:migrate'"
fi

echo ""
echo "=========================================="
echo "✅ All validations passed!"
echo ""
echo "Next steps:"
echo "  1. npm install           (if not done)"
echo "  2. cp .env.example .env"
echo "  3. npm run db:migrate    (if needed)"
echo "  4. docker-compose up -d  (or npm run dev)"
echo "  5. Open http://localhost:5173"
echo ""
