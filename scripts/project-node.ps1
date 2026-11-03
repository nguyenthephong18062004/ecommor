function Get-ProjectNode {
    $projectRoot = Split-Path -Parent $PSScriptRoot
    $projectVersion = (Get-Content -LiteralPath (Join-Path $projectRoot '.nvmrc')).Trim()
    $candidates = @()
    if ($env:NVM_HOME) { $candidates += Join-Path $env:NVM_HOME "v$projectVersion\node.exe" }
    $currentNode = Get-Command node -ErrorAction SilentlyContinue
    if ($currentNode) { $candidates += $currentNode.Source }
    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate) {
            $version = & $candidate -p 'process.versions.node'
            if ($LASTEXITCODE -eq 0 -and [version]$version -ge [version]'22.12.0') { return $candidate }
        }
    }
    throw 'Project requires Node >=22.12.0. Install the .nvmrc version; this launcher does not change the default Node.'
}
