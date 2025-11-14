# CapstoneProject
Senior project

## Prerequisites
Install these once:
- **Node.js 18+ (Node 20 recommended)** – macOS/Linux: download the installer or 'nvm use|install 20'; Windows: installer at `https://nodejs.org/en/download/prebuilt-installer` (npm ships with Node)
- **Python 3.8+** – macOS already has Python 3; Windows: install from `https://www.python.org/downloads/`
- **PostgreSQL 13+** – macOS: `brew install postgresql@14` or Postgres.app, Windows: use EnterpriseDB installer (includes pgAdmin and `psql`)

After installing Postgres, make sure you can run `psql`:
- macOS/Linux: open Terminal and run `psql --version`.
- Windows: launch “SQL Shell (psql)” from the start menu, or add `C:\Program Files\PostgreSQL\<version>\bin` to PATH

## Getting Started
1. **Install dependencies and create the Python venv**
   - Cross platform (requires Node):  
     ```
     npm run setup
     ```
   - Windows PowerShell alternative (Node optional):  
     ```
     pwsh -ExecutionPolicy Bypass -File scripts/setup.ps1
     ```

   each script checks the runtime versions, creates or uses `capstone_venv`, installs the Python reqs from `server/requirements.txt`, installs npm packages (root and `web/`), and copies `.env.example` to `.env` if needed

2. **Create a local Postgres user & database (run once)**
   - macOS/Linux Terminal:
     ```
     psql -U postgres -h localhost postgres
     ```
   - Windows:
     - Option A: open “SQL Shell (psql)” and accept defaults until asked for the database (enter `postgres`) and username (`postgres`).
     - Option B: from PowerShell:
       ```
       & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost postgres
       ```

   Inside the `psql` prompt, create your app user and database:
   ```
   CREATE ROLE capstone_user WITH LOGIN PASSWORD 'choose-a-strong-password';
   CREATE DATABASE capstone OWNER capstone_user;
   GRANT ALL PRIVILEGES ON DATABASE capstone TO capstone_user;
   ALTER ROLE capstone_user SET search_path TO public;
   \q
   ```
   *(use whatever for username and password)*

3. **setup the env file**
   - open `.env` (created during step 1) and set:
     ```
     DATABASE_URL=postgresql://capstone_user:choose-a-strong-password@localhost:5432/capstone
     ```
     *(with your own user and pass obviously)*
   - if you access the site from your machine’s IP (e.g., `http://192.168.x.y:3000`):
     - macOS/Linux: add to `.env`:
     ```
     FRONTEND_ORIGINS=http://192.168.x.y:3000,http://other-host:3000
     ```
     the backend will merge these into the CORS allowlist

4. **Start the development servers**
   ```
   npm run dev
   ```
   this runs `next dev` for the web app and Uvicorn for the FastAPI backend. open `http://localhost:3000` in your browser

5. **activate the Python venv when working with backend scripts**
   - macOS/Linux: `source capstone_venv/bin/activate`
   - Windows PowerShell: `.\\capstone_venv\\Scripts\\Activate.ps1`

## Troubleshooting
- **`DATABASE_URL environment variable is not set`** – make sure `.env` exists in the repo root (rerun `npm run setup` if needed) and that the server process is restarted after edits
- **`password authentication failed for user`** – confirm the credentials in `.env` match the role/database created in Postgres
- **CORS errors or 400 on preflight (OPTIONS)** – add your current frontend origin to `.env` via `FRONTEND_ORIGINS`, then restart `npm run dev`
- **Port already in use** – stop any processes using `3000` or `8000` (Ctrl+C in the terminal) before running `npm run dev` again
