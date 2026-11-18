@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================================
echo   EditFlow - Publicar / Actualizar en Vercel
echo ============================================================
echo.

if not exist ".env.local" (
  echo [ERROR] No se encontro .env.local en la carpeta del proyecto.
  pause
  exit /b 1
)

set "BAT_PATH=%~f0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$marker = '###POWERSHELL_' + 'START###'; $parts = (Get-Content -Raw -LiteralPath $env:BAT_PATH -Encoding UTF8) -split $marker, 2; & ([scriptblock]::Create($parts[1]))"
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if not "%EXIT_CODE%"=="0" (
  echo [ERROR] La publicacion termino con errores ^(codigo %EXIT_CODE%^).
  if not "%AUTO_MODE%"=="1" pause
  exit /b %EXIT_CODE%
)

if not "%AUTO_MODE%"=="1" pause
exit /b 0

###POWERSHELL_START###
$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

function Read-EnvFile([string]$path) {
  $map = @{}
  foreach ($line in Get-Content $path -Encoding UTF8) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith("#")) { continue }
    $idx = $trimmed.IndexOf("=")
    if ($idx -gt 0) {
      $k = $trimmed.Substring(0, $idx).Trim()
      $v = $trimmed.Substring($idx + 1).Trim()
      if (($v.StartsWith('"') -and $v.EndsWith('"')) -or ($v.StartsWith("'") -and $v.EndsWith("'"))) {
        $v = $v.Substring(1, $v.Length - 2)
      }
      $map[$k] = $v
    }
  }
  return $map
}

function Get-VercelCliToken {
  $candidates = @(
    (Join-Path $env:APPDATA "com.vercel.cli\Data\auth.json"),
    (Join-Path $env:LOCALAPPDATA "com.vercel.cli\Data\auth.json"),
    (Join-Path $env:USERPROFILE ".vercel\auth.json"),
    (Join-Path $env:USERPROFILE ".config\vercel\auth.json")
  )
  foreach ($p in $candidates) {
    if ($p -and (Test-Path $p)) {
      try {
        $data = Get-Content $p -Raw -Encoding UTF8 | ConvertFrom-Json
        if ($data.token) { return [string]$data.token }
      } catch {}
    }
  }
  return $null
}

function Get-VercelUser([string]$token) {
  if (-not $token) { return $null }
  try {
    $resp = Invoke-RestMethod -Method Get -Uri "https://api.vercel.com/v2/user" -Headers @{ "Authorization" = "Bearer $token" }
    return $resp.user
  } catch {
    return $null
  }
}

function Get-AllVercelProjects([string]$token, $user) {
  $headers = @{ "Authorization" = "Bearer $token" }
  $items = New-Object System.Collections.Generic.List[object]

  $scopes = New-Object System.Collections.Generic.List[object]
  $scopes.Add([pscustomobject]@{
    id    = [string]$user.id
    label = "Personal ($($user.username))"
    query = ""
    slug  = $null
  })

  try {
    $teamsResp = Invoke-RestMethod -Method Get -Uri "https://api.vercel.com/v2/teams" -Headers $headers
    foreach ($team in @($teamsResp.teams)) {
      $scopes.Add([pscustomobject]@{
        id    = [string]$team.id
        label = "Equipo: $($team.name)"
        query = "&teamId=$($team.id)"
        slug  = [string]$team.slug
      })
    }
  } catch {}

  $seenIds = @{}
  $scopeLabelById = @{}
  foreach ($sc in $scopes) { $scopeLabelById[$sc.id] = $sc.label }

  foreach ($sc in $scopes) {
    try {
      $resp = Invoke-RestMethod -Method Get -Uri "https://api.vercel.com/v9/projects?limit=100$($sc.query)" -Headers $headers
      foreach ($p in @($resp.projects)) {
        $projId = [string]$p.id
        if ($seenIds.ContainsKey($projId)) { continue }
        $seenIds[$projId] = $true

        $projOrgId = if ($p.accountId) { [string]$p.accountId } else { [string]$sc.id }
        $projScopeLabel = if ($scopeLabelById.ContainsKey($projOrgId)) { $scopeLabelById[$projOrgId] } else { [string]$sc.label }

        $domain = $null
        try {
          $domTeam = if ($projOrgId.StartsWith("team_")) { "?teamId=$projOrgId" } else { "" }
          $domResp = Invoke-RestMethod -Method Get -Uri "https://api.vercel.com/v9/projects/$projId/domains$domTeam" -Headers $headers
          $customDom = $domResp.domains | Where-Object { $_.verified -and -not $_.redirect -and $_.name -notmatch '\.vercel\.app$' } | Select-Object -First 1 -ExpandProperty name
          $domain = $customDom
        } catch {}

        if (-not $domain -and $p.targets -and $p.targets.production -and $p.targets.production.alias) {
          $aliases = @($p.targets.production.alias)
          $custom = $aliases | Where-Object { $_ -notmatch '\.vercel\.app$' } | Select-Object -First 1
          $domain = if ($custom) { $custom } else { $aliases | Select-Object -First 1 }
        }

        $items.Add([pscustomobject]@{
          id        = $projId
          name      = [string]$p.name
          orgId     = $projOrgId
          scopeName = $projScopeLabel
          domain    = if ($domain) { "https://$domain" } else { "(sin dominio aun)" }
        })
      }
    } catch {}
  }

  return [pscustomobject]@{
    projects = $items
    scopes   = $scopes
  }
}

