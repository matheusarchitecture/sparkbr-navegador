# Gera certificado autoassinado local e compila o instalador (grátis, uso próprio).
# O SmartScreen continua avisando; para distribuir sem aviso use SignPath (docs/ASSINATURA.md).
$ErrorActionPreference = 'Stop'
$proj = Split-Path -Parent $PSScriptRoot
$pfx = Join-Path $proj 'win-selfsign.pfx'
$pwd = 'sparkbr-local'
if (-not (Test-Path $pfx)) {
  $cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject 'CN=SparkBR Local' `
    -KeyUsage DigitalSignature -FriendlyName 'SparkBR local (sem confiança pública)' `
    -NotAfter (Get-Date).AddYears(3) -CertStoreLocation Cert:\CurrentUser\My
  $sec = ConvertTo-SecureString $pwd -Force -AsPlainText
  Export-PfxCertificate -Cert $cert -FilePath $pfx -Password $sec | Out-Null
  Write-Host "Certificado criado: $pfx"
} else {
  Write-Host "Reutilizando: $pfx"
}
$env:CSC_LINK = $pfx
$env:CSC_KEY_PASSWORD = $pwd
Set-Location $proj
npm run build:win
