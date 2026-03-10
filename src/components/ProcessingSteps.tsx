'use client';

import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ProcessingStep } from '@/lib/file-processor';

interface ProcessingStepsProps {
  steps: ProcessingStep[];
}

export function ProcessingSteps({ steps }: ProcessingStepsProps) {
  if (steps.length === 0) return null;

  // 计算进度
  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const totalSteps = steps.length;
  const progress = Math.round((completedSteps / totalSteps) * 100);
  
  // 获取当前处理中的步骤
  const currentStep = steps.find(s => s.status === 'processing');
  const errorStep = steps.find(s => s.status === 'error');
  const isComplete = steps.every(s => s.status === 'completed');
  const hasError = steps.some(s => s.status === 'error');

  // 获取状态文本
  const getStatusText = () => {
    if (hasError && errorStep) {
      return errorStep.message || '处理失败';
    }
    if (isComplete) {
      return '处理完成';
    }
    if (currentStep) {
      return currentStep.name;
    }
    return '准备中...';
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-8">
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-3 mb-4">
          {hasError ? (
            <XCircle className="w-5 h-5 text-red-500" />
          ) : isComplete ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          )}
          <span className={`font-medium ${hasError ? 'text-red-500' : ''}`}>
            {getStatusText()}
          </span>
        </div>
        
        <Progress 
          value={progress} 
          className={`h-2 ${hasError ? '[&>div]:bg-red-500' : ''}`}
        />
        
        <p className="text-sm text-muted-foreground mt-2 text-right">
          {hasError ? '处理失败' : `${progress}%`}
        </p>
      </div>
    </div>
  );
}
