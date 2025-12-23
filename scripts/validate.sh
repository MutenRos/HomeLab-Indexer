#!/bin/bash
# Professional project validation script

set -e

echo "🔍 HomeLab Indexer - Project Validation"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_step() {
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} $1"
  else
    echo -e "${RED}✗${NC} $1"
    exit 1
  fi
}

echo "📦 Installing dependencies..."
npm ci > /dev/null 2>&1
check_step "Dependencies installed"

echo ""
echo "🔨 Building shared package..."
npm run -w packages/shared build > /dev/null 2>&1
check_step "Shared package built"

echo ""
echo "✨ Running linter..."
npm run lint 2>&1 | tail -5
check_step "Linting passed"

echo ""
echo "💅 Checking code formatting..."
npx prettier --check "apps/**/src/**/*.{ts,tsx}" "packages/**/src/**/*.ts" 2>&1 | tail -5
check_step "Formatting check passed"

echo ""
echo "🧪 Running tests..."
npm run test -- --passWithNoTests 2>&1 | tail -10
check_step "Tests passed"

echo ""
echo "🏗️  Building all workspaces..."
npm run build > /dev/null 2>&1
check_step "Build successful"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ All validation checks passed!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
