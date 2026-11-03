$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $Root 'scripts\project-node.ps1')
$Node = Get-ProjectNode
$ClientUrl = 'http://localhost:5173'

function Test-Port($Port) {
    $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    return $null -ne $connection
}

function Wait-HttpReady($Url, $StartedProcess) {
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        if ($StartedProcess) {
            $StartedProcess.Refresh()
            if ($StartedProcess.HasExited) {
                throw "Process exited before $Url became ready (exit code $($StartedProcess.ExitCode))."
            }
        }
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
            if ($response.StatusCode -eq 200) { return }
        } catch {
            Start-Sleep -Milliseconds 500
        }
    }
    throw "Timed out waiting for $Url."
}

$backendProcess = $null
$backendLogDir = Join-Path $Root '.runtime\logs'

if (-not (Test-Port 3000)) {
    if (-not $env:DOMAIN_URL) { $env:DOMAIN_URL = $ClientUrl }
    if (-not $env:CLIENT_URL) { $env:CLIENT_URL = $ClientUrl }

    $serverPath = Join-Path $Root 'server'
    New-Item -ItemType Directory -Path $backendLogDir -Force | Out-Null
    $backendProcess = Start-Process -FilePath $Node `
        -ArgumentList @('src\server.js') `
        -WorkingDirectory $serverPath `
        -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $backendLogDir 'backend.stdout.log') `
        -RedirectStandardError (Join-Path $backendLogDir 'backend.stderr.log') `
        -PassThru
}

try {
    Wait-HttpReady 'http://127.0.0.1:3000/api/catalog-options' $backendProcess
} catch {
    throw "Backend is not ready. Check $backendLogDir for logs. $($_.Exception.Message)"
}

if (-not (Test-Port 5173)) {
    $clientPath = Join-Path $Root 'client'
    Start-Process -FilePath $Node `
        -ArgumentList @('node_modules\vite\bin\vite.js', '--host', '127.0.0.1', '--port', '5173') `
        -WorkingDirectory $clientPath `
        -WindowStyle Hidden
}

Wait-HttpReady 'http://127.0.0.1:5173/' $null

Write-Host ''
Write-Host 'Project is running:'
Write-Host 'Frontend: http://127.0.0.1:5173'
Write-Host 'Backend:  http://127.0.0.1:3000'
Write-Host 'MongoDB:  configured CONNECT_DB (checkout requires a replica set)'
