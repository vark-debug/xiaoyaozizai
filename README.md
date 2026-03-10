# 逍遥字在

**Adobe Premiere Pro 字体检测工具**

上传 `.prproj` 项目文件，自动识别项目中使用的全部字体，并提供中文名称、下载地址和授权信息。所有处理均在本地浏览器完成，文件不会上传到任何服务器。

🔗 在线访问：[https://vark-debug.github.io/xiaoyaozizai](https://vark-debug.github.io/xiaoyaozizai)

## 功能特性

- 支持拖拽或点击上传 `.prproj` 文件
- 自动解压（GZIP / ZIP 格式均支持）并解析 XML 内容
- 识别字体技术命名，映射为中文标准名称
- 显示每个字体的下载地址与授权协议
- 完全本地处理，无需后端，隐私安全
- 支持亮色 / 暗色主题切换

## 技术栈

- **框架**：Next.js 16 (静态导出)
- **UI**：shadcn/ui + Tailwind CSS v4
- **解压**：fflate（浏览器原生兼容）
- **部署**：GitHub Pages + GitHub Actions
- **语言**：TypeScript

## 本地开发

```bash
# 安装 pnpm（如未安装）
brew install pnpm

# 安装依赖
pnpm install

# 启动开发服务器
pnpm next dev -p 3000
```

打开 [http://localhost:3000](http://localhost:3000) 查看。

## 构建与预览

```bash
# 构建静态文件（输出到 ./out/）
pnpm next build

# 本地预览构建产物
npx serve out
```

## 部署到 GitHub Pages

推送到 `main` 分支后，GitHub Actions 会自动构建并部署。

手动配置步骤：

1. 进入仓库 **Settings → Pages**
2. Source 选择 **GitHub Actions**
3. 推送代码，等待 Actions 完成即可

## 项目结构

```
src/
├── app/
│   ├── page.tsx          # 主页面
│   ├── layout.tsx        # 根布局
│   ├── globals.css       # 全局样式
│   └── robots.ts         # robots.txt
├── components/
│   ├── FileUpload.tsx    # 文件上传组件
│   ├── ProcessingSteps.tsx
│   └── ui/               # shadcn/ui 基础组件
└── lib/
    ├── file-processor.ts # 文件解压处理（浏览器端）
    ├── font-extractor.ts # XML 字体提取
    ├── font-deep-scan.ts # 深度扫描
    ├── font-mapper.ts    # 字体名称映射
    └── utils.ts
```

