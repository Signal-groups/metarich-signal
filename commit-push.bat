@echo off
chcp 65001 >nul
cd /d "%~dp0"

if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"

echo.
echo ========================================
echo  Metarich Signal commit + push
echo ========================================
echo.

git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
  echo [ERROR] 이 폴더는 Git 저장소가 아닙니다.
  pause
  exit /b 1
)

echo 현재 브랜치:
git branch --show-current
echo.

echo 변경 파일:
git status --short
echo.

git add -A

git diff --cached --quiet
if not errorlevel 1 (
  echo 커밋할 변경사항이 없습니다. 푸시만 확인합니다.
  git push origin main
  pause
  exit /b %errorlevel%
)

set /p COMMIT_MSG=커밋 메시지를 입력하세요 (Enter=자동 메시지): 
if "%COMMIT_MSG%"=="" set "COMMIT_MSG=chore: update insurance manager"

git commit -m "%COMMIT_MSG%"
if errorlevel 1 (
  echo [ERROR] 커밋에 실패했습니다.
  pause
  exit /b 1
)

git push origin main
if errorlevel 1 (
  echo [ERROR] 푸시에 실패했습니다. GitHub 로그인 또는 권한을 확인해주세요.
  pause
  exit /b 1
)

echo.
echo 완료되었습니다. Vercel 배포가 시작됩니다.
echo.

pause
