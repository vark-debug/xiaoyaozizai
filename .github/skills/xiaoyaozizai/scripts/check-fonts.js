#!/usr/bin/env node
/**
 * 逍遥字在 CLI — 检测 .prproj 文件中使用的字体
 *
 * 用法：
 *   node check-fonts.js <path/to/file.prproj>
 *   node check-fonts.js <path/to/file.prproj> --json
 *
 * 输出：
 *   默认：人类可读的字体报告（中文名、技术名、下载地址、授权）
 *   --json：JSON 数组，方便上游 agent 解析
 *
 * 依赖：零外部依赖，仅使用 Node.js 内置模块（fs / path / zlib）
 * 数据：字体映射数据库已内置于 ../data/output.json
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

// ─── 路径 ────────────────────────────────────────────────────────────────────
const SCRIPT_DIR   = __dirname;
const OUTPUT_JSON  = path.resolve(SCRIPT_DIR, '..', 'data', 'output.json');

// ─── 参数解析 ─────────────────────────────────────────────────────────────────
const args     = process.argv.slice(2).filter(a => !a.startsWith('--'));
const flags    = process.argv.slice(2).filter(a => a.startsWith('--'));
const jsonMode = flags.includes('--json');

if (args.length === 0) {
  console.error('用法: node check-fonts.js <path/to/file.prproj> [--json]');
  process.exit(1);
}

const filePath = path.resolve(args[0]);

if (!fs.existsSync(filePath)) {
  console.error(`文件不存在: ${filePath}`);
  process.exit(1);
}

if (!filePath.toLowerCase().endsWith('.prproj')) {
  console.error('请传入 .prproj 文件');
  process.exit(1);
}

// ─── 加载字体映射数据库 ───────────────────────────────────────────────────────
function loadFontMap() {
  if (!fs.existsSync(OUTPUT_JSON)) {
    console.error(`找不到字体映射数据库: ${OUTPUT_JSON}`);
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(OUTPUT_JSON, 'utf8'));
  const map  = new Map();

  for (const fontItem of data['字体数据'] || []) {
    const fileBaseName = (fontItem['文件名'] || '').replace(/\.[^.]+$/, '');
    for (const info of fontItem['字体信息'] || []) {
      const chineseName    = info['中文标准命名'] || fileBaseName;
      const technicalNames = info['技术命名(nameID=6)'] || '';
      const downloadUrl    = info['下载地址']  || '';
      const license        = info['授权标准']  || '';

      for (const name of technicalNames.split(',').map(n => n.trim()).filter(Boolean)) {
        map.set(name, { chineseName, downloadUrl, license });
      }
    }
  }
  return map;
}

function getFontInfo(fontName, fontMap) {
  const info = fontMap.get(fontName);
  if (info) return info;
  // 忽略大小写二次查找
  for (const [key, val] of fontMap) {
    if (key.toLowerCase() === fontName.toLowerCase()) return val;
  }
  return { chineseName: fontName, downloadUrl: '', license: '未知' };
}

// ─── 解压 .prproj ─────────────────────────────────────────────────────────────
function decompress(filePath) {
  const buf = fs.readFileSync(filePath);

  // GZIP: 1f 8b
  if (buf[0] === 0x1f && buf[1] === 0x8b) {
    return zlib.gunzipSync(buf).toString('utf8');
  }

  // ZIP: PK (50 4b) — 纯内置实现，解析 Local File Header
  if (buf[0] === 0x50 && buf[1] === 0x4b) {
    // Local File Header 结构（偏移量均基于条目起始位置）：
    //  0- 3: 签名 50 4B 03 04
    //  8- 9: 压缩方式（0=存储, 8=Deflate）
    // 14-17: CRC-32
    // 18-21: 压缩后大小
    // 22-25: 原始大小
    // 26-27: 文件名长度
    // 28-29: 扩展字段长度
    // 30+  : 文件名 + 扩展字段 + 数据
    if (buf[2] !== 0x03 || buf[3] !== 0x04) throw new Error('无效的 ZIP Local File Header');
    const compression    = buf.readUInt16LE(8);
    const compressedSize = buf.readUInt32LE(18);
    const fileNameLen    = buf.readUInt16LE(26);
    const extraLen       = buf.readUInt16LE(28);
    const dataOffset     = 30 + fileNameLen + extraLen;
    const compressedData = buf.slice(dataOffset, dataOffset + compressedSize);

    let raw;
    if (compression === 0) {
      raw = compressedData;                          // 无压缩（Stored）
    } else if (compression === 8) {
      raw = zlib.inflateRawSync(compressedData);     // Deflate（内置）
    } else {
      console.error(`不支持的 ZIP 压缩方式: ${compression}`);
      process.exit(1);
    }
    return raw.toString('utf8');
  }

  // 兜底：直接当 UTF-8 文本
  return buf.toString('utf8');
}

// ─── 基础扫描（移植自 font-extractor.ts）────────────────────────────────────
function baseScanFonts(xmlContent, fontMap) {
  const MAX_B64 = 10000;
  const results = [];
  const seen    = new Set();

  function decodeBase64Utf8(b64) {
    return Buffer.from(b64, 'base64').toString('utf8');
  }

  function extractFontAndText(decoded) {
    let fontName    = null;
    let textContent = null;

    const patterns = [
      /[A-Z][A-Z0-9]{2,}(?:-[A-Z0-9]+)*/g,
      /[A-Z][a-zA-Z0-9]{2,}(?:-[a-zA-Z0-9]+)*(?:-GB|-CN|-SC|-TC|-JP)?/g,
    ];
    const possibleFonts = [];
    for (const pat of patterns) {
      let m;
      pat.lastIndex = 0;
      while ((m = pat.exec(decoded)) !== null) {
        if (m[0].length >= 4 && !m[0].includes('AAAA')) {
          possibleFonts.push(m[0]);
        }
      }
    }

    const chineseMatches = decoded.match(/[\u4e00-\u9fa5]+/g);
    if (chineseMatches) textContent = chineseMatches.join('');

    if (possibleFonts.length > 0) {
      const preferred = possibleFonts.filter(f => /-[A-Z]{2}$/.test(f));
      fontName = preferred.length > 0
        ? preferred[0]
        : possibleFonts.sort((a, b) => b.length - a.length)[0];
    }

    return { fontName, textContent };
  }

  function tryBase64(b64, source) {
    if (!b64 || b64.length > MAX_B64) return;
    try {
      const decoded = decodeBase64Utf8(b64);
      const { fontName, textContent } = extractFontAndText(decoded);
      if (fontName && !seen.has(fontName)) {
        seen.add(fontName);
        const info = getFontInfo(fontName, fontMap);
        results.push({ fontName, textContent: textContent || '', source, ...info });
      }
    } catch (_) { /* ignore */ }
  }

  // 方法1：<Name>源文本</Name> + StartKeyframeValue
  const pat1 = /<Name>源文本<\/Name>[\s\S]*?<StartKeyframeValue\s+Encoding="base64"[^>]*>([^<]+)<\/StartKeyframeValue>/g;
  let m;
  while ((m = pat1.exec(xmlContent)) !== null) tryBase64(m[1].trim(), '基础扫描');

  // 方法2：FormattedTextData
  const pat2 = /<FormattedTextData\s+Encoding="base64"[^>]*>([^<]+)<\/FormattedTextData>/g;
  while ((m = pat2.exec(xmlContent)) !== null) tryBase64(m[1].trim(), '基础扫描');

  // 方法3：兜底，所有 StartKeyframeValue（仅当前两种方法无结果时）
  if (results.length === 0) {
    const pat3 = /<StartKeyframeValue\s+Encoding="base64"[^>]*>([^<]+)<\/StartKeyframeValue>/g;
    while ((m = pat3.exec(xmlContent)) !== null) tryBase64(m[1].trim(), '基础扫描(兜底)');
  }

  return results;
}

