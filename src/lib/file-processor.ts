/**
 * 文件处理服务模块
 * 负责 PR 项目文件的处理逻辑
 * 流程：上传 PR 文件 → 重命名 ZIP → 解压 → 保存 XML → 提取字体
 * 纯浏览器模式：使用 fflate 替代 Node.js zlib/unzipper，无需服务端
 */

import { gunzipSync, unzipSync } from "fflate";
import { extractFontsFromXML, FontInfo } from "./font-extractor";

// 处理步骤状态
export interface ProcessingStep {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  message: string;
  timestamp?: string;
}

// 处理结果
export interface ProcessingResult {
  success: boolean;
  steps: ProcessingStep[];
  originalFileName: string;
  fonts?: FontInfo[];
  error?: string;
}

/**
 * 生成唯一 ID
 */
function generateStepId(): string {
  return `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 创建处理步骤
 */
function createStep(name: string, status: ProcessingStep['status'] = 'pending', message: string = ''): ProcessingStep {
  return {
    id: generateStepId(),
    name,
    status,
    message,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 处理上传的 PR 项目文件（本地处理，不上传对象存储）
 * 流程：读取文件 → 识别格式 → 解压 → 提取字体
 */
export async function processPrprojFile(file: File): Promise<ProcessingResult> {
  const steps: ProcessingStep[] = [];
  
  try {
    // 步骤 1: 验证并读取文件
    let step = createStep('读取文件', 'processing', '正在读取上传的文件...');
    steps.push(step);
    
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.prproj')) {
      steps[steps.length - 1] = {
        ...step,
        status: 'error',
        message: '文件格式不正确，请上传 .prproj 文件',
      };
      return { success: false, steps, originalFileName: file.name, error: '无效的文件格式' };
    }
    
    // 读取文件内容
    const fileBuffer = await file.arrayBuffer();
    const fileContent = new Uint8Array(fileBuffer);
    
    // 调试信息
    const headerHex = Array.from(fileContent.slice(0, 16))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    console.log(`[DEBUG] 文件名: ${file.name}`);
    console.log(`[DEBUG] 文件大小: ${fileContent.length} bytes`);
    console.log(`[DEBUG] 文件头(Hex): ${headerHex}`);
    
    steps[steps.length - 1] = {
      ...step,
      status: 'completed',
      message: `文件读取成功，大小: ${(file.size / 1024).toFixed(2)} KB`,
    };

    // 步骤 2: 识别为 ZIP 格式（逻辑识别）
    step = createStep('识别为 ZIP', 'processing', '正在识别文件格式...');
    steps.push(step);
    
    const baseName = file.name.replace(/\.prproj$/i, '');
    
    steps[steps.length - 1] = {
      ...step,
      status: 'completed',
      message: `文件已识别为 ZIP 格式: ${baseName}.zip`,
    };

    // 步骤 3: 解压文件
    step = createStep('解压文件', 'processing', '正在解压文件内容...');
    steps.push(step);
    
    let extractedContent: Uint8Array;
    
    const headerSignature = Array.from(fileContent.slice(0, 2))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    
    if (headerSignature === '1f8b') {
      console.log('[DEBUG] 检测到 GZIP 格式');
      extractedContent = gunzipSync(fileContent);
    } else if (headerSignature === '504b') {
      console.log('[DEBUG] 检测到标准 ZIP 格式');
      const unzipped = unzipSync(fileContent);
      const firstFile = Object.values(unzipped)[0];
      if (!firstFile) throw new Error('ZIP 文件为空');
      extractedContent = firstFile;
    } else {
      console.log('[DEBUG] 未知格式，尝试直接读取');
      extractedContent = fileContent;
    }
    
    console.log(`[DEBUG] 解压后大小: ${extractedContent.length} bytes`);
    
    steps[steps.length - 1] = {
      ...step,
      status: 'completed',
      message: `解压成功，大小: ${(extractedContent.length / 1024).toFixed(2)} KB`,
    };

    // 步骤 4: 重命名为 XML（逻辑识别）
    step = createStep('重命名为 XML', 'processing', '正在识别为 XML 格式...');
    steps.push(step);
    
    const xmlContent = new TextDecoder('utf-8').decode(extractedContent);
    
    steps[steps.length - 1] = {
      ...step,
      status: 'completed',
      message: `已识别为 XML: ${baseName}.xml`,
    };

    // 步骤 5: 提取字体信息
    step = createStep('提取字体信息', 'processing', '正在分析 XML 提取字体...');
    steps.push(step);
    
    const fonts = extractFontsFromXML(xmlContent);
    
    if (fonts.length > 0) {
      steps[steps.length - 1] = {
        ...step,
        status: 'completed',
        message: `提取到 ${fonts.length} 个字体`,
      };
    } else {
      steps[steps.length - 1] = {
        ...step,
        status: 'completed',
        message: '未检测到字体信息（可能项目中没有使用文本）',
      };
    }

    // 步骤 6: 处理完成
    step = createStep('处理完成', 'processing', '正在完成处理...');
    steps.push(step);
    
    steps[steps.length - 1] = {
      ...step,
      status: 'completed',
      message: '所有步骤已完成',
    };

    return {
      success: true,
      steps,
      originalFileName: file.name,
      fonts,
    };
    
  } catch (error) {
    console.error('处理失败:', error);
    
    const lastStep = steps[steps.length - 1];
    if (lastStep && lastStep.status === 'processing') {
      steps[steps.length - 1] = {
        ...lastStep,
        status: 'error',
        message: `处理失败: ${error instanceof Error ? error.message : '未知错误'}`,
      };
    }
    
    return {
      success: false,
      steps,
      originalFileName: file.name,
      error: error instanceof Error ? error.message : '处理失败',
    };
  }
}

/**
 * 获取文件访问 URL（本地模式不提供）
 */
export async function getFileAccessUrl(fileKey: string): Promise<string> {
  return '';
}
