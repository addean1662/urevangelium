# Phase 1 source acquisition — download Greek lexicon, tagged Greek NT, Latin lexicon, and CNTR papyri.
# Run from the project root: powershell -File scripts\download-sources.ps1
$ErrorActionPreference = 'Continue'
$root = Split-Path $PSScriptRoot

New-Item -ItemType Directory -Force -Path "$root\data\sources\greek-shared" | Out-Null
New-Item -ItemType Directory -Force -Path "$root\data\sources\earliest-papyrus" | Out-Null

$CNTR = 'https://raw.githubusercontent.com/Center-for-New-Testament-Restoration/transcriptions/master/class%201'

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
  },
  # ── CNTR Gospel papyri (CC BY-SA 4.0) ────────────────────────────────────────
  @{ Name = 'CNTR P1   (Matthew 1, c. 250 CE)';            Url = "$CNTR/P1.txt";   Out = "$root\data\sources\earliest-papyrus\P1.txt" },
  @{ Name = 'CNTR P4   (Luke, c. 150-200 CE)';             Url = "$CNTR/P4.txt";   Out = "$root\data\sources\earliest-papyrus\P4.txt" },
  @{ Name = 'CNTR P5   (John, c. 250-300 CE)';             Url = "$CNTR/P5.txt";   Out = "$root\data\sources\earliest-papyrus\P5.txt" },
  @{ Name = 'CNTR P22  (John, c. 250-300 CE)';             Url = "$CNTR/P22.txt";  Out = "$root\data\sources\earliest-papyrus\P22.txt" },
  @{ Name = 'CNTR P28  (John, c. 250-300 CE)';             Url = "$CNTR/P28.txt";  Out = "$root\data\sources\earliest-papyrus\P28.txt" },
  @{ Name = 'CNTR P37  (Matthew, c. 250-300 CE)';          Url = "$CNTR/P37.txt";  Out = "$root\data\sources\earliest-papyrus\P37.txt" },
  @{ Name = 'CNTR P39  (John, c. 200-250 CE)';             Url = "$CNTR/P39.txt";  Out = "$root\data\sources\earliest-papyrus\P39.txt" },
  @{ Name = 'CNTR P45  (Gospels+Acts, c. 200-250 CE)';     Url = "$CNTR/P45.txt";  Out = "$root\data\sources\earliest-papyrus\P45.txt" },
  @{ Name = 'CNTR P52  (John 18, c. 125-175 CE)';          Url = "$CNTR/P52.txt";  Out = "$root\data\sources\earliest-papyrus\P52.txt" },
  @{ Name = 'CNTR P53  (Matthew+Acts, c. 250 CE)';         Url = "$CNTR/P53.txt";  Out = "$root\data\sources\earliest-papyrus\P53.txt" },
  @{ Name = 'CNTR P64+P67 (Matthew frags, c. 200 CE)';     Url = "$CNTR/P64.txt";  Out = "$root\data\sources\earliest-papyrus\P64.txt" },  # P67 (Barcelona) included in P64 file
  @{ Name = 'CNTR P66  (John, c. 175-225 CE)';             Url = "$CNTR/P66.txt";  Out = "$root\data\sources\earliest-papyrus\P66.txt" },
  @{ Name = 'CNTR P70  (Matthew, c. 175-225 CE)';          Url = "$CNTR/P70.txt";  Out = "$root\data\sources\earliest-papyrus\P70.txt" },
  @{ Name = 'CNTR P75  (Luke+John, c. 175-225 CE)';        Url = "$CNTR/P75.txt";  Out = "$root\data\sources\earliest-papyrus\P75.txt" },
  @{ Name = 'CNTR P77  (Matthew, c. 150-250 CE)';          Url = "$CNTR/P77.txt";  Out = "$root\data\sources\earliest-papyrus\P77.txt" },
  @{ Name = 'CNTR P88  (Mark 2, c. 4th c. CE)';            Url = "$CNTR/P88.txt";  Out = "$root\data\sources\earliest-papyrus\P88.txt" },
  @{ Name = 'CNTR P90  (John 18-19, c. 150-200 CE)';       Url = "$CNTR/P90.txt";  Out = "$root\data\sources\earliest-papyrus\P90.txt" },
  @{ Name = 'CNTR P95  (John, c. 250-300 CE)';             Url = "$CNTR/P95.txt";  Out = "$root\data\sources\earliest-papyrus\P95.txt" },
  @{ Name = 'CNTR P104 (Matthew 21, c. 125-150 CE)';       Url = "$CNTR/P104.txt"; Out = "$root\data\sources\earliest-papyrus\P104.txt" }
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
