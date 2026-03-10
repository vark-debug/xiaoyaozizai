import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 静态导出配置，用于 GitHub Pages 托管
  output: 'export',
  // 如果 GitHub 仓库名不是 <用户名>.github.io，需要设置 basePath
  // 例如仓库名为 my-repo，则取消下面这行注释并改为对应名称：
  basePath: '/xiaoyaozizai',
  trailingSlash: true,
  images: {
    // 静态导出模式下需要禁用图片优化（或使用第三方 loader）
    unoptimized: true,
  },
};

export default nextConfig;
