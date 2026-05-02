param(
  [string]$GstackSource,
  [switch]$CheckOnly
)

$ErrorActionPreference = 'Stop'

function Resolve-GstackSource {
  param([string]$ExplicitSource)

  $candidates = @()
  if ($ExplicitSource) { $candidates += $ExplicitSource }
  if ($env:GSTACK_SOURCE) { $candidates += $env:GSTACK_SOURCE }
  $candidates += 'C:\Users\Kaj\Desktop\gstack\gstack-main'
  $candidates += (Join-Path $HOME 'gstack')
  $candidates += (Join-Path $HOME '.codex\skills\gstack')

  foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path (Join-Path $candidate 'setup'))) {
      return (Resolve-Path $candidate).Path
    }
  }

  throw "No valid GStack source found. Set GSTACK_SOURCE or pass -GstackSource."
}

function Get-GitBashPath {
  $candidates = @(
    'C:\Program Files\Git\bin\bash.exe',
    'C:\Program Files\Git\usr\bin\bash.exe'
  )

  foreach ($candidate in $candidates) {
    if (Test-Path $candidate) {
      return $candidate
    }
  }

  throw "Git Bash not found. Install Git for Windows so setup can run."
}

function Convert-ToGitBashPath {
  param([string]$WindowsPath)

  $normalized = $WindowsPath -replace '\\', '/'
  if ($normalized -match '^([A-Za-z]):/(.*)$') {
    return "/$($matches[1].ToLower())/$($matches[2])"
  }

  return $normalized
}

function Ensure-Junction {
  param(
    [string]$LinkPath,
    [string]$TargetPath
  )

  if (Test-Path $LinkPath) {
    $item = Get-Item $LinkPath -Force
    $target = $null
    if ($item.Target) {
      $target = @($item.Target)[0]
    }

    if ($target) {
      try {
        $resolvedTarget = (Resolve-Path $target).Path
        if ($resolvedTarget -eq $TargetPath) {
          return
        }
      } catch {
      }
    }

    throw "Path already exists and points somewhere else: $LinkPath"
  }

  New-Item -ItemType Junction -Path $LinkPath -Target $TargetPath | Out-Null
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$sourceRoot = Resolve-GstackSource -ExplicitSource $GstackSource
$gitBash = Get-GitBashPath
$agentsSkillsDir = Join-Path $repoRoot '.agents\skills'
$repoGstackPath = Join-Path $agentsSkillsDir 'gstack'

Write-Host "Repo root: $repoRoot"
Write-Host "GStack source: $sourceRoot"

if ($CheckOnly) {
  Write-Host 'Check complete.'
  exit 0
}

New-Item -ItemType Directory -Force -Path $agentsSkillsDir | Out-Null
Ensure-Junction -LinkPath $repoGstackPath -TargetPath $sourceRoot

$bashRepoGstackPath = Convert-ToGitBashPath $repoGstackPath
$setupCommand = "cd '$bashRepoGstackPath' && ./setup --host codex --quiet"

Write-Host 'Running GStack Codex setup for this project...'
& $gitBash -lc $setupCommand
if ($LASTEXITCODE -ne 0) {
  throw "GStack setup failed with exit code $LASTEXITCODE"
}

$expectedSkills = @(
  'gstack-review',
  'gstack-qa',
  'gstack-investigate'
)

$missing = @()
foreach ($skill in $expectedSkills) {
  if (-not (Test-Path (Join-Path $agentsSkillsDir $skill))) {
    $missing += $skill
  }
}

if ($missing.Count -gt 0) {
  throw "Setup finished, but these repo-local skills are missing: $($missing -join ', ')"
}

Write-Host ''
Write-Host 'GStack is now wired into this project.'
Write-Host 'Open a new Codex session or restart the current one to load the new repo-local skills.'
