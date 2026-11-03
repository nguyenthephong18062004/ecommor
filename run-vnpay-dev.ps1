$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $Root 'scripts\project-node.ps1')
$Node = Get-ProjectNode
$Checker = Join-Path $Root 'server\scripts\check-vnpay-connectivity.cjs'
$PublicOrigin = (& $Node $Checker --origin | Out-String).Trim()
if ($LASTEXITCODE -ne 0) { throw 'Invalid VNPay callback configuration.' }
$Callback = [uri]$PublicOrigin
if ($Callback.Host -notmatch '^[a-z0-9-]+\.ngrok-free\.(dev|app)$') {
    throw 'This launcher only manages an existing ngrok-free callback domain.'
}

$Ngrok = (Get-Command ngrok -ErrorAction Stop).Source
$OldHost = $env:VITE_TUNNEL_HOST
$OldMode = $env:VITE_API_MODE
try {
    $env:VITE_TUNNEL_HOST = $Callback.Host
    $env:VITE_API_MODE = 'proxy'
    & (Join-Path $Root 'run-dev.ps1')
} finally {
    $env:VITE_TUNNEL_HOST = $OldHost
    $env:VITE_API_MODE = $OldMode
}

function Get-Tunnels {
    try {
        return (Invoke-RestMethod 'http://127.0.0.1:4040/api/tunnels' -TimeoutSec 2).tunnels
    } catch { return @() }
}

$Tunnels = @(Get-Tunnels)
if ($Tunnels.Count -eq 0) {
    if (Get-Process ngrok -ErrorAction SilentlyContinue) {
        throw 'An ngrok process already exists but its local tunnel API is unavailable. Inspect it manually.'
    }
    # Keep request inspection off: callbacks contain signed payment parameters.
    $Process = Start-Process -FilePath $Ngrok -ArgumentList @(
        'http', 'http://127.0.0.1:5173', "--url=$PublicOrigin", '--inspect=false'
    ) -WindowStyle Hidden -PassThru
    for ($Attempt = 0; $Attempt -lt 240; $Attempt++) {
        Start-Sleep -Milliseconds 500
        $Tunnels = @(Get-Tunnels)
        if ($Tunnels.Count -gt 0) { break }
        if ($Process.HasExited) { throw 'ngrok exited. Check the existing account/domain configuration.' }
    }
    if ($Tunnels.Count -eq 0) {
        throw 'ngrok did not publish an endpoint within the startup timeout. No payment should be started.'
    }
}

$ExpectedTunnel = @($Tunnels | Where-Object {
    $_.public_url -eq $PublicOrigin -and $_.config.addr -eq 'http://127.0.0.1:5173'
})
if ($ExpectedTunnel.Count -ne 1) {
    throw 'No matching tunnel to port 5173. Existing tunnels were not stopped or replaced.'
}

& $Node $Checker
if ($LASTEXITCODE -ne 0) {
    throw 'VNPay callback is not ready. Check Vite allowedHosts, backend and public routing before paying.'
}
Write-Host "VNPay callback routing is ready: $PublicOrigin"
Write-Host 'Keep ngrok, frontend and backend running until Return and IPN have arrived.'
Write-Host 'This check does not verify merchant IPN registration or bank payment success.'
