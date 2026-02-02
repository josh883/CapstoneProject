# Capstone Project PennysWorthe

> **A Next-Gen Financial Analytics Dashboard powered by Machine Learning.**

![Pennysworthe Dashboard](Docs/dashboard-main.png)

## 📖 Project Overview

Pennysworthe is a full-stack financial application designed to democratize institutional-grade stock analysis. It moves beyond simple price tracking by integrating **AI-driven price forecasting**, **algorithmic risk assessment**, and **sentiment analysis** directly into the user interface.

Unlike traditional dashboards that simply display raw data, Pennysworthe interprets it—giving users actionable insights on market volatility, predicted trends, and moving averages through an intuitive, modern interface.

The project began as a concept to aid both experienced and inexperienced investors, evolving through rigorous Agile sprints into a comprehensive tool.

---

## 👥 Meet the Team

Throughout the development process, the team maintained strong cohesion, with each member owning specific architectural domains.

* **JD (Networking & Infrastructure):** Managed networking, hosting, and ensuring the application ran across multiple machines. He led the debugging of networking issues and implemented the portfolio page and settings architecture.
* **Luis (Frontend Lead):** Built the bulk of the web application's frontend. He managed the migration to Next.js, implemented the stock graphs, and integrated the News API for the right-hand display.
* **Erick (AI & Machine Learning):** Focused on the application of AI, specifically implementing the LSTM models and porting them to the app. He also developed the "Risk Tolerance" and "Accuracy" fidgets/widgets.
* **Josh (Algorithms & Backend):** Developed the Bullish/Bearish algorithms and Sentiment Calculation. He assisted heavily with Windows compatibility debugging and initial HTML prototyping.
* **Clara (Algorithms & User Research):** Conducted user and professor interviews to determine high-value features. She implemented the Golden Cross and Death Cross calculation algorithms.

---

## 🚀 Key Features

### 🧠 AI-Powered Price Prediction
Utilization of a **Long Short-Term Memory (LSTM) Recurrent Neural Network (RNN)** to analyze historical market data.
* **Automated Retraining:** The model automatically retrains itself on new data every 24 hours via a background scheduler.
* **Visual Forecasting:** Predictions are plotted directly onto the price chart, allowing users to visually compare historical trends vs. AI expectations.
* **Accuracy Fidgets:** Specific UI elements dedicated to showing the model's confidence and past accuracy.

### 📊 Algorithmic Risk & Strategy
A suite of 6 custom algorithms integrated directly into the stock search page.
* **Market Sentiment:** Algorithms to detect if a stock is currently Bearish or Bullish.
* **Crossover Detection:** Automatic identification of "Golden Cross" and "Death Cross" events to signal strong trend reversals.
* **Risk Tolerance:** A dynamic "fidget" that gauges the risk level of an asset based on volatility and Beta.

### 🖥️ Interactive Market Data
* **Real-time Charts:** Interactive, responsive line charts powered by Chart.js.
* **News Integration:** A dedicated sidebar displaying news sources via API to correlate current events with price action.
* **Smart Watchlists:** Users can curate personalized lists of stocks to track favorite assets.
* **Portfolio Management:** A dedicated page for users to input and track their personal trading information.

---

## ⚙️ Modular Algorithmic Tuning

One of Pennysworthe's standout features is the ability for users to "look under the hood." The application allows users to toggle specific analysis modules and fine-tune the sensitivity of the risk algorithms.

![Settings and Customization](Docs/settings-page.png)

* **Custom Sensitivity:** Users can adjust risk thresholds (e.g., Volatility sensitivity) to match their personal trading style.
* **Modular Architecture:** Each analysis block (Golden Cross, Trend Sentiment, AI Prediction) can be enabled or disabled independently.

---

## 📅 Development Journey

