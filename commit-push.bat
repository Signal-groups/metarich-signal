@echo off
setlocal
cd /d "%~dp0"

echo.
echo ========================================
echo  Metarich Signal - commit and push
echo ========================================
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Git was not found. Please check Git installation or PATH.
  echo.
  pause
  exit /b 1
)

git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
  echo [ERROR] This folder is not a Git repository.
  echo Current path: %CD%
  echo.
  pause
  exit /b 1
)

for /f "delims=" %%B in ('git branch --show-current') do set "CURRENT_BRANCH=%%B"
if "%CURRENT_BRANCH%"=="" set "CURRENT_BRANCH=main"

if exist ".git\index.lock" (
  echo [INFO] Removing old Git lock: index.lock
  del /f /q ".git\index.lock" >nul 2>nul
)

if exist ".git\HEAD.lock" (
  echo [INFO] Removing old Git lock: HEAD.lock
  del /f /q ".git\HEAD.lock" >nul 2>nul
)

echo Current branch: %CURRENT_BRANCH%
echo.
echo Changed files:
git status --short
echo.

git status --porcelain > "%TEMP%\metarich_git_status.txt"
for %%A in ("%TEMP%\metarich_git_status.txt") do set "STATUS_SIZE=%%~zA"

if "%STATUS_SIZE%"=="0" (
  echo No local changes. Pushing current branch only.
  echo.