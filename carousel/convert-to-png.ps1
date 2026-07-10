# MetaRich Signal — 인스타그램 캐러셀 PNG 변환기
# 실행 방법: 이 파일을 더블클릭하거나 PowerShell에서 실행
# 조건: Google Chrome 설치 필요

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$OutputDir = Join-Path $ScriptDir "output"

# Chrome 경로 자동 탐색
$ChromePaths = @(
    "C:\Program Files\Google\Chrome\Application\chrome.exe",
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)
$Chrome = $ChromePaths | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $Chrome) {
    Write-Host "❌ Chrome을 찾을 수 없습니다. Chrome을 설치하거나 스크립트 내 경로를 수정하세요." -ForegroundColor Red
    pause
    exit
}

Write-Host "✅ Chrome 발견: $Chrome" -ForegroundColor Green
Write-Host ""

$Series = @("branding", "renewal")
$TotalCount = 0
$DoneCount  = 0

foreach ($Series in $Series) {
    $SeriesDir = Join-Path $OutputDir $Series
    $HtmlFiles = Get-ChildItem "$SeriesDir\card-*.html" | Sort-Object Name

    Write-Host "📂 [$Series] 변환 시작 ($($HtmlFiles.Count)장)..." -ForegroundColor Cyan

    foreach ($Html in $HtmlFiles) {
        $PngPath = $Html.FullName -replace "\.html$", ".png"
        $FileUrl  = "file:///" + ($Html.FullName -replace "\\", "/")
        $TotalCount++

        & $Chrome `
            --headless=new `
            --disable-gpu `
            --no-sandbox `
            --window-size=1080,1080 `
            "--screenshot=$PngPath" `
            "--default-background-color=FFFFFFFF" `
            $FileUrl 2>$null

        if (Test-Path $PngPath) {
            Write-Host "  ✅ $($Html.Name) → $($Html.BaseName).png" -ForegroundColor Green
            $DoneCount++
        } else {
            Write-Host "  ❌ $($Html.Name) 변환 실패" -ForegroundColor Red
        }
        Start-Sleep -Milliseconds 800
    }
    Write-Host ""
}

Write-Host "═══════════════════════════════════════" -ForegroundColor Yellow
Write-Host "  완료: $DoneCount / $TotalCount 장 변환 성공" -ForegroundColor Yellow
Write-Host "  저장 위치: $OutputDir" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""
pause