The project evolved through a series of productive sprints:
1.  **Inception:** Started with a basic HTML frontend and Python API connections while conducting user research with professors.
2.  **Overhaul:** Transitioned the frontend to Next.js for better scalability and implemented secure database logins.
3.  **Expansion:** Debugged critical networking issues and Windows-specific bugs while laying the groundwork for complex algorithms like the Golden Cross.
4.  **Feature Richness:** The most productive sprint; added the Portfolio page, Watchlists, and the News API integration.
5.  **Final Polish:** Integrated all 6 algorithms, the AI accuracy widgets, and the settings page for a complete user experience.

---

## 🏗️ Tech Stack

**Frontend:**
* **Framework:** Next.js 15
* **Styling:** Tailwind CSS & Custom CSS Modules
* **Visualization:** Chart.js, Custom SVG Components

**Backend:**
* **API:** Python (FastAPI)
* **Database:** PostgreSQL
* **Machine Learning:** TensorFlow (Keras), Scikit-Learn, Pandas, NumPy
* **Scheduling:** APScheduler (for automated model training)

---

## 🧩 Architecture

The application uses a decoupled architecture for scalability and performance:
1.  The **Next.js** frontend serves as a responsive client, handling UI state and visualization.
2.  The **FastAPI** backend handles complex data processing, ML inference, and database interactions.
3.  A **PostgreSQL** database persists user data and watchlists.
4.  **Background Workers** manage the periodic retraining of ML models without blocking the main API threads.

---

## 🔮 Challenges & Future Roadmap

**Challenges Overcome:**
* **Cross-Platform Compatibility:** Significant effort went into fixing bugs for Windows users to ensure consistent behavior across operating systems.
* **Networking:** Configuring the application to run seamlessly on multiple machines and host environments required extensive debugging.
* **API Limitations:** The current biggest hurdle is the request limits on our financial data provider, which we optimize by caching data where possible.

**Future Plans:**
* **Standalone Platform:** We plan to migrate this project to a fully hosted, independent website.
* **Frontend Expansion:** Continued overhaul and expansion of the UI to include more data visualization tabs.
* **Monetization:** Exploring the addition of advertisements to sustain server costs and API tiers.

---

## 🛠️ Technical Setup & Installation

### Prerequisites
Install these once:
- **Node.js 18+ (Node 20 recommended)** – macOS/Linux: download the installer or 'nvm use|install 20'; Windows: installer at `https://nodejs.org/en/download/prebuilt-installer` (npm ships with Node)
- **Python 3.8+** – macOS already has Python 3; Windows: install from `https://www.python.org/downloads/`
- **PostgreSQL 13+** – macOS: `brew install postgresql@14` or Postgres.app, Windows: use EnterpriseDB installer (includes pgAdmin and `psql`)

After installing Postgres, make sure you can run `psql`:
- macOS/Linux: open Terminal and run `psql --version`.
- Windows: launch “SQL Shell (psql)” from the start menu, or add `C:\Program Files\PostgreSQL\<version>\bin` to PATH

### Getting Started

1. **Install dependencies and create the Python venv**
   - Cross platform (requires Node):  
     ```bash
     npm run setup
     ```
   - Windows PowerShell alternative (Node optional):  
     ```powershell
     pwsh -ExecutionPolicy Bypass -File scripts/setup.ps1
     ```

   each script checks the runtime versions, creates or uses `capstone_venv`, installs the Python reqs from `server/requirements.txt`, installs npm packages (root and `web/`), and copies `.env.example` to `.env` if needed

2. **Create a local Postgres user & database (run once)**
   - macOS/Linux Terminal:
     ```bash
     psql -U postgres -h localhost postgres
     ```
   - Windows:
     - Option A: open “SQL Shell (psql)” and accept defaults until asked for the database (enter `postgres`) and username (`postgres`).
     - Option B: from PowerShell:
       ```powershell
       & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost postgres
       ```

   Inside the `psql` prompt, create your app user and database:
   ```sql
   CREATE ROLE capstone_user WITH LOGIN PASSWORD 'choose-a-strong-password';
   CREATE DATABASE capstone OWNER capstone_user;
   GRANT ALL PRIVILEGES ON DATABASE capstone TO capstone_user;
   ALTER ROLE capstone_user SET search_path TO public;
   \q
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
