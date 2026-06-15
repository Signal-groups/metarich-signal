import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // ExcelJS uses Node.js fs/path directly - exclude from webpack bundling
  serverExternalPackages: ['exceljs'],
};

export default nextConfig;
