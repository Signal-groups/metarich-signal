@echo off
del /f ".git\index.lock" 2>nul
git add lib/coverageAnalysis/clientMapping.ts lib/coverageAnalysis/excelTemplate.ts
git commit -m "fix: Excel amount unit x10000 + remove extra sheets from output"
git push
pause
