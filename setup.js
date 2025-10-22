// setup.js
// Cross-platform setup: node + python venv + npm installs for root and web
// Usage: node setup.js

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: false, ...opts });
  if (r.error) {
    console.error("Failed to run:", cmd, args, r.error);
    process.exit(1);
  }
  if (r.status !== 0) {
    console.error(`Command exited with ${r.status}: ${cmd} ${args.join(" ")}`);
    process.exit(r.status);
  }
}

function which(program) {
  const p = spawnSync(process.platform === "win32" ? "where" : "which", [program], { encoding: "utf8" });
  return p.status === 0 ? p.stdout.trim().split(/\r?\n/)[0] : null;
}

function pipPathFromVenv(venvDir) {
  if (process.platform === "win32") {
    return path.join(venvDir, "Scripts", "pip.exe");
  } else {
    return path.join(venvDir, "bin", "pip");
  }
}

function pythonPathFromVenv(venvDir) {
  if (process.platform === "win32") {
    return path.join(venvDir, "Scripts", "python.exe");
  } else {
    return path.join(venvDir, "bin", "python");
  }
}

function exist(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch (e) {
    return false;
  }
}

// 0. Basic checks
const node = which("node");
if (!node) {
  console.error("Node.js not found. Install Node 18+ or use Volta/nvm.");
  process.exit(1);
}

const nodeVersion = spawnSync("node", ["-v"], { encoding: "utf8" }).stdout.trim();
const major = parseInt(nodeVersion.replace(/^v/, "").split(".")[0], 10);
if (isNaN(major) || major < 18) {
  console.error(`Node.js ${nodeVersion} detected. Please use Node 18+ (recommended 20).`);
  process.exit(1);
}

const python = which("python") || which("python3");
if (!python) {
  console.error("Python not found. Install Python 3.8+ and ensure 'python' or 'python3' is on PATH.");
  process.exit(1);
}

// 1. Create python venv
const VENV_DIR = "capstone_venv";
if (!exist(VENV_DIR)) {
  console.log("Creating python venv:", VENV_DIR);
  run(python, ["-m", "venv", VENV_DIR]);
} else {
  console.log("Python venv exists:", VENV_DIR);
}

// 2. Upgrade pip and install python requirements
const pipPath = pipPathFromVenv(VENV_DIR);
if (!exist(pipPath)) {
  console.error("Pip not found inside venv at", pipPath);
  process.exit(1);
}
console.log("Upgrading pip inside venv");
run(pipPath, ["install", "--upgrade", "pip"]);

const requirements = path.join("server", "requirements.txt");
if (!exist(requirements)) {
  console.error("Missing server/requirements.txt. Run from repo root.");
  process.exit(1);
}
console.log("Installing python requirements");
run(pipPath, ["install", "-r", requirements]);

// 3. Root npm install (prefer npm ci if lockfile)
const rootLock = exist("package-lock.json");
console.log(rootLock ? "Running npm ci (root)" : "Running npm install (root)");
if (rootLock) run("npm", ["ci"]);
else run("npm", ["install"]);

// 4. Web/Next install
const webDir = path.join("web");
if (!exist(webDir)) {
  console.error("Missing web folder. Expected ./web");
  process.exit(1);
}
const webLock = exist(path.join(webDir, "package-lock.json"));
console.log(webLock ? "Running npm ci (web)" : "Running npm install (web)");
run("npm", ["--prefix", "web", webLock ? "ci" : "install"]);

// 5. Success
console.log("");
console.log("✅ Setup complete.");
console.log("To start both servers: npm run dev");
console.log("Backend venv activation examples:");
if (process.platform === "win32") {
  console.log(`  Powershell: .\\${VENV_DIR}\\Scripts\\Activate.ps1`);
  console.log(`  CMD: ${VENV_DIR}\\Scripts\\activate.bat`);
} else {
  console.log(`  source ${VENV_DIR}/bin/activate`);
}
