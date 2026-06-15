import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  serverExternalPackages: ["exceljs"],
  outputFileTracingIncludes: {
    "/api/coverage-pro/excel-export": ["./public/templates/coverage/*.xlsx"],
  },
};

export default nextConfig;
