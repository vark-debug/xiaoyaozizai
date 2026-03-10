/**
 * 字体深度扫描模块
 * 用于二次扫描，处理更深层的情况
 * 
 * 扫描规则：
 * 1. 查找 <ArbVideoComponentParam> 标签块
 * 2. 提取 <Name> 作为标识符
 * 3. 解码 <StartKeyframeValue Encoding="base64"> (UTF-16LE)
 * 4. 相同 Name 后面的覆盖前面的
 */

import { getFontInfo } from './font-mapper';

export interface DeepScanResult {
  fontName: string;       // 技术命名
  chineseName: string;    // 中文标准命名
  downloadUrl: string;    // 下载地址
  license: string;        // 授权标准
  source: string;         // 来源位置
  textContent: string;    // 文本内容
}

/**
 * 深度扫描配置
 */
export interface DeepScanConfig {
  // 预留配置项
}

/**
 * 从 UTF-16LE 编码的字节数组中提取字体名称和文本内容
 * 使用 JSON 解析精确提取 fontEditValue 和 textEditValue
 */
function extractFromUTF16LE(buffer: Uint8Array): { fontName: string | null; textContent: string | null } {
  try {
    // 转换为 UTF-16LE 字符串（浏览器兼容方式）
    let decodedString = new TextDecoder('utf-16le').decode(buffer);
    
    console.log(`[DeepScan] UTF-16LE 解码结果长度: ${decodedString.length}`);
    console.log(`[DeepScan] 解码内容: ${decodedString}`);
    
    // 检查是否为有效的字体数据格式（以 {"capPropFontEdit" 开头）
    const trimmedString = decodedString.trim();
    if (!trimmedString.startsWith('{"capPropFontEdit"')) {
      console.log('[DeepScan] 不是有效的字体数据格式，跳过');
      return { fontName: null, textContent: null };
    }
    
    // 解析 JSON
    const jsonData = JSON.parse(trimmedString);
    
    // 提取 fontEditValue（数组，取第一个元素）
    let fontName: string | null = null;
    if (jsonData.fontEditValue && Array.isArray(jsonData.fontEditValue) && jsonData.fontEditValue.length > 0) {
      fontName = jsonData.fontEditValue[0];
      console.log(`[DeepScan] 提取到字体名称: ${fontName}`);
    }
    
    // 提取 textEditValue
    let textContent: string | null = null;
    if (jsonData.textEditValue) {
      textContent = jsonData.textEditValue;
      console.log(`[DeepScan] 提取到文本内容: ${textContent}`);
    }
    
    return { fontName, textContent };
  } catch (error) {
    console.error('[DeepScan] UTF-16LE 解码或 JSON 解析失败:', error);
    return { fontName: null, textContent: null };
  }
}

/**
 * 对 XML 内容进行深度扫描
 * @param xmlContent XML 文件内容
 * @param config 扫描配置
 * @returns 深度扫描结果
 */
