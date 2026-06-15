@echo off
cd /d C:\Users\hoo\Documents\metarich-signal-projec\insurance-manager
del .git\index.lock 2>nul
git add app/coverage-pro/components/AnalysisChart.tsx app/coverage-pro/components/BenchmarkSummary.tsx
git commit -m "fix: web UI status display - remove text from AnalysisChart and BenchmarkSummary"
git push
echo.
echo === DONE ===
pause
