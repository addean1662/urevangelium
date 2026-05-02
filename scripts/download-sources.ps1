# Phase 1 source acquisition — download Greek lexicon, tagged Greek NT, and Latin lexicon.
# Run from the project root: powershell -File scripts\download-sources.ps1
$ErrorActionPreference = 'Continue'
$root = Split-Path $PSScriptRoot

New-Item -ItemType Directory -Force -Path "$root\data\sources\greek-shared" | Out-Null

$files = @(
  @{
    Name = 'TBESG (Strong->Greek gloss)'
    Url  = 'https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master/Lexicons/TBESG%20-%20Translators%20Brief%20lexicon%20of%20Extended%20Strongs%20for%20Greek%20-%20STEPBible.org%20CC%20BY.txt'
    Out  = "$root\data\sources\greek-shared\TBESG-CC-BY.txt"
  },
  @{
    Name = 'TAGNT Mat-Jhn (tagged Greek NT)'
    Url  = 'https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master/Translators%20Amalgamated%20OT%2BNT/TAGNT%20Mat-Jhn%20-%20Translators%20Amalgamated%20Greek%20NT%20-%20STEPBible.org%20CC-BY.txt'
    Out  = "$root\data\sources\greek-shared\TAGNT-Mat-Jhn-CC-BY.txt"
  },
  @{
    Name = "Whitaker's DICTLINE.GEN (Latin lexicon)"
    Url  = 'https://raw.githubusercontent.com/mk270/whitakers-words/master/DICTLINE.GEN'
    Out  = "$root\data\sources\vulgate\DICTLINE.GEN"
  }
)

foreach ($f in $files) {
  Write-Host "Downloading $($f.Name)..."
  try {
    Invoke-WebRequest -Uri $f.Url -OutFile $f.Out -UseBasicParsing
    $size = (Get-Item $f.Out).Length
    Write-Host "  OK  $size bytes  ->  $($f.Out)"
  } catch {
    Write-Warning "  FAILED: $($_.Exception.Message)"
    Write-Warning "  URL: $($f.Url)"
  }
}

Write-Host "`nDone."