export function deepScanFonts(
  xmlContent: string, 
  config?: DeepScanConfig
): DeepScanResult[] {
  console.log('[DeepScan] 开始深度扫描...');
  
  // 使用 Map 存储，相同 Name 后面的覆盖前面的
  const fontMap = new Map<string, { name: string; fontName: string | null; textContent: string | null }>();
  
  // 匹配 ArbVideoComponentParam 标签块
  // 使用非贪婪匹配获取每个块
  const blockPattern = /<ArbVideoComponentParam[^>]*>([\s\S]*?)<\/ArbVideoComponentParam>/g;
  
  let blockMatch;
  let blockCount = 0;
  
  while ((blockMatch = blockPattern.exec(xmlContent)) !== null) {
    blockCount++;
    const blockContent = blockMatch[1];
    
    // 提取 Name 标签
    const nameMatch = blockContent.match(/<Name>\s*([^<]+?)\s*<\/Name>/);
    if (!nameMatch) {
      continue;
    }
    
    const name = nameMatch[1].trim();
    console.log(`[DeepScan] 块 ${blockCount}: 找到 Name = "${name}"`);
    
    // 提取 StartKeyframeValue 的 base64 内容
    // 使用分步匹配避免灾难性回溯
    const startTagMatch = blockContent.match(/<StartKeyframeValue[^>]*Encoding="base64"[^>]*>/);
    if (!startTagMatch) {
      console.log(`[DeepScan] 块 ${blockCount}: 未找到 StartKeyframeValue 开始标签`);
      continue;
    }
    
    const startIndex = startTagMatch.index! + startTagMatch[0].length;
    const endTagIndex = blockContent.indexOf('</StartKeyframeValue>', startIndex);
    if (endTagIndex === -1) {
      console.log(`[DeepScan] 块 ${blockCount}: 未找到 StartKeyframeValue 结束标签`);
      continue;
    }
    
    const base64Content = blockContent.substring(startIndex, endTagIndex).trim();
    console.log(`[DeepScan] 块 ${blockCount}: base64 长度 = ${base64Content.length}`);
    
    // 限制 base64 内容长度，避免处理超大内容
    if (base64Content.length > 10000) {
      console.log(`[DeepScan] 块 ${blockCount}: base64 长度 ${base64Content.length} 超过限制 10000，跳过`);
      continue;
    }
    
    try {
      // 解码 base64（浏览器兼容方式）
      const buffer = Uint8Array.from(atob(base64Content), c => c.charCodeAt(0));
      console.log(`[DeepScan] 块 ${blockCount}: 解码后 buffer 长度 = ${buffer.length}`);
      
      // 提取字体名称和文本
      const { fontName, textContent } = extractFromUTF16LE(buffer);
      
      // 存储到 Map（相同 name 会被覆盖）
      fontMap.set(name, {
        name,
        fontName,
        textContent,
      });
      
      console.log(`[DeepScan] 块 ${blockCount}: 提取结果 - 字体: ${fontName}, 文本: ${textContent?.substring(0, 50)}`);
      
    } catch (error) {
      console.error(`[DeepScan] 块 ${blockCount}: 解码失败`, error);
    }
  }
  
  console.log(`[DeepScan] 共处理 ${blockCount} 个块，有效记录 ${fontMap.size} 个`);
  
  // 转换为结果数组
  const results: DeepScanResult[] = [];
  
  for (const [, data] of fontMap) {
    if (data.fontName) {
      const fontInfo = getFontInfo(data.fontName);
      results.push({
        fontName: data.fontName,
        chineseName: fontInfo.chineseName,
        downloadUrl: fontInfo.downloadUrl,
        license: fontInfo.license,
        source: `深度扫描: ${data.name}`,
        textContent: data.textContent || '',
      });
    }
  }
  
  console.log(`[DeepScan] 最终提取到 ${results.length} 个字体`);
  
  return results;
}

/**
 * 合并基础扫描和深度扫描结果
 * @param baseFonts 基础扫描结果
 * @param deepFonts 深度扫描结果
 * @returns 合并后的结果（包含来源标记）
 */
export function mergeScanResults(
  baseFonts: Array<{ fontName: string; chineseName: string; downloadUrl: string; license: string; textContent: string }>,
  deepFonts: DeepScanResult[]
): Array<{ fontName: string; chineseName: string; downloadUrl: string; license: string; textContent: string; source?: string }> {
  const merged: Array<{ fontName: string; chineseName: string; downloadUrl: string; license: string; textContent: string; source?: string }> = 
    baseFonts.map(f => ({ ...f, source: '基础扫描' }));
  const seenFonts = new Set(baseFonts.map(f => f.fontName));

  for (const deepFont of deepFonts) {
    if (!seenFonts.has(deepFont.fontName)) {
      seenFonts.add(deepFont.fontName);
      merged.push({
        fontName: deepFont.fontName,
        chineseName: deepFont.chineseName,
        downloadUrl: deepFont.downloadUrl,
        license: deepFont.license,
        textContent: deepFont.textContent,
        source: deepFont.source,
      });
    }
  }

  return merged;
}