function Save-LocalVercelLink([string]$projectId, [string]$orgId, [string]$projectName) {
  $dir = Join-Path (Get-Location) ".vercel"
  if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir | Out-Null
  }
  $projFile = Join-Path $dir "project.json"
  $json = @{
    projectId   = $projectId
    orgId       = $orgId
    projectName = $projectName
  } | ConvertTo-Json -Compress
  [System.IO.File]::WriteAllText($projFile, $json, (New-Object System.Text.UTF8Encoding($false)))
}

function Set-VercelEnvVar([string]$projectId, [string]$orgId, [string]$token, [string]$key, [string]$value) {
  $headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type"  = "application/json; charset=utf-8"
  }
  $teamSuffix = if ($orgId -and $orgId.StartsWith("team_")) { "&teamId=$orgId" } else { "" }
  $url = "https://api.vercel.com/v10/projects/$projectId/env?upsert=true$teamSuffix"
  $envType = if ($key.StartsWith("NEXT_PUBLIC_")) { "plain" } else { "encrypted" }
  $body = @{
    key    = $key
    value  = $value
    type   = $envType
    target = @("production", "preview")
  } | ConvertTo-Json -Depth 4
  Invoke-RestMethod -Method Post -Uri $url -Headers $headers -Body $body | Out-Null
}

function Get-VercelEnvValue([string]$projectId, [string]$orgId, [string]$token, [string]$key) {
  $headers = @{ "Authorization" = "Bearer $token" }
  $teamSuffix = if ($orgId -and $orgId.StartsWith("team_")) { "?teamId=$orgId" } else { "" }
  $url = "https://api.vercel.com/v10/projects/$projectId/env$teamSuffix"
  $resp = Invoke-RestMethod -Method Get -Uri $url -Headers $headers
  $match = $resp.envs | Where-Object { $_.key -eq $key -and ($_.target -contains "production") } | Select-Object -First 1
  if ($match) { return $match.value }
  return $null
}

$envMap = Read-EnvFile ".env.local"
$isAuto = $env:AUTO_MODE -eq "1"

Write-Host "1/5 Verificando sesion en Vercel..." -ForegroundColor Cyan

$tokenSource = $null
$vercelToken = $null
if ($env:VERCEL_TOKEN) {
  $vercelToken = $env:VERCEL_TOKEN.Trim()
  $tokenSource = "variable de entorno VERCEL_TOKEN"
} elseif ($envMap["VERCEL_TOKEN"]) {
  $vercelToken = $envMap["VERCEL_TOKEN"]
  $tokenSource = ".env.local (VERCEL_TOKEN)"
} else {
  $cliToken = Get-VercelCliToken
  if ($cliToken) {
    $vercelToken = $cliToken
    $tokenSource = "sesion de Vercel CLI (vercel login)"
  }
}

$vercelUser = Get-VercelUser $vercelToken

if ($vercelUser) {
  Write-Host "  [LOGUEADO] Cuenta activa: $($vercelUser.username) ($($vercelUser.email))" -ForegroundColor Green
  Write-Host "  Origen del acceso: $tokenSource"
  if (-not $isAuto) {
    $accChoice = (Read-Host "  Pulsa Enter para continuar con esta cuenta, o escribe C para cambiar").Trim().ToUpper()
    if ($accChoice -eq "C") {
      $vercelUser = $null
      $vercelToken = $null
    }
  }
} else {
  Write-Host "  [NO LOGUEADO] No hay sesion activa o el token de Vercel no es valido." -ForegroundColor Yellow
}

