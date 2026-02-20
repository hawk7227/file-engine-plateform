#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════════╗
# ║  VERCEL-PROOF™ Setup Script                                   ║
# ║  One command to install the entire verification system         ║
# ╚══════════════════════════════════════════════════════════════════╝
#
# USAGE: ./vercel-proof-setup.sh
#

set -euo pipefail

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Installing VERCEL-PROOF™ Verification System              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# 1. Make verification script executable
chmod +x vercel-proof.sh
echo "✓ Made vercel-proof.sh executable"

# 2. Install Git pre-push hook
if [[ -d ".git" ]]; then
  cp pre-push .git/hooks/pre-push 2>/dev/null || cp scripts/pre-push .git/hooks/pre-push 2>/dev/null || true
  chmod +x .git/hooks/pre-push
  echo "✓ Installed Git pre-push hook"
else
  echo "⚠ Not a Git repository — skipping hook installation"
fi

# 3. Add npm script
if [[ -f "package.json" ]]; then
  if ! grep -q '"verify"' package.json; then
    # Use node to safely add the script
    node -e "
      const pkg = require('./package.json');
      if (!pkg.scripts) pkg.scripts = {};
      pkg.scripts.verify = 'bash vercel-proof.sh';
      pkg.scripts['verify:fix'] = 'bash vercel-proof.sh --fix';
      pkg.scripts['prebuild'] = 'bash vercel-proof.sh || true';
      require('fs').writeFileSync('./package.json', JSON.stringify(pkg, null, 2) + '\n');
    " 2>/dev/null && echo "✓ Added npm scripts: 'verify', 'verify:fix', 'prebuild'" || echo "⚠ Could not add npm scripts — add manually"
  else
    echo "✓ npm 'verify' script already exists"
  fi
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ✓ INSTALLATION COMPLETE                                   ║"
echo "║                                                             ║"
echo "║  Run verification:                                          ║"
echo "║    ./vercel-proof.sh              Full scan                 ║"
echo "║    ./vercel-proof.sh --fix        Auto-fix issues           ║"
echo "║    ./vercel-proof.sh --file X     Scan one file             ║"
echo "║    npm run verify                 Via npm                   ║"
echo "║                                                             ║"
echo "║  Verification now runs automatically before every push.     ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
