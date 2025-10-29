# HashNHedge Mining Client v2.0 - PowerShell Script
# Windows PowerShell Installation & Execution Script

param(
    [Parameter(Mandatory=$false)]
    [Alias("w")]
    [string]$Wallet,

    [Parameter(Mandatory=$false)]
    [Alias("p")]
    [string]$Pool = "https://hashnhedge-pool.onrender.com",

    [Parameter(Mandatory=$false)]
    [Alias("n")]
    [string]$Worker = $env:COMPUTERNAME,

    [Parameter(Mandatory=$false)]
    [switch]$Help
)

# Display banner
Write-Host @"

╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║          HashNHedge Mining Client v2.0                   ║
║          PowerShell Installation Script                   ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

"@ -ForegroundColor Magenta

# Show help if requested
if ($Help) {
    Write-Host "Usage: .\hnh-miner-windows.ps1 -Wallet YOUR_WALLET_ADDRESS [OPTIONS]" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Options:" -ForegroundColor White
    Write-Host "  -Wallet, -w <address>    Your Solana wallet address (REQUIRED)" -ForegroundColor Gray
    Write-Host "  -Pool, -p <url>          Pool URL (default: https://hashnhedge-pool.onrender.com)" -ForegroundColor Gray
    Write-Host "  -Worker, -n <name>       Worker name (default: computer name)" -ForegroundColor Gray
    Write-Host "  -Help                    Show this help message" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Example:" -ForegroundColor Yellow
    Write-Host "  .\hnh-miner-windows.ps1 -Wallet 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU" -ForegroundColor Gray
    Write-Host ""
    exit 0
}

# Check if wallet is provided
if (-not $Wallet) {
    Write-Host "❌ Error: Wallet address is required!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Usage: .\hnh-miner-windows.ps1 -Wallet YOUR_WALLET_ADDRESS" -ForegroundColor Cyan
    Write-Host "Run with -Help for more options" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

# Check if Node.js is installed
try {
    $nodeVersion = node -v
    Write-Host "✅ Node.js $nodeVersion detected" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Node.js from: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "After installation, restart this script." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Create HashNHedge directory
$hnhDir = Join-Path $env:USERPROFILE ".hashnhedge"
if (-not (Test-Path $hnhDir)) {
    New-Item -ItemType Directory -Path $hnhDir | Out-Null
}

# Download miner if not present
$minerFile = Join-Path $hnhDir "hashnhedge-miner.js"
if (-not (Test-Path $minerFile)) {
    Write-Host "📥 Downloading HashNHedge miner..." -ForegroundColor Yellow

    try {
        Invoke-WebRequest -Uri "https://raw.githubusercontent.com/knol3j/HNH/main/HNH-pool/hashnhedge-miner.js" -OutFile $minerFile
        Write-Host "✅ Miner downloaded successfully" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to download miner: $_" -ForegroundColor Red
        exit 1
    }
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
Push-Location $hnhDir
if (-not (Test-Path "node_modules")) {
    '{"name": "hashnhedge-miner", "version": "1.0.0"}' | Out-File -FilePath "package.json" -Encoding utf8
    npm install axios | Out-Null
    Write-Host "✅ Dependencies installed" -ForegroundColor Green
}

# Display configuration
Write-Host ""
Write-Host "🚀 Starting HashNHedge Miner" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "💳 Wallet: $Wallet" -ForegroundColor Blue
Write-Host "🏊 Pool: $Pool" -ForegroundColor Blue
Write-Host "🖥️  Worker: $Worker" -ForegroundColor Blue
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Start mining
node $minerFile --wallet $Wallet --pool $Pool --worker $Worker

Pop-Location
