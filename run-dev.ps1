$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Node = 'C:\Users\Latop\AppData\Local\nvm\v20.19.6\node.exe'
$Npm = 'C:\Users\Latop\AppData\Local\nvm\v20.19.6\npm.cmd'
$Mongo = 'C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe'
$MongoPort = '27018'
$ClientUrl = 'http://localhost:5173'

function Test-Port($Port) {
    $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    return $null -ne $connection
}

if (-not (Test-Port $MongoPort)) {
    New-Item -ItemType Directory -Force -Path (Join-Path $Root '.runtime\mongo-data') | Out-Null
    Start-Process -FilePath $Mongo `
        -ArgumentList @('--dbpath', '.runtime\mongo-data', '--port', $MongoPort, '--bind_ip', '127.0.0.1') `
        -WorkingDirectory $Root `
        -WindowStyle Hidden
    Start-Sleep -Seconds 5
}

if (-not (Test-Port 3000)) {
    $env:CONNECT_DB = "mongodb://localhost:$MongoPort/watch"
    $env:DOMAIN_URL = $ClientUrl
    $env:CLIENT_URL = $ClientUrl

    $serverPath = Join-Path $Root 'server'
    Start-Process -FilePath $Node `
        -ArgumentList @('src\server.js') `
        -WorkingDirectory $serverPath `
        -WindowStyle Hidden
    Start-Sleep -Seconds 3
}

if (-not (Test-Port 5173)) {
    $clientPath = Join-Path $Root 'client'
    Start-Process -FilePath $Npm `
        -ArgumentList @('run', 'dev', '--', '--host', '127.0.0.1', '--port', '5173') `
        -WorkingDirectory $clientPath `
        -WindowStyle Hidden
}

Write-Host ''
Write-Host 'Project is running:'
Write-Host 'Frontend: http://127.0.0.1:5173'
Write-Host 'Backend:  http://127.0.0.1:3000'
Write-Host 'MongoDB:  mongodb://localhost:27018/watch'
