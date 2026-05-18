param(
  [string]$OutFile = "data/galgame_list.json",
  [string]$MetaFile = "data/galgame_meta.json",
  [string]$CacheFile = "data/galgame_details_cache.json",
  [int]$MaxPages = 0,
  [int]$DelayMs = 250,
  [int]$ApiConcurrency = 8,
  [switch]$SkipHydrate
)

$ErrorActionPreference = "Stop"

$script = Join-Path $PSScriptRoot "fetch-galgame-data.mjs"
$args = @(
  $script,
  "--out", $OutFile,
  "--meta", $MetaFile,
  "--cache", $CacheFile,
  "--delay-ms", [string]$DelayMs,
  "--api-concurrency", [string]$ApiConcurrency
)

if ($MaxPages -gt 0) {
  $args += @("--max-pages", [string]$MaxPages)
}

if ($SkipHydrate) {
  $args += "--skip-hydrate"
}

& node $args
