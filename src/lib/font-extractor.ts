/**
 * 字体提取模块
 * 从 PR 项目 XML 中提取字体信息
 */

import { getFontInfo } from './font-mapper';
import { deepScanFonts, mergeScanResults } from './font-deep-scan';

export interface FontInfo {
  fontName: string;       // 技术命名，如 DOUYINSANSBOLD-GB
  chineseName: string;    // 中文标准命名，如 抖音美好体
  downloadUrl: string;    // 下载地址
  license: string;        // 授权标准
  textContent: string;    // 文本内容，如 钝角先生
  source?: string;        // 来源标记
}

/**
 * 从解码后的 base64 数据中提取字体名称和文本内容
 */
function extractFontAndText(decodedData: string): { fontName: string | null; textContent: string | null } {
  let fontName: string | null = null;
  let textContent: string | null = null;
  
  // 提取字体名称（通常是大写字母和数字组成的标识符，如 DOUYINSANSBOLD-GB）
  // 字体名称通常在解码数据的某个位置，格式类似 FONTNAME 或 FONTNAME-STYLE
  const fontPatterns = [
    /[A-Z][A-Z0-9]{2,}(?:-[A-Z0-9]+)*/g,  // 匹配 DOUYINSANSBOLD-GB 格式
    /[A-Z][a-zA-Z0-9]{2,}(?:-[a-zA-Z0-9]+)*(?:-GB|-CN|-SC|-TC|-JP)?/g,  // 匹配带中文标识的字体
  ];
  
  // 收集所有可能的字体名称
  const possibleFonts: string[] = [];
  for (const pattern of fontPatterns) {
    const matches = decodedData.match(pattern);
    if (matches) {
      for (const match of matches) {
        // 过滤掉太短或明显不是字体的匹配
        if (match.length >= 4 && !match.startsWith('AAAA') && !match.includes('AAAA')) {
          possibleFonts.push(match);
        }
      }
    }
  }
  
  // 提取中文文本内容
  const chinesePattern = /[\u4e00-\u9fa5]+/g;
  const chineseMatches = decodedData.match(chinesePattern);
  if (chineseMatches && chineseMatches.length > 0) {
    // 合并所有中文内容
    textContent = chineseMatches.join('');
  }
  
  // 选择最可能的字体名称（通常是最长的那个）
  if (possibleFonts.length > 0) {
    // 优先选择包含 -GB、-CN 等标识的字体名称
    const preferredFonts = possibleFonts.filter(f => /-[A-Z]{2}$/.test(f));
    if (preferredFonts.length > 0) {
      fontName = preferredFonts[0];
    } else {
      // 否则选择最长的
      fontName = possibleFonts.sort((a, b) => b.length - a.length)[0];
    }
  }
  
  return { fontName, textContent };
}

/**
 * 基础扫描：从 XML 内容中提取字体信息
 * @param xmlContent XML 文件内容
 * @returns 字体信息数组
 */
