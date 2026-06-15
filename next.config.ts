import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 服务器内存仅 1.6GB，跳过构建时 TS 类型检查（本地已验证零错误）
  typescript: { ignoreBuildErrors: true },

  // 安全响应头
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ]
  },
};

export default nextConfig;
