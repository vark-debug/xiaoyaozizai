---
name: xiaoyaozizai
description: '检测 Adobe Premiere Pro .prproj 文件中使用的字体。当用户要求"检查/分析某个 prproj 文件使用了哪些字体"、"这个 PR 项目用了什么字体"、"帮我找出 Premiere 项目的字体"时使用。可直接运行内置脚本，无需浏览器，立即返回字体中文名、技术命名、下载地址和授权信息。'
argument-hint: '.prproj 文件的路径，例如：/Users/me/project.prproj'
---

# 逍遥字在 — 字体检测能力

检测 Adobe Premiere Pro `.prproj` 项目文件中使用的所有字体，返回中文名称、技术命名、下载地址和授权信息。

**完全自包含：零外部依赖（仅 Node.js 内置模块），字体数据库已内置于 `data/output.json`。**  
任何装有 Node.js 18+ 的环境均可直接运行，无需 `npm install`。

---

## 安装到其他 Agent

### 个人级（跨工作区生效）

```bash
cp -r /path/to/this/skill ~/.copilot/skills/xiaoyaozizai
```

之后在任意工作区中，agent 都能识别并调用该 skill。

### 项目级（仅当前项目）

将整个 `xiaoyaozizai/` 文件夹放入目标项目的 `.github/skills/` 目录即可：

```
your-project/
└── .github/
    └── skills/
        └── xiaoyaozizai/
            ├── SKILL.md          ← skill 入口
            ├── scripts/
            │   └── check-fonts.js
            └── data/
                └── output.json   ← 字体数据库，已内置
```

**所需文件仅这三个，不依赖任何其他文件。**

---

## 使用方法

agent 会自动构造命令并执行，也可以手动调用：

### 人类可读输出

```bash
node /path/to/skills/xiaoyaozizai/scripts/check-fonts.js <prproj文件路径>
```

### JSON 输出（供程序解析）

```bash
node /path/to/skills/xiaoyaozizai/scripts/check-fonts.js <prproj文件路径> --json
```

---

## 输出格式

### 人类可读
```
📂 项目文件：my-project.prproj
🔍 共检测到 3 个字体

【1】思源黑体 CN
    技术命名：SourceHanSansCN-Regular
    使用文字：片头标题文字内容
    下载地址：https://github.com/adobe-fonts/source-han-sans
    授权协议：SIL Open Font License
```

### JSON 结构
```json
[
  {
    "fontName": "SourceHanSansCN-Regular",
    "chineseName": "思源黑体 CN",
    "downloadUrl": "https://...",
    "license": "SIL Open Font License",
    "textContent": "片头标题",
    "source": "深度扫描"
  }
]
```

---

## 技术说明

- **运行环境：** Node.js 18+，零外部依赖
- **支持格式：** GZIP（内置 `zlib.gunzipSync`）、ZIP（内置 `zlib.inflateRawSync` + 手写 Local File Header 解析）
- **字体数据库：** `data/output.json`，独立于原项目，可单独更新
- **扫描策略：** 基础扫描（UTF-8 base64）+ 深度扫描（UTF-16LE JSON）

---

## 更新字体数据库

字体数据库位于 [`data/output.json`](../data/output.json)，结构如下：

```json
{
  "字体数据": [
    {
      "文件名": "SourceHanSansCN.otf",
      "字体信息": [
        {
          "子字体索引": 0,
          "中文标准命名": "思源黑体 CN",
          "技术命名(nameID=6)": "SourceHanSansCN-Regular",
          "下载地址": "https://...",
          "授权标准": "SIL Open Font License"
        }
      ]
    }
  ]
}
```

若在原项目（`src/output.json`）中更新了数据库，需同步覆盖 skill 目录中的 `data/output.json`：

```bash
cp src/output.json .github/skills/xiaoyaozizai/data/output.json
```
