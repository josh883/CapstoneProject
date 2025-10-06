set -euo pipefail
[ -f "server/requirements.txt" ] || { echo "Run from repo root"; exit 1; }

python3 -m venv capstone_venv
./capstone_venv/bin/python -m pip install --upgrade pip
./capstone_venv/bin/pip install -r server/requirements.txt

# install root Node dev deps
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

# install Next.js deps
cd web
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi
echo "✅ Setup complete."
