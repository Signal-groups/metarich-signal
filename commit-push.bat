@echo off
cd /d "%~dp0"

if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"

del /f /q dev-server-3001.err.log 2>nul
del /f /q dev-server-3001.out.log 2>nul
del /f /q dev-server-3002.err.log 2>nul
del /f /q dev-server-3002.out.log 2>nul
del /f /q dev-server.err.log 2>nul
del /f /q dev-server.out.log 2>nul
del /f /q next-dev-3000.err.log 2>nul
del /f /q next-dev-3000.log 2>nul
del /f /q gpts-instruction-short.txt 2>nul
del /f /q gpts-instructions-v3.md 2>nul
del /f /q gpts-instructions-v4-compact.md 2>nul
del /f /q gpts-instructions-v4-gpt-field.md 2>nul
del /f /q gpts-instructions-v4.md 2>nul
del /f /q gpts-reference-guide.html 2>nul
del /f /q REBUILD_PLAN.md 2>nul
del /f /q STAFF_MANAGEMENT_SPEC.md 2>nul
del /f /q CRM_WORK_STATUS.md 2>nul
del /f /q supabase_cleanup.sql 2>nul
del /f /q supabase_rollback.sql 2>nul
del /f /q dm_content_usage_logs.sql 2>nul
del /f /q upload_analyses.sql 2>nul
del /f /q git-push.bat 2>nul
if exist "tmp_pdf_pages" rmdir /s /q "tmp_pdf_pages"

git add -A
git commit -m "feat: fix first-coverage-check always visible for office users + robot surgery item"
git push origin main

pause
