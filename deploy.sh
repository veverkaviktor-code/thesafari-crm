#!/bin/bash
# Deploy CRM to VPS — safe versioned deployment
# Usage: ./deploy.sh [--skip-build]

set -e

# --- production confirm gate (added 2026-07-18, security hardening) ---
if [ "${DEPLOY_CONFIRM:-}" != "yes" ]; then
  if [ -t 0 ] || [ -r /dev/tty ]; then
    printf 'Deploy %s to PRODUCTION? Type "yes" to continue: ' "thesafari-crm" > /dev/tty 2>/dev/null || true
    IFS= read -r _ans < /dev/tty 2>/dev/null || _ans=""
  else
    _ans=""
  fi
  if [ "$_ans" != "yes" ]; then
    echo "Deploy aborted: not confirmed (interactive 'yes' or DEPLOY_CONFIRM=yes required)." >&2
    exit 1
  fi
fi
# --- end confirm gate ---

VPS="root@sss06.vas-server.cz"
REMOTE_DIR="/var/www/hq.thesafari.cz"
LOCAL_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== CRM Deploy ==="
echo "Local:  $LOCAL_DIR"
echo "Remote: $VPS:$REMOTE_DIR"
echo ""

# 1. Build frontend (unless --skip-build)
if [[ "$1" != "--skip-build" ]]; then
    echo "→ Building frontend..."
    cd "$LOCAL_DIR" && npm run build
    echo "✓ Build complete"
else
    echo "→ Skipping frontend build"
fi

# 2. Commit any uncommitted changes locally
cd "$LOCAL_DIR"
if [[ -n $(git status --porcelain) ]]; then
    echo ""
    echo "⚠ You have uncommitted changes locally!"
    echo "  Commit them first: git add -A && git commit -m 'your message'"
    exit 1
fi

# 3. Check VPS for uncommitted changes (safety!)
echo ""
echo "→ Checking VPS for uncommitted changes..."
VPS_STATUS=$(ssh $VPS "cd $REMOTE_DIR && git status --porcelain 2>/dev/null" || echo "NO_GIT")
if [[ "$VPS_STATUS" == "NO_GIT" ]]; then
    echo "⚠ VPS has no git repo! Initialize it first."
    exit 1
elif [[ -n "$VPS_STATUS" ]]; then
    echo "⚠ VPS has uncommitted changes!"
    echo "  First commit them on VPS:"
    echo "  ssh $VPS 'cd $REMOTE_DIR && git add -A && git commit -m \"snapshot before deploy\"'"
    exit 1
fi
echo "✓ VPS is clean"

# 4. Rsync files
echo ""
echo "→ Syncing files to VPS..."
rsync -avz --delete \
    --exclude='vendor/' \
    --exclude='node_modules/' \
    --exclude='.env' \
    --exclude='.git/' \
    --exclude='storage/logs/' \
    --exclude='storage/framework/cache/' \
    --exclude='storage/framework/sessions/' \
    --exclude='storage/framework/views/' \
    --exclude='storage/app/public/estimates/' \
    --include='app/***' \
    --include='bootstrap/***' \
    --include='config/***' \
    --include='database/***' \
    --include='resources/***' \
    --include='routes/***' \
    --include='storage/app/email-assets/***' \
    --include='docs/***' \
    --include='CLAUDE.md' \
    --include='CHANGELOG.md' \
    --include='LEARNINGS.md' \
    --include='PROJECT-BRIEF.md' \
    --include='.gitignore' \
    --exclude='*' \
    "$LOCAL_DIR/" "$VPS:$REMOTE_DIR/"

# Sync built assets separately
rsync -avz --delete public/build/ "$VPS:$REMOTE_DIR/public/build/"

# Sync public assets (favicons, logos)
rsync -avz public/favicon.ico public/favicon.png public/logo-*.svg "$VPS:$REMOTE_DIR/public/" 2>/dev/null || true

echo "✓ Files synced"

# 5. Run migrations + rebuild caches + commit on VPS
echo ""
echo "→ Running migrations and rebuilding caches..."
ssh $VPS "cd $REMOTE_DIR && \
    php artisan migrate --force && \
    php artisan config:cache && \
    php artisan route:cache && \
    php artisan view:cache && \
    echo '✓ Caches rebuilt' && \
    git add -A && \
    git commit -m 'deploy: $(date +%Y-%m-%d_%H:%M)' --allow-empty && \
    echo '✓ VPS commit created'"

echo ""
echo "=== Deploy complete ==="
echo "Check: https://hq.thesafari.cz"
