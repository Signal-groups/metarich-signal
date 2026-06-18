@echo off
del /f ".git\index.lock" 2>nul
git add app/api/coverage-pro/pdf-export/route.ts app/coverage-pro/components/ContractList.tsx app/coverage-pro/components/CoverageProWorkspace.tsx lib/coverageAnalysis/clientMapping.ts lib/coverageAnalysis/excelTemplate.ts lib/coverageAnalysis/types.ts
git commit -m "feat: GPTs JSON 파서 강화(coverage_summary 지원) + 보장성/저축성 체크 + ContractList 인라인 편집 + Excel x10000 단위 + PDF route.ts 간병합계 제거"
git push
pause
