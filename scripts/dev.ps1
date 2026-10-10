$ErrorActionPreference = 'Stop'
$pathmapRoot = Split-Path -Parent $PSScriptRoot
$pathmapRuntime = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    $pathmapNode = Join-Path $pathmapRuntime 'node\bin'
    $pathmapPnpm = Join-Path $pathmapRuntime 'bin\fallback'
    if (-not (Test-Path -LiteralPath (Join-Path $pathmapNode 'node.exe'))) {
        throw 'Install Node.js 22+ and pnpm 11.25.0, then run pnpm dev.'
    }
    $env:PATH = "$pathmapNode;$pathmapPnpm;$env:PATH"
}
Set-Location -LiteralPath $pathmapRoot
pnpm dev
exit $LASTEXITCODE
