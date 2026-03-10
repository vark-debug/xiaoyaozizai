/**
 * 字体名称映射模块
 * 将技术命名映射为中文标准命名、下载地址和授权标准
 */

import fontMappingData from '../output.json';

// 字体完整信息
export interface FontMappingInfo {
  chineseName: string;      // 中文标准命名
  downloadUrl: string;      // 下载地址
  license: string;          // 授权标准
}

// 映射表：技术命名 -> 字体完整信息
const fontInfoMap: Map<string, FontMappingInfo> = new Map();

// 初始化映射表
function initFontInfoMap() {
  if (fontInfoMap.size > 0) return; // 已初始化

  const data = fontMappingData as { 
    字体数据: Array<{ 
      字体信息: Array<{ 
        中文标准命名: string; 
        '技术命名(nameID=6)': string;
        下载地址?: string;
        授权标准?: string;
      }> 
    }> 
  };
  
  for (const fontItem of data.字体数据) {
    for (const info of fontItem.字体信息) {
      const chineseName = info.中文标准命名;
      const technicalNames = info['技术命名(nameID=6)'];
      const downloadUrl = info.下载地址 || '';
      const license = info.授权标准 || '';
      
      if (technicalNames && chineseName) {
        // 技术命名可能是逗号分隔的多个名称
        const names = technicalNames.split(',').map(n => n.trim());
        for (const name of names) {
          fontInfoMap.set(name, {
            chineseName,
            downloadUrl,
            license,
          });
        }
      }
    }
  }
  
  console.log(`[FontMapper] 已加载 ${fontInfoMap.size} 个字体名称映射`);
}

/**
 * 根据技术命名获取字体完整信息
 * @param technicalName 技术命名（如 DOUYINSANSBOLD-GB）
 * @returns 字体完整信息，如果未找到则返回默认值（使用原技术命名）
 */
export function getFontInfo(technicalName: string): FontMappingInfo {
  initFontInfoMap();
  
  // 仅使用精确匹配
  if (fontInfoMap.has(technicalName)) {
    return fontInfoMap.get(technicalName)!;
  }
  
  // 未找到映射，返回默认值（使用原技术命名）
  return {
    chineseName: technicalName,
    downloadUrl: '',
    license: '',
  };
}

/**
 * 根据技术命名获取中文标准命名
 * @param technicalName 技术命名
 * @returns 中文标准命名
 */
export function getChineseFontName(technicalName: string): string {
  return getFontInfo(technicalName).chineseName;
}

/**
 * 批量转换字体名称
 */
export function mapFontNames(fontNames: string[]): Array<{ technicalName: string; chineseName: string }> {
  return fontNames.map(name => ({
    technicalName: name,
    chineseName: getChineseFontName(name),
  }));
}

// 导出初始化函数供测试使用
export { initFontInfoMap };
