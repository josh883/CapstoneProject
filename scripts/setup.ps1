$ErrorActionPreference = "Stop"

if (-not (Test-Path "server/requirements.txt")) {
    throw "run this script from the repo root (missing server/requirements.txt)."
}

# --- 1. Node.js Version Check ---
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    throw "Node.js not found. Install Node 18+ and ensure 'node' is on PATH"
}

$nodeVersionOutput = & $nodeCmd.Path -v
$nodeVersion = $nodeVersionOutput.Trim() -replace '^v'
if (-not $nodeVersion) {
    throw "unable to determine Node.js version"
}

$nodeMajor = [int]($nodeVersion.Split('.')[0])
if ($nodeMajor -lt 18) {
    throw "Node.js v$nodeVersion detected. Please install Node 18 or newer"
}
Write-Host "Node.js v$nodeMajor.x.x detected."

# --- Environment file ---
if (Test-Path ".env") {
    Write-Host "Found existing .env"
} elseif (Test-Path ".env.example") {
    Copy-Item ".env.example" ".env" -Force
    Write-Host "Created .env from .env.example (update DATABASE_URL as needed)"
} else {
    Write-Warning "No .env or .env.example found. Create .env with DATABASE_URL before running the API."
}

# --- Python venv ---
$pythonCmd = Get-Command python3 -ErrorAction SilentlyContinue
if (-not $pythonCmd) {
    $pythonCmd = Get-Command python -ErrorAction SilentlyContinue
}
if (-not $pythonCmd) {
    throw "Python 3 not found, Install Python 3.8+ and ensure 'python' or 'python3' is on PATH"
}

$venvDir = "capstone_venv"
if (-not (Test-Path $venvDir)) {
    Write-Host "creating Python virtual environment ($venvDir)"
    & $pythonCmd.Path -m venv $venvDir
} else {
    Write-Host "reusing existing virtual environment ($venvDir)"
}

$venvPython = Join-Path $venvDir "Scripts\python.exe"
$venvPip = Join-Path $venvDir "Scripts\pip.exe"

if (-not (Test-Path $venvPip)) {
    throw "pip not found in virtual environment ($venvPip)."
}

& $venvPython -m pip install --upgrade pip
Write-Host "Installing Python requirements"
& $venvPip install -r "server/requirements.txt"

# --- 3. Install Root Node Dependencies ---
if (Test-Path "package-lock.json") {
    npm ci
} else {
    npm install
}

# --- 4. Install Next.js Dependencies ---
Push-Location "web"
try {
    if (Test-Path "package-lock.json") {
        npm ci
    } else {
        npm install
    }
    npm install lucide-react
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "backend and frontend setup complete."
Write-Host "activate the backend virtualenv with:"
Write-Host "  .\capstone_venv\Scripts\Activate.ps1"
Write-Host "then start the dev servers with: npm run dev"
