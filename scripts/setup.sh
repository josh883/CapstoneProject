set -euo pipefail
[ -f "server/requirements.txt" ] || { echo "Run from repo root"; exit 1; }

# --- Node.js version check ---
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

# --- 1b. Environment file ---
if [ -f ".env" ]; then
  echo "Found existing .env"
elif [ -f ".env.example" ]; then
  cp .env.example .env
  echo "Created .env from .env.example (update DATABASE_URL if needed)"
else
  echo "⚠️ No .env or .env.example found. Create .env with DATABASE_URL before running the API."
fi

# --- 2. Python Virtual Environment ---
PYTHON_BIN=""
if command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="python3"
elif command -v python >/dev/null 2>&1; then
  PYTHON_BIN="python"
else
  echo "❌ ERROR: Python 3 not found, install Python 3.8+ and retry"
  exit 1
fi

VENV_DIR="capstone_venv"
if [ ! -d "$VENV_DIR" ]; then
  echo "creating Python virtual environment ($VENV_DIR)"
  "$PYTHON_BIN" -m venv "$VENV_DIR"
else
  echo "reusing existing virtual environment ($VENV_DIR)"
fi

VENV_PY="./$VENV_DIR/bin/python"
VENV_PIP="./$VENV_DIR/bin/pip"

if [ ! -x "$VENV_PIP" ]; then
  echo "❌ ERROR: pip not found in virtualenv ($VENV_PIP)."
  exit 1
fi

"$VENV_PY" -m pip install --upgrade pip
echo "Installing Python reqs"
"$VENV_PIP" install -r server/requirements.txt

# --- install root node deps ---
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

npm install lucide-react 

npm install @iconify/react


cd ..

echo "✅ backend and frontend setup complete"