while (-not $vercelUser) {
  if ($isAuto) {
    Write-Host "[ERROR] No hay sesion valida en Vercel para AUTO_MODE=1." -ForegroundColor Red
    exit 1
  }
  Write-Host ""
  Write-Host "Como quieres iniciar sesion en Vercel?"
  Write-Host "  [1] Iniciar sesion en el navegador (vercel login)"
  Write-Host "  [2] Pegar un Vercel Token (vcp_...)"
  Write-Host "  [3] Salir"
  $loginOpt = (Read-Host "Elige una opcion [1/2/3]").Trim()

  if ($loginOpt -eq "1") {
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    & npx.cmd --yes vercel login
    $loginExit = $LASTEXITCODE
    $ErrorActionPreference = $prevEap
    if ($loginExit -ne 0) {
      Write-Host "[ERROR] vercel login no se completo." -ForegroundColor Red
      continue
    }
    $vercelToken = Get-VercelCliToken
    $tokenSource = "sesion de Vercel CLI (vercel login)"
  } elseif ($loginOpt -eq "2") {
    $vercelToken = (Read-Host "Pega tu Vercel Token (vcp_...)").Trim()
    $tokenSource = "token ingresado manualmente"
  } elseif ($loginOpt -eq "3") {
    exit 0
  } else {
    continue
  }

  $vercelUser = Get-VercelUser $vercelToken
  if ($vercelUser) {
    Write-Host "  [LOGUEADO] Conectado como: $($vercelUser.username) ($($vercelUser.email))" -ForegroundColor Green
  } else {
    Write-Host "  [ERROR] El token o sesion no es valido. Intenta de nuevo." -ForegroundColor Red
  }
}

Write-Host ""
Write-Host "2/5 Verificando proyectos disponibles en Vercel..." -ForegroundColor Cyan

$linkedMeta = $null
if (Test-Path ".vercel\project.json") {
  try {
    $linkedMeta = Get-Content ".vercel\project.json" -Raw -Encoding UTF8 | ConvertFrom-Json
  } catch {}
}

$catalog = Get-AllVercelProjects $vercelToken $vercelUser
$projects = $catalog.projects
$scopes = $catalog.scopes

if ($linkedMeta -and $linkedMeta.projectId) {
  Write-Host "  Proyecto enlazado actualmente en esta carpeta: $($linkedMeta.projectName) ($($linkedMeta.projectId))"
} else {
  Write-Host "  Esta carpeta aun no esta enlazada a ningun proyecto de Vercel." -ForegroundColor Yellow
}

$selectedProject = $null
if ($isAuto -and $linkedMeta -and $linkedMeta.projectId) {
  $selectedProject = $projects | Where-Object { $_.id -eq $linkedMeta.projectId } | Select-Object -First 1
  if (-not $selectedProject) {
    $selectedProject = [pscustomobject]@{
      id    = [string]$linkedMeta.projectId
      orgId = [string]$linkedMeta.orgId
      name  = [string]$linkedMeta.projectName
    }
  }
}

