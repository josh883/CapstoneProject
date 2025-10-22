# CapstoneProject
Senior project

## Dev setup (cross-platform)

Requirements (install once)
- Node.js 18+ (Node 20 recommended). Use Volta, nvm, or nvm-windows.
- Python 3.8+

From project root:

0) nvm use || nvm install 20 

1) Install deps and create Python venv (one command):
   npm run setup

2) Start dev servers (frontend + backend):
   npm run dev

Notes:
- setup uses capstone_venv for Python packages and installs server/requirements.txt
- The web front end lives in ./web
- If Node is missing, install Node 20 and re-run setup


# Test Login
-Username: testuser
-Email: test@example.com
-Password: 1234