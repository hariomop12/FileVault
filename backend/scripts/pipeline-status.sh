#!/bin/bash

# FileVault CI/CD Pipeline Status Monitor
# This script provides a quick overview of the pipeline status

echo "🚀 FileVault CI/CD Pipeline Status"
echo "=================================="
echo ""

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Not in a git repository"
    exit 1
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "📋 Current Branch: $CURRENT_BRANCH"

# Get latest commit
LATEST_COMMIT=$(git rev-parse --short HEAD)
echo "📝 Latest Commit: $LATEST_COMMIT"

# Get commit message
COMMIT_MSG=$(git log -1 --pretty=format:"%s")
echo "💬 Commit Message: $COMMIT_MSG"

echo ""
echo "🔍 Pipeline Components Status:"
echo "------------------------------"

# Check if CI/CD files exist
echo "📄 Configuration Files:"
if [ -f ".github/workflows/docker-build.yml" ]; then
    echo "   ✅ GitHub Actions workflow"
else
    echo "   ❌ GitHub Actions workflow missing"
fi

if [ -f "Dockerfile.prod" ]; then
    echo "   ✅ Production Dockerfile"
else
    echo "   ❌ Production Dockerfile missing"
fi

if [ -f ".dockerignore" ]; then
    echo "   ✅ Docker ignore file"
else
    echo "   ❌ Docker ignore file missing"
fi

if [ -f ".eslintrc.js" ]; then
    echo "   ✅ ESLint configuration"
else
    echo "   ❌ ESLint configuration missing"
fi

echo ""
echo "🧪 Code Quality Checks:"

# Check for test files
TEST_FILES=$(find . -name "*.test.js" -not -path "./node_modules/*" | wc -l)
echo "   📊 Test files found: $TEST_FILES"

# Check for linting issues (basic check)
JS_FILES=$(find . -name "*.js" -not -path "./node_modules/*" -not -path "./frontend/*" | wc -l)
echo "   📝 JavaScript files: $JS_FILES"

# Check package.json scripts
if grep -q '"test"' package.json; then
    echo "   ✅ Test script configured"
else
    echo "   ❌ Test script missing"
fi

if grep -q '"lint"' package.json; then
    echo "   ✅ Lint script configured"
else
    echo "   ❌ Lint script missing"
fi

echo ""
echo "🐳 Docker Status:"

# Check if Docker is available
if command -v docker &> /dev/null; then
    echo "   ✅ Docker available"
    
    # Try to build the image (dry run)
    if docker build -f Dockerfile.prod -t filevault:test --dry-run . &> /dev/null; then
        echo "   ✅ Dockerfile syntax valid"
    else
        echo "   ⚠️  Dockerfile may have issues"
    fi
else
    echo "   ❌ Docker not available"
fi

echo ""
echo "🔐 Security Checks:"

# Check for .env files in git
if git ls-files | grep -q "\.env"; then
    echo "   ⚠️  .env files tracked in git (security risk)"
else
    echo "   ✅ No .env files in git"
fi

# Check for secrets in code (basic check)
if grep -r "password\|secret\|key" --include="*.js" . | grep -v node_modules | grep -v ".git" | head -1 > /dev/null; then
    echo "   ⚠️  Potential secrets found in code"
else
    echo "   ✅ No obvious secrets in code"
fi

echo ""
echo "📈 Recommendations:"
echo "-------------------"

# GitHub Actions recommendations
if [ ! -f ".github/workflows/docker-build.yml" ]; then
    echo "   • Set up GitHub Actions workflow"
fi

# Dependencies recommendations
if [ -f "package.json" ]; then
    OUTDATED=$(npm outdated 2>/dev/null | wc -l)
    if [ $OUTDATED -gt 1 ]; then
        echo "   • Update outdated dependencies"
    fi
fi

# Security recommendations
echo "   • Run 'npm audit' regularly"
echo "   • Keep Docker base images updated"
echo "   • Monitor vulnerability reports in GitHub Security tab"

echo ""
echo "🚀 Quick Commands:"
echo "------------------"
echo "   • Test locally: npm test"
echo "   • Lint code: npm run lint"
echo "   • Build Docker: docker build -f Dockerfile.prod -t filevault ."
echo "   • Security audit: npm audit"

echo ""
echo "📊 Pipeline URL:"
echo "----------------"
REPO_URL=$(git remote get-url origin | sed 's/\.git$//')
if [[ $REPO_URL == *"github.com"* ]]; then
    GITHUB_URL=${REPO_URL/git@github.com:/https://github.com/}
    echo "   🔗 $GITHUB_URL/actions"
else
    echo "   ℹ️  Not a GitHub repository"
fi

echo ""
echo "✨ Pipeline Status: Ready for CI/CD!"
echo "====================================="