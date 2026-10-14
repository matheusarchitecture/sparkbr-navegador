$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
$root = Join-Path $project 'public-site'
$backupRoot = Join-Path $project 'backups\pre-integration'
$ids = @('spark','sparkmat','sparkpet','saude','agua','posto','familia','financeiro','farmacia','dose','astromatch','contas','cardapio','agenda','cofrinho','faxina','escola','carteirinha','energia','bico','sono','mural','ideias')
$bridgeTag = '<script defer src="/navegador/bridge/spark-bridge.js?v=2.1.0"></script>'
$familyTag = '<script src="/navegador/bridge/spark-family.js?v=2.1.0"></script>'
$utf8 = New-Object System.Text.UTF8Encoding($false)
New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
$changed = 0

function Patch-Page([string]$path, [string]$appId, [bool]$setAppId) {
  if (!(Test-Path $path)) { throw "Página não encontrada: $path" }
  $html = [System.IO.File]::ReadAllText($path)
  $backupName = if ($appId) { $appId + '.index.html' } else { 'home.index.html' }
  $backup = Join-Path $backupRoot $backupName
  if (!(Test-Path $backup)) { [System.IO.File]::WriteAllText($backup, $html, $utf8) }

  if ($setAppId) {
    $bodyMatch = [regex]::Match($html, '<body\b[^>]*>', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    if ($bodyMatch.Success) {
      $bodyTag = $bodyMatch.Value
      if ($bodyTag -match 'data-spark-page\s*=') {
        $newBodyTag = [regex]::Replace($bodyTag, 'data-spark-page\s*=\s*["''][^"'']*["'']', 'data-spark-page="' + $appId + '"', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
      } else {
        $newBodyTag = $bodyTag.Substring(0, $bodyTag.Length - 1) + ' data-spark-page="' + $appId + '">'
      }
      $html = $html.Substring(0, $bodyMatch.Index) + $newBodyTag + $html.Substring($bodyMatch.Index + $bodyMatch.Length)
    }
  }

  if ($html -notmatch 'spark-bridge\.js') {
    $headMatch = [regex]::Match($html, '<head\b[^>]*>', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    if (!$headMatch.Success) { throw "Tag <head> não encontrado: $path" }
    $html = $html.Substring(0, $headMatch.Index + $headMatch.Length) + [Environment]::NewLine + '  ' + $bridgeTag + $html.Substring($headMatch.Index + $headMatch.Length)
  }
  if ($html -notmatch 'spark-family\.js') {
    $bodyEnd = $html.LastIndexOf('</body>', [System.StringComparison]::OrdinalIgnoreCase)
    if ($bodyEnd -lt 0) { throw "Tag </body> não encontrada: $path" }
    $html = $html.Substring(0, $bodyEnd) + $familyTag + [Environment]::NewLine + $html.Substring($bodyEnd)
  }
  [System.IO.File]::WriteAllText($path, $html, $utf8)
}

foreach ($app in $ids) {
  $page = Join-Path $root ($app + '\index.html')
  Patch-Page $page $app $true
  $changed++
}
Patch-Page (Join-Path $root 'index.html') '' $false
$changed++
Write-Output ("Integração estática aplicada a {0} páginas: 23 apps + página inicial." -f ($changed - 1))
Write-Output ("Backups preservados em: " + $backupRoot)
Write-Output "O script é idempotente: pode ser executado novamente sem duplicar as tags."