function baseScanFonts(xmlContent: string): FontInfo[] {
  const fonts: FontInfo[] = [];
  const seenFonts = new Set<string>(); // 用于去重
  
  // base64 长度限制
  const MAX_BASE64_LENGTH = 10000;
  
  // 方法1：查找 <Name>源文本</Name> 后面的 <StartKeyframeValue Encoding="base64">
  // 使用正则匹配
  const pattern1 = /<Name>源文本<\/Name>[\s\S]*?<StartKeyframeValue\s+Encoding="base64"[^>]*>([^<]+)<\/StartKeyframeValue>/g;
  
  let match;
  while ((match = pattern1.exec(xmlContent)) !== null) {
    const base64Content = match[1].trim();
    
    // 跳过过长的 base64 内容
    if (base64Content.length > MAX_BASE64_LENGTH) {
      console.log(`[BaseScan] base64 长度 ${base64Content.length} 超过限制 ${MAX_BASE64_LENGTH}，跳过`);
      continue;
    }
    
    try {
      // 解码 base64（浏览器兼容方式）
      const decodedBuffer = Uint8Array.from(atob(base64Content), c => c.charCodeAt(0));
      const decodedData = new TextDecoder('utf-8').decode(decodedBuffer);
      
      console.log(`[BaseScan] 解码 base64 成功，长度: ${decodedData.length}`);
      console.log(`[BaseScan] 解码内容片段: ${decodedData.substring(0, 200)}...`);
      
      // 提取字体名称和文本内容
      const { fontName, textContent } = extractFontAndText(decodedData);
      
      if (fontName && !seenFonts.has(fontName)) {
        seenFonts.add(fontName);
        // 获取字体完整信息
        const fontInfo = getFontInfo(fontName);
        fonts.push({
          fontName,
          chineseName: fontInfo.chineseName,
          downloadUrl: fontInfo.downloadUrl,
          license: fontInfo.license,
          textContent: textContent || '',
          source: '基础扫描',
        });
        console.log(`[BaseScan] 提取到字体: ${fontName} -> ${fontInfo.chineseName}, 文本: ${textContent}`);
      }
    } catch (error) {
      console.error('[BaseScan] base64 解码失败:', error);
    }
  }
  
  // 方法2：查找 <FormattedTextData Encoding="base64"> 标签
  const pattern2 = /<FormattedTextData\s+Encoding="base64"[^>]*>([^<]+)<\/FormattedTextData>/g;
  
  while ((match = pattern2.exec(xmlContent)) !== null) {
    const base64Content = match[1].trim();
    
    // 跳过过长的 base64 内容
    if (base64Content.length > MAX_BASE64_LENGTH) {
      console.log(`[BaseScan] FormattedTextData base64 长度 ${base64Content.length} 超过限制 ${MAX_BASE64_LENGTH}，跳过`);
      continue;
    }
    
    try {
      const decodedBuffer = Uint8Array.from(atob(base64Content), c => c.charCodeAt(0));
      const decodedData = new TextDecoder('utf-8').decode(decodedBuffer);
      
      console.log(`[BaseScan] FormattedTextData 解码成功，长度: ${decodedData.length}`);
      
      const { fontName, textContent } = extractFontAndText(decodedData);
      
      if (fontName && !seenFonts.has(fontName)) {
        seenFonts.add(fontName);
        const fontInfo = getFontInfo(fontName);
        fonts.push({
          fontName,
          chineseName: fontInfo.chineseName,
          downloadUrl: fontInfo.downloadUrl,
          license: fontInfo.license,
          textContent: textContent || '',
          source: '基础扫描',
        });
        console.log(`[BaseScan] FormattedTextData 提取到字体: ${fontName} -> ${fontInfo.chineseName}, 文本: ${textContent}`);
      }
    } catch (error) {
      console.error('[BaseScan] FormattedTextData 解码失败:', error);
    }
  }
  
  // 方法3：直接查找所有 <StartKeyframeValue Encoding="base64"> 标签（兜底）
  if (fonts.length === 0) {
    const pattern3 = /<StartKeyframeValue\s+Encoding="base64"[^>]*>([^<]+)<\/StartKeyframeValue>/g;
    
    while ((match = pattern3.exec(xmlContent)) !== null) {
      const base64Content = match[1].trim();
      
      // 跳过过长的 base64 内容
      if (base64Content.length > MAX_BASE64_LENGTH) {
        console.log(`[BaseScan] base64 长度 ${base64Content.length} 超过限制 ${MAX_BASE64_LENGTH}，跳过`);
        continue;
      }
      
      try {
        const decodedBuffer = Uint8Array.from(atob(base64Content), c => c.charCodeAt(0));
        const decodedData = new TextDecoder('utf-8').decode(decodedBuffer);
        
        const { fontName, textContent } = extractFontAndText(decodedData);
        
        if (fontName && !seenFonts.has(fontName)) {
          seenFonts.add(fontName);
          const fontInfo = getFontInfo(fontName);
          fonts.push({
            fontName,
            chineseName: fontInfo.chineseName,
            downloadUrl: fontInfo.downloadUrl,
            license: fontInfo.license,
            textContent: textContent || '',
            source: '基础扫描',
          });
        }
      } catch (error) {
        // 忽略解码错误
      }
    }
  }
  
  return fonts;
}

/**
 * 从 XML 内容中提取所有字体信息（基础扫描 + 深度扫描）
 * @param xmlContent XML 文件内容
 * @returns 字体信息数组
 */
export function extractFontsFromXML(xmlContent: string): FontInfo[] {
  console.log('[FontExtractor] 开始提取字体...');
  
  // 1. 基础扫描
  const baseFonts = baseScanFonts(xmlContent);
  console.log(`[FontExtractor] 基础扫描完成，找到 ${baseFonts.length} 个字体`);
  
  // 2. 深度扫描
  const deepFonts = deepScanFonts(xmlContent);
  console.log(`[FontExtractor] 深度扫描完成，找到 ${deepFonts.length} 个字体`);
  
  // 3. 合并结果
  const mergedFonts = mergeScanResults(baseFonts, deepFonts);
  console.log(`[FontExtractor] 合并完成，共 ${mergedFonts.length} 个字体`);
  
  return mergedFonts as FontInfo[];
}

/**
 * 从 XML 内容中提取所有字体名称（去重）
 * @param xmlContent XML 文件内容
 * @returns 字体名称数组
 */
export function extractFontNames(xmlContent: string): string[] {
  const fonts = extractFontsFromXML(xmlContent);
  return fonts.map(f => f.fontName);
}
