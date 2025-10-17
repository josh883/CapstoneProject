set -euo pipefail
[ -f "server/requirements.txt" ] || { echo "Run from repo root"; exit 1; }

# --- 1. Node.js Version Check ---
MIN_MAJOR_VERSION=18
CURRENT_NODE_VERSION=$(node -v | sed 's/v//g' | awk -F'.' '{print $1}')

if (( CURRENT_NODE_VERSION < MIN_MAJOR_VERSION )); then
  echo "❌ ERROR: Node.js version too old for Next.js."
  echo "Your version: v$CURRENT_NODE_VERSION.x.x"
  echo "Minimum required: v$MIN_MAJOR_VERSION.x.x or higher."
  echo "If you use NVM, run: 'nvm install 20 && nvm use 20'"
  exit 1
else
  echo "✅ Node.js v$CURRENT_NODE_VERSION.x.x detected."
fi

# --- 2. Python Virtual Environment ---
python3 -m venv capstone_venv
./capstone_venv/bin/python -m pip install --upgrade pip
./capstone_venv/bin/pip install -r server/requirements.txt

# --- 3. Install Root Node Deps ---
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

# --- 4. Install Next.js Deps ---
cd web
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi
cd ..

echo "✅ Backend and Frontend setup complete."