// ─── 深度扫描（移植自 font-deep-scan.ts）────────────────────────────────────
function deepScanFonts(xmlContent, fontMap) {
  const fontMap2 = new Map(); // name -> { fontName, textContent }

  const blockPat = /<ArbVideoComponentParam[^>]*>([\s\S]*?)<\/ArbVideoComponentParam>/g;
  let bm;
  while ((bm = blockPat.exec(xmlContent)) !== null) {
    const block     = bm[1];
    const nameMatch = block.match(/<Name>\s*([^<]+?)\s*<\/Name>/);
    if (!nameMatch) continue;
    const name = nameMatch[1].trim();

    const startTagMatch = block.match(/<StartKeyframeValue[^>]*Encoding="base64"[^>]*>/);
    if (!startTagMatch) continue;

    const startIdx  = startTagMatch.index + startTagMatch[0].length;
    const endIdx    = block.indexOf('</StartKeyframeValue>', startIdx);
    if (endIdx === -1) continue;

    const b64 = block.substring(startIdx, endIdx).trim();
    if (b64.length > 10000) continue;

    try {
      const buf     = Buffer.from(b64, 'base64');
      const decoded = buf.toString('utf16le').trim();

      if (!decoded.startsWith('{"capPropFontEdit"')) continue;

      const json     = JSON.parse(decoded);
      const fontName = json.fontEditValue?.[0] || null;
      const textContent = json.textEditValue || null;

      fontMap2.set(name, { fontName, textContent });
    } catch (_) { /* ignore */ }
  }

  const results = [];
  const seen    = new Set();
  for (const [, data] of fontMap2) {
    if (data.fontName && !seen.has(data.fontName)) {
      seen.add(data.fontName);
      const info = getFontInfo(data.fontName, fontMap);
      results.push({
        fontName: data.fontName,
        textContent: data.textContent || '',
        source: '深度扫描',
        ...info,
      });
    }
  }
  return results;
}

// ─── 合并去重 ─────────────────────────────────────────────────────────────────
function mergeResults(base, deep) {
  const seen = new Set();
  const all  = [];
  for (const item of [...base, ...deep]) {
    if (!seen.has(item.fontName)) {
      seen.add(item.fontName);
      all.push(item);
    }
  }
  return all;
}

// ─── 主逻辑 ───────────────────────────────────────────────────────────────────
const fontMap   = loadFontMap();
const xml       = decompress(filePath);
const baseFonts = baseScanFonts(xml, fontMap);
const deepFonts = deepScanFonts(xml, fontMap);
const fonts     = mergeResults(baseFonts, deepFonts);

if (jsonMode) {
  console.log(JSON.stringify(fonts, null, 2));
  process.exit(0);
}

// 人类可读输出
const fileName = path.basename(filePath);
console.log(`\n📂 项目文件：${fileName}`);
console.log(`🔍 共检测到 ${fonts.length} 个字体\n`);

if (fonts.length === 0) {
  console.log('未检测到字体（可能项目中没有使用文字图层）');
  process.exit(0);
}

for (let i = 0; i < fonts.length; i++) {
  const f = fonts[i];
  console.log(`【${i + 1}】${f.chineseName}`);
  console.log(`    技术命名：${f.fontName}`);
  if (f.textContent) console.log(`    使用文字：${f.textContent.slice(0, 60)}`);
  if (f.downloadUrl) console.log(`    下载地址：${f.downloadUrl}`);
  if (f.license)     console.log(`    授权协议：${f.license}`);
  console.log();
}
