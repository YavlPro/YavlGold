#!/bin/bash
# YavlGold - Quick Deploy Script
# Usage: ./deploy.sh [platform]
# Platforms: vercel, netlify, github

set -e

echo "🚀 YavlGold Deployment Script"
echo "=============================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Platform selection
PLATFORM=${1:-"vercel"}

echo -e "${BLUE}Selected platform: ${PLATFORM}${NC}"
echo ""

# Pre-deployment checks
echo "📋 Running pre-deployment checks..."

# Check if git repo is clean
if [[ -n $(git status -s) ]]; then
    echo -e "${RED}⚠️  Warning: You have uncommitted changes${NC}"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" != "main" ]]; then
    echo -e "${RED}⚠️  Warning: Not on main branch (current: $CURRENT_BRANCH)${NC}"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "${GREEN}✅ Pre-checks passed${NC}"
echo ""

# Deployment based on platform
case $PLATFORM in
    vercel)
        echo "🔷 Deploying to Vercel..."
        if ! command -v vercel &> /dev/null; then
            echo -e "${RED}❌ Vercel CLI not found. Install with: npm i -g vercel${NC}"
            exit 1
        fi
        vercel --prod
        ;;
    
    netlify)
        echo "🔶 Deploying to Netlify..."
        if ! command -v netlify &> /dev/null; then
            echo -e "${RED}❌ Netlify CLI not found. Install with: npm i -g netlify-cli${NC}"
            exit 1
        fi
        netlify deploy --prod
        ;;
    
    github)
        echo "🐙 Deploying to GitHub Pages..."
        git push origin main
        echo -e "${GREEN}✅ Pushed to main. GitHub Pages will auto-deploy${NC}"
        echo "Monitor at: https://github.com/YavlPro/gold/actions"
        ;;
    
    *)
        echo -e "${RED}❌ Unknown platform: $PLATFORM${NC}"
        echo "Available platforms: vercel, netlify, github"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "🌐 Your site should be live at: https://yavlgold.com"
echo ""
