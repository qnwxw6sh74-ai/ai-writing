import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 服务器内存仅 1.6GB，跳过构建时 TS 类型检查（本地已验证零错误）
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