if (-not $isAuto) {
  Write-Host ""
  if ($projects.Count -gt 0) {
    Write-Host "Proyectos en tu cuenta de Vercel:" -ForegroundColor White
    for ($i = 0; $i -lt $projects.Count; $i++) {
      $p = $projects[$i]
      $num = $i + 1
      $isLinked = $linkedMeta -and ($linkedMeta.projectId -eq $p.id)
      $mark = if ($isLinked) { "* " } else { "  " }
      $tag = if ($isLinked) { " [ENLAZADO ACTUAL]" } else { "" }
      Write-Host ("{0}[{1}] {2}  |  {3}  |  {4}{5}" -f $mark, $num, $p.name, $p.scopeName, $p.domain, $tag)
    }
  } else {
    Write-Host "  No hay proyectos creados todavia en esta cuenta." -ForegroundColor Yellow
  }
  Write-Host "  [N] Crear un proyecto nuevo en Vercel"
  Write-Host ""

  $linkedIndex = -1
  if ($linkedMeta -and $linkedMeta.projectId) {
    for ($i = 0; $i -lt $projects.Count; $i++) {
      if ($projects[$i].id -eq $linkedMeta.projectId) { $linkedIndex = $i; break }
    }
  }

  while (-not $selectedProject) {
    $promptMsg = if ($linkedIndex -ge 0) {
      "Elige numero de proyecto a actualizar (Enter = [$($linkedIndex + 1)] $($projects[$linkedIndex].name), N = crear nuevo)"
    } else {
      "Elige numero de proyecto a actualizar (o N para crear nuevo)"
    }
    $choice = (Read-Host $promptMsg).Trim()

    if (-not $choice -and $linkedIndex -ge 0) {
      $selectedProject = $projects[$linkedIndex]
      break
    }

    if ($choice -match '^[nN]$') {
      $newName = (Read-Host "Nombre del nuevo proyecto (Enter = editflow)").Trim()
      if (-not $newName) { $newName = "editflow" }

      $targetScope = $scopes[0]
      if ($scopes.Count -gt 1) {
        Write-Host "Donde crear '$newName'?"
        for ($s = 0; $s -lt $scopes.Count; $s++) {
          Write-Host "  [$($s + 1)] $($scopes[$s].label)"
        }
        $scChoice = (Read-Host "Elige [1-$($scopes.Count)] (Enter = 1)").Trim()
        if ($scChoice -match '^\d+$') {
          $scIdx = [int]$scChoice - 1
          if ($scIdx -ge 0 -and $scIdx -lt $scopes.Count) { $targetScope = $scopes[$scIdx] }
        }
      }

      $createHeaders = @{
        "Authorization" = "Bearer $vercelToken"
        "Content-Type"  = "application/json; charset=utf-8"
      }
      $createBody = @{
        name      = $newName
        framework = "nextjs"
      } | ConvertTo-Json -Depth 3
      $created = Invoke-RestMethod -Method Post -Uri "https://api.vercel.com/v10/projects$($targetScope.query.Replace('&', '?'))" -Headers $createHeaders -Body $createBody
      $selectedProject = [pscustomobject]@{
        id    = [string]$created.id
        orgId = if ($created.accountId) { [string]$created.accountId } else { [string]$targetScope.id }
        name  = [string]$created.name
      }
      Write-Host "  + Proyecto creado: $($selectedProject.name) ($($selectedProject.id))" -ForegroundColor Green
      break
    }

    if ($choice -match '^\d+$') {
      $idx = [int]$choice - 1
      if ($idx -ge 0 -and $idx -lt $projects.Count) {
        $selectedProject = $projects[$idx]
        break
      }
    }

    Write-Host "  Opcion no valida. Intenta de nuevo." -ForegroundColor Yellow
  }
}

if (-not $selectedProject) {
  Write-Host "  Creando/enlazando proyecto por defecto en Vercel..." -ForegroundColor Cyan
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  & npx.cmd --yes vercel link --yes --token $vercelToken
  $linkExit = $LASTEXITCODE
  $ErrorActionPreference = $prevEap
  if ($linkExit -ne 0) { exit $linkExit }
  $projMeta = Get-Content ".vercel\project.json" -Raw -Encoding UTF8 | ConvertFrom-Json
  $selectedProject = [pscustomobject]@{
    id    = [string]$projMeta.projectId
    orgId = [string]$projMeta.orgId
    name  = [string]$projMeta.projectName
  }
} else {
  Save-LocalVercelLink $selectedProject.id $selectedProject.orgId $selectedProject.name
}

$projectId = $selectedProject.id
$orgId = $selectedProject.orgId
Write-Host "  Proyecto seleccionado: $($selectedProject.name) ($projectId)" -ForegroundColor Green

$sbToken = if ($env:SB_TOKEN) {
  $env:SB_TOKEN.Trim()
} elseif ($env:SUPABASE_ACCESS_TOKEN) {
  $env:SUPABASE_ACCESS_TOKEN.Trim()
} else {
  $envMap["SUPABASE_ACCESS_TOKEN"]
}
if (-not $sbToken -and -not $isAuto) {
  $sbToken = (Read-Host "Opcional - Token sbp_... de Supabase para actualizar Redirect URLs (Enter para omitir)").Trim()
}

$existingProdAppUrl = Get-VercelEnvValue $projectId $orgId $vercelToken "NEXT_PUBLIC_APP_URL"

Write-Host ""
Write-Host "3/5 Subiendo variables de entorno desde .env.local a Vercel..." -ForegroundColor Cyan
$keysToSync = @(
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SECRET_KEY",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "CRON_SECRET",
  "NEXT_PUBLIC_META_DOMAIN_VERIFICATION",
  "NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION"
)

foreach ($k in $keysToSync) {
  $val = $envMap[$k]
  if ($val) {
    Set-VercelEnvVar $projectId $orgId $vercelToken $k $val
    Write-Host "  + $k"
  }
}

