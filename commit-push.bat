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
  git push origin %CURRENT_BRANCH%
  if errorlevel 1 goto PUSH_ERROR
  goto DONE
)

set /p CONFIRM=Commit and push all changed files? (Y/N): 
if /i not "%CONFIRM%"=="Y" (
  echo Canceled.
  echo.
  pause
  exit /b 0
)

echo.
echo Staging changes...
git add -A
if errorlevel 1 goto ADD_ERROR

git diff --cached --quiet
if not errorlevel 1 (
  echo No staged changes. Pushing current branch only.
  echo.
  git push origin %CURRENT_BRANCH%
  if errorlevel 1 goto PUSH_ERROR
  goto DONE
)

echo.
set /p COMMIT_MSG=Commit message (Enter=auto message): 
if "%COMMIT_MSG%"=="" set "COMMIT_MSG=chore: update insurance manager"

echo.
echo Creating commit...
git commit -m "%COMMIT_MSG%"
if errorlevel 1 goto COMMIT_ERROR

echo.
echo Pushing to GitHub...
git push origin %CURRENT_BRANCH%
if errorlevel 1 goto PUSH_ERROR

:DONE
echo.
echo Done. Vercel deployment will start automatically.
echo.
pause
exit /b 0

:ADD_ERROR
echo.
echo [ERROR] Failed to stage changes.
goto END_ERROR

:COMMIT_ERROR
echo.
echo [ERROR] Failed to create commit.
goto END_ERROR

:PUSH_ERROR
echo.
echo [ERROR] Failed to push.
echo Please check GitHub login, permission, and network.
goto END_ERROR

:END_ERROR
echo.
echo Current Git status:
git status --short --branch
echo.
pause
exit /b 1
