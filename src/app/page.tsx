'use client';

import { useState, useMemo } from 'react';
import { Type, Sparkles, CheckCircle, Copy, ExternalLink, FileText, FileSearch, AlertCircle } from 'lucide-react';
import { FileUpload } from '@/components/FileUpload';
import { ThemeToggle } from '@/components/theme-toggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { processPrprojFile } from '@/lib/file-processor';


interface FontInfo {
  fontName: string;      // 技术命名
  chineseName: string;   // 中文标准命名
  downloadUrl: string;   // 下载地址
  license: string;       // 授权标准
  textContent: string;   // 文本内容
  source?: string;       // 来源标记
}

// 合并后的字体信息
interface MergedFontInfo {
  chineseName: string;      // 中文标准命名
  fontNames: string[];      // 技术命名数组
  downloadUrl: string;      // 下载地址
  license: string;          // 授权标准
}

export default function Home() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [fonts, setFonts] = useState<FontInfo[]>([]);

  // 合并相同中文名称的字体
  const mergedFonts = useMemo(() => {
    const fontMap = new Map<string, MergedFontInfo>();
    
    for (const font of fonts) {
      const key = font.chineseName;
      
      if (fontMap.has(key)) {
        const existing = fontMap.get(key)!;
        // 合并技术命名（去重）
        if (!existing.fontNames.includes(font.fontName)) {
          existing.fontNames.push(font.fontName);
        }
      } else {
        fontMap.set(key, {
          chineseName: font.chineseName,
          fontNames: [font.fontName],
          downloadUrl: font.downloadUrl,
          license: font.license,
        });
      }
    }
    
    return Array.from(fontMap.values());
  }, [fonts]);

  const handleFileSelect = async (file: File) => {
    setIsProcessing(true);
    setProcessingComplete(false);
    setFonts([]);

    try {
      const result = await processPrprojFile(file);

      if (result.success) {
        setProcessingComplete(true);
        setFonts(result.fonts || []);
      }
    } catch (error) {
      console.error('处理失败:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setProcessingComplete(false);
    setFonts([]);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary p-2">
                <Type className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">逍遥字在</h1>
                <p className="text-xs text-muted-foreground">Adobe Premiere Pro 字体检测工具</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="w-3 h-3" />
                Beta
              </Badge>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-6xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            Adobe Premiere Pro 字体检测工具
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            轻松识别 Adobe Premiere Pro 项目中使用的所有字体，告别字体缺失烦恼
          </p>
        </div>

        {/* Upload Section */}
        <div className="mb-8">
          <FileUpload 
            onFileSelect={handleFileSelect} 
            isProcessing={isProcessing}
          />
        </div>

        {/* Font Results */}
        {processingComplete && mergedFonts.length > 0 && (
          <div className="w-full max-w-2xl mx-auto mb-8">
            <div className="rounded-lg border bg-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-6 h-6 text-green-500" />
                <h3 className="text-lg font-semibold">检测到 {mergedFonts.length} 个字体</h3>
              </div>
              
              <div className="space-y-3">
                {mergedFonts.map((font, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg bg-muted/50 border"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Type className="w-4 h-4 text-primary flex-shrink-0" />
                          <span className="font-semibold text-lg">{font.chineseName}</span>
                        </div>
                        
                        {/* 技术命名 */}
                        {font.fontNames.length > 0 && (
                          <p className="text-xs text-muted-foreground font-mono mt-1">
                            ({font.fontNames.join(', ')})
                          </p>
                        )}
                        
                        {/* 下载地址和授权标准 */}
                        <div className="flex flex-wrap items-center gap-3 mt-2">
                          {font.downloadUrl && (
                            <a
                              href={font.downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                            >
                              <ExternalLink className="w-3 h-3" />
                              下载地址
                            </a>
                          )}
                          {font.license && (
                            <div className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                              <FileText className="w-3 h-3" />
                              授权: {font.license}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(font.chineseName)}
                        className="gap-1 flex-shrink-0"
                      >
                        <Copy className="w-4 h-4" />
                        复制
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <button
                  onClick={handleReset}
                  className="text-sm text-primary hover:underline"
                >
                  上传新文件
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success Message (No Fonts Found) */}
        {processingComplete && mergedFonts.length === 0 && (
          <div className="w-full max-w-2xl mx-auto mb-8">
            <div className="rounded-lg border border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20 p-6">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle className="w-6 h-6 text-yellow-500" />
                <h3 className="text-lg font-semibold text-yellow-700 dark:text-yellow-400">
                  处理完成，未检测到字体
                </h3>
              </div>
              <p className="text-sm text-yellow-600 dark:text-yellow-500 mb-4">
                文件已成功处理，但未在项目中检测到使用的字体。这可能是因为项目没有使用文本图层。
              </p>
              <button
                onClick={handleReset}
                className="text-sm text-primary hover:underline"
              >
                上传新文件
              </button>
            </div>
          </div>
        )}

        {/* Features Section */}
        {!isProcessing && !processingComplete && (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="rounded-xl border bg-card p-6 hover:shadow-lg transition-shadow">
              <div className="rounded-lg bg-blue-500/10 w-fit p-3 mb-4">
                <Type className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="font-semibold mb-2">字体清单</h3>
              <p className="text-sm text-muted-foreground">
                自动识别项目中内嵌文本使用的字体
              </p>
              <div className="flex items-start gap-2 mt-3 p-2 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  动态链接内容（AE、PSD）与硬编码内容（视频自带字幕、图片自带文字）无法检测
                </p>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-6 hover:shadow-lg transition-shadow">
              <div className="rounded-lg bg-green-500/10 w-fit p-3 mb-4">
                <FileSearch className="w-6 h-6 text-green-500" />
              </div>
              <h3 className="font-semibold mb-2">项目解析</h3>
              <p className="text-sm text-muted-foreground">
                深度解析 .prproj 文件结构，准确定位字体使用位置
              </p>
            </div>

            <div className="rounded-xl border bg-card p-6 hover:shadow-lg transition-shadow">
              <div className="rounded-lg bg-purple-500/10 w-fit p-3 mb-4">
                <Sparkles className="w-6 h-6 text-purple-500" />
              </div>
              <h3 className="font-semibold mb-2">智能建议</h3>
              <p className="text-sm text-muted-foreground">
                提供字体下载链接，快速解决字体缺失问题
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-auto">
        <div className="container max-w-6xl mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>© 2024 PR Font Detective. 帮助创作者更好地管理项目字体</p>
        </div>
      </footer>
    </div>
  );
}