Write-Host ""
Write-Host "4/5 Compilando y publicando a produccion en Vercel..." -ForegroundColor Cyan
$prevEap = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$deployOutput = & npx.cmd --yes vercel deploy --prod --yes --token $vercelToken 2>&1 | ForEach-Object { "$_" }
$deployExit = $LASTEXITCODE
$ErrorActionPreference = $prevEap
$deployOutput | ForEach-Object { Write-Host $_ }
if ($deployExit -ne 0) { exit $deployExit }

$headers = @{ "Authorization" = "Bearer $vercelToken" }
$teamSuffix = if ($orgId -and $orgId.StartsWith("team_")) { "?teamId=$orgId" } else { "" }
$domainsInfo = Invoke-RestMethod -Method Get -Uri "https://api.vercel.com/v9/projects/$projectId/domains$teamSuffix" -Headers $headers
$customDomain = $domainsInfo.domains | Where-Object { $_.verified -and -not $_.redirect -and $_.name -notmatch '\.vercel\.app$' } | Select-Object -First 1 -ExpandProperty name
$projInfo = Invoke-RestMethod -Method Get -Uri "https://api.vercel.com/v9/projects/$projectId$teamSuffix" -Headers $headers

$prodDomain = $customDomain
if (-not $prodDomain -and $projInfo.targets -and $projInfo.targets.production -and $projInfo.targets.production.alias) {
  $prodDomain = $projInfo.targets.production.alias | Select-Object -First 1
}
$prodUrl = if ($prodDomain) {
  "https://$prodDomain"
} else {
  (($deployOutput | Select-String -Pattern "https://[^\s]+\.vercel\.app" | Select-Object -Last 1).Matches.Value)
}

if ($prodUrl -and $existingProdAppUrl -ne $prodUrl) {
  Write-Host ""
  Write-Host "5/5 Fijando NEXT_PUBLIC_APP_URL=$prodUrl y refrescando build..." -ForegroundColor Cyan
  Set-VercelEnvVar $projectId $orgId $vercelToken "NEXT_PUBLIC_APP_URL" $prodUrl
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  & npx.cmd --yes vercel deploy --prod --yes --token $vercelToken
  $redeployExit = $LASTEXITCODE
  $ErrorActionPreference = $prevEap
  if ($redeployExit -ne 0) { exit $redeployExit }
} else {
  Write-Host ""
  Write-Host "5/5 NEXT_PUBLIC_APP_URL ya coincide con $prodUrl." -ForegroundColor Cyan
}

$supabaseUrl = $envMap["NEXT_PUBLIC_SUPABASE_URL"]
if ($sbToken -and $prodUrl -and $supabaseUrl -match "https://([^.]+)\.supabase\.co") {
  $sbRef = $Matches[1]
  Write-Host "Actualizando Redirect URLs en Supabase ($sbRef)..." -ForegroundColor Cyan
  $sbHeaders = @{
    "Authorization" = "Bearer $sbToken"
    "Content-Type"  = "application/json; charset=utf-8"
  }
  $sbApi = "https://api.supabase.com/v1/projects/$sbRef/config/auth"
  $sbCurrent = Invoke-RestMethod -Method Get -Uri $sbApi -Headers $sbHeaders
  $allow = @()
  if ($sbCurrent.uri_allow_list) {
    $allow = $sbCurrent.uri_allow_list -split "," | ForEach-Object { $_.Trim() } | Where-Object { $_ }
  }
  foreach ($u in @("http://localhost:3000/auth/callback", "$prodUrl/auth/callback", "$prodUrl/**")) {
    if ($allow -notcontains $u) { $allow += $u }
  }
  $sbBody = @{
    site_url       = $prodUrl
    uri_allow_list = (($allow | Select-Object -Unique) -join ",")
  } | ConvertTo-Json -Depth 4
  Invoke-RestMethod -Method Patch -Uri $sbApi -Headers $sbHeaders -Body $sbBody | Out-Null
}

Write-Host ""
Write-Host "=== PUBLICACION COMPLETA ===" -ForegroundColor Green
Write-Host "  Proyecto:            $($selectedProject.name)"
Write-Host "  URL publica:         $prodUrl"
Write-Host "  Privacidad:          $prodUrl/privacidad"
Write-Host "  Condiciones:         $prodUrl/terminos"
Write-Host "  Sitemap:             $prodUrl/sitemap.xml"
Write-Host "  Callback OAuth:      $supabaseUrl/auth/v1/callback"
