'use client';

import { useCallback, useState } from 'react';
import { Upload, FileVideo, AlertCircle, Shield, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isProcessing?: boolean;
}

export function FileUpload({ onFileSelect, isProcessing = false }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateAndProcess = useCallback((file: File) => {
    const fileName = file.name.toLowerCase();
    
    if (!fileName.endsWith('.prproj')) {
      setError('请上传 Adobe Premiere Pro 项目文件 (.prproj)');
      return;
    }
    
    setError(null);
    onFileSelect(file);
  }, [onFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (isProcessing) return;
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      validateAndProcess(files[0]);
    }
  }, [isProcessing, validateAndProcess]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (isProcessing) return;
    
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndProcess(files[0]);
    }
    // 重置 input 以便可以再次选择同一文件
    e.target.value = '';
  }, [isProcessing, validateAndProcess]);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="p-8">
        <div
          className={`
            relative border-2 border-dashed rounded-lg p-12
            transition-all duration-200
            ${isProcessing ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}
            ${isDragging 
              ? 'border-primary bg-primary/5 scale-[1.02]' 
              : 'border-border hover:border-primary/50 hover:bg-accent/50'
            }
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isProcessing && document.getElementById('file-input')?.click()}
        >
          <input
            id="file-input"
            type="file"
            accept=".prproj"
            onChange={handleFileInput}
            className="hidden"
            disabled={isProcessing}
          />
          
          <div className="flex flex-col items-center gap-4">
            {isProcessing ? (
              <>
                <div className="rounded-full bg-primary/10 p-4">
                  <Loader2 className="w-12 h-12 text-primary animate-spin" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-lg">正在分析项目文件...</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    请稍候
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-full bg-primary/10 p-4">
                  <Upload className="w-12 h-12 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-lg">
                    选择文件
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    支持 .prproj 格式 (Adobe Premiere Pro 项目文件)
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 mt-4 text-destructive">
            <AlertCircle className="w-4 h-4" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* 隐私说明 */}
        <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t">
          <Shield className="w-4 h-4 text-green-500" />
          <p className="text-sm text-muted-foreground">
            文件仅在浏览器本地处理，不会上传至任何服务器
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
