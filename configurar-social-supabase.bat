@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================================
echo   EditFlow - Autoconfigurador de Supabase (Google OAuth)
echo ============================================================
echo.
echo Este script lee tu .env.local y configura automaticamente en Supabase:
echo   - Google OAuth (Client ID y Secret de .env.local)
echo   - Site URL y Redirect URL (http://localhost:3000/auth/callback)
echo   - Allow Manual Linking (para vincular Google Calendar)
echo.
echo Necesitas un Access Token personal de Supabase (empieza por sbp_...):
echo   1. Abre: https://supabase.com/dashboard/account/tokens
echo   2. Haz clic en "Generate new token", copialo y pegalo aqui.
echo.
if "%AUTO_MODE%"=="1" goto :run_ps

if "%SB_TOKEN%"=="" set /p "SB_TOKEN=Pega tu Supabase Access Token (sbp_...): "
if "%SB_TOKEN%"=="" (
  echo.
  echo [ERROR] No ingresaste el token sbp_...
  pause
  exit /b 1
)

echo.
echo Opcional - URL de produccion en Vercel o Azure (deja vacio y pulsa Enter para solo local):
set /p "PROD_URL=URL de produccion (ej. https://tu-app.vercel.app): "

:run_ps
set "BAT_PATH=%~f0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$marker = '###POWERSHELL_' + 'START###'; $parts = (Get-Content -Raw -LiteralPath $env:BAT_PATH -Encoding UTF8) -split $marker, 2; & ([scriptblock]::Create($parts[1]))"
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if not "%EXIT_CODE%"=="0" (
  echo [ERROR] La configuracion termino con errores ^(codigo %EXIT_CODE%^).
  if not "%AUTO_MODE%"=="1" pause
  exit /b %EXIT_CODE%
)

if "%AUTO_MODE%"=="1" exit /b 0

set /p "START_DEV=Quieres iniciar ahora el servidor local (npm run dev)? [S/N]: "
if /I "%START_DEV%"=="S" (
  call npm.cmd run dev
  exit /b %ERRORLEVEL%
)

pause
exit /b 0

###POWERSHELL_START###
$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Add-Type -AssemblyName System.Net.Http

if (-not (Test-Path ".env.local")) {
  Write-Host "[ERROR] No se encontro .env.local en la carpeta del proyecto." -ForegroundColor Red
  exit 1
}

$envMap = @{}
foreach ($line in Get-Content ".env.local" -Encoding UTF8) {
  $trimmed = $line.Trim()
  if (-not $trimmed -or $trimmed.StartsWith("#")) { continue }
  $idx = $trimmed.IndexOf("=")
  if ($idx -gt 0) {
    $k = $trimmed.Substring(0, $idx).Trim()
    $v = $trimmed.Substring($idx + 1).Trim()
    $envMap[$k] = $v
  }
}

$supabaseUrl = $envMap["NEXT_PUBLIC_SUPABASE_URL"]
$anonKey = $envMap["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
if (-not $anonKey) { $anonKey = $envMap["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] }
$googleId = $envMap["GOOGLE_CLIENT_ID"]
$googleSecret = $envMap["GOOGLE_CLIENT_SECRET"]

if (-not $supabaseUrl -or $supabaseUrl -notmatch "https://([^.]+)\.supabase\.co") {
  Write-Host "[ERROR] NEXT_PUBLIC_SUPABASE_URL invalida en .env.local: $supabaseUrl" -ForegroundColor Red
  exit 1
}
$projectRef = $Matches[1]

$token = $env:SB_TOKEN.Trim()
$prodUrl = if ($env:PROD_URL) { $env:PROD_URL.Trim().TrimEnd("/") } else { "" }

$apiUrl = "https://api.supabase.com/v1/projects/$projectRef/config/auth"
$headers = @{
  "Authorization" = "Bearer $token"
  "Content-Type"  = "application/json; charset=utf-8"
}

Write-Host ""
Write-Host "Leyendo configuracion actual de Supabase ($projectRef)..." -ForegroundColor Cyan
try {
  $current = Invoke-RestMethod -Method Get -Uri $apiUrl -Headers $headers
} catch {
  Write-Host "[ERROR] No se pudo autenticar con la API de Supabase. Verifica que tu token sbp_... sea valido y pertenezca a esta cuenta." -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor DarkRed
  exit 1
}

$localRedirect = "http://localhost:3000/auth/callback"
$existingAllow = @()
if ($current.uri_allow_list) {
  $existingAllow = $current.uri_allow_list -split "," | ForEach-Object { $_.Trim() } | Where-Object { $_ }
}
if ($existingAllow -notcontains $localRedirect) {
  $existingAllow += $localRedirect
}
if ($prodUrl) {
  $prodRedirect = "$prodUrl/auth/callback"
  if ($existingAllow -notcontains $prodRedirect) {
    $existingAllow += $prodRedirect
  }
}
$allowList = ($existingAllow | Select-Object -Unique) -join ","

$siteUrl = if ($prodUrl) { $prodUrl } else { "http://localhost:3000" }

$payload = @{
  site_url                        = $siteUrl
  uri_allow_list                  = $allowList
  security_manual_linking_enabled = $true
}

if ($googleId -and $googleSecret) {
  $payload["external_google_enabled"]   = $true
  $payload["external_google_client_id"] = $googleId
  $payload["external_google_secret"]    = $googleSecret
} else {
  Write-Host "[AVISO] GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET vacios en .env.local; se omitio Google." -ForegroundColor Yellow
}

$payload["external_facebook_enabled"] = $false

Write-Host "Aplicando cambios en Supabase Auth..." -ForegroundColor Cyan
$jsonBody = $payload | ConvertTo-Json -Depth 5
try {
  Invoke-RestMethod -Method Patch -Uri $apiUrl -Headers $headers -Body $jsonBody | Out-Null
} catch {
  Write-Host "[ERROR] Fallo al actualizar Supabase Auth:" -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor DarkRed
  exit 1
}

Write-Host "Verificando estado en vivo..." -ForegroundColor Cyan
Start-Sleep -Seconds 3
$settings = Invoke-RestMethod -Method Get -Uri "$supabaseUrl/auth/v1/settings" -Headers @{ "apikey" = $anonKey }

$handler = New-Object System.Net.Http.HttpClientHandler
$handler.AllowAutoRedirect = $false
$httpClient = New-Object System.Net.Http.HttpClient($handler)
$authResp = $httpClient.GetAsync("$supabaseUrl/auth/v1/authorize?provider=google").GetAwaiter().GetResult()
$location = if ($authResp.Headers.Location) { $authResp.Headers.Location.AbsoluteUri } else { "" }
$httpClient.Dispose()

$activeGoogleClient = "(no detectado)"
if ($location -match "client_id=([^&]+)") {
  $activeGoogleClient = [System.Uri]::UnescapeDataString($Matches[1])
}

Write-Host ""
Write-Host "=== RESULTADO EN SUPABASE ===" -ForegroundColor Green
Write-Host "  Google habilitado:       $($settings.external.google)"
Write-Host "  Client ID Google activo: $activeGoogleClient"
Write-Host "  Site URL:                $siteUrl"
Write-Host "  Redirect URLs:           $allowList"
Write-Host "  Manual Linking:          True"
Write-Host ""
Write-Host "Recuerda en Google Cloud tener autorizada esta Callback URI:" -ForegroundColor Yellow
Write-Host "  $supabaseUrl/auth/v1/callback"
Write-Host "Y en Google Auth Platform -> Publico -> Usuarios de prueba: tu correo Gmail." -ForegroundColor Yellow
