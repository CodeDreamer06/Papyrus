'use client';

import type { ProcessingState } from '@/types';
import { Check, Loader2, AlertCircle } from 'lucide-react';

interface ProcessingIndicatorProps {
  state: ProcessingState;
}

const stageIcons: Record<string, React.ReactNode> = {
  text_extraction: '📄',
  vision_detection: '👁️',
  question_generation: '✨',
  validation: '✅',
};

export function ProcessingIndicator({ state }: ProcessingIndicatorProps) {
  const { stages, currentPage, totalPages } = state;

  return (
    <div className="app-frame p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Processing PDF</h3>
        <span className="text-sm text-muted">
          Page {currentPage} of {totalPages}
        </span>
      </div>

      {/* Overall progress */}
      <div className="space-y-2">
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ 
              width: `${stages.reduce((acc, s) => acc + (s.status === 'completed' ? 25 : s.progress / 4), 0)}%` 
            }}
          />
        </div>
        <p className="text-xs text-muted text-center">
          {stages.filter(s => s.status === 'completed').length} of {stages.length} stages complete
        </p>
      </div>

      {/* Stage details */}
      <div className="space-y-3">
        {stages.map((stage) => (
          <div 
            key={stage.name}
            className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${
              stage.status === 'processing' 
                ? 'border-accent bg-accent/5' 
                : stage.status === 'completed'
                ? 'border-green-500/30 bg-green-500/5'
                : stage.status === 'error'
                ? 'border-red-500/30 bg-red-500/5'
                : 'border-border opacity-60'
            }`}
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg">
              {stage.status === 'completed' ? (
                <Check className="w-5 h-5 text-green-500" />
              ) : stage.status === 'processing' ? (
                <Loader2 className="w-5 h-5 text-accent animate-spin" />
              ) : stage.status === 'error' ? (
                <AlertCircle className="w-5 h-5 text-red-500" />
              ) : (
                <span className="opacity-50">{stageIcons[stage.name] || '•'}</span>
              )}
            </div>
            
            <div className="flex-1">
              <p className={`font-medium ${
                stage.status === 'processing' ? 'text-accent' : 'text-foreground'
              }`}>
                {stage.message}
              </p>
              {stage.status === 'processing' && (
                <div className="mt-2 progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${stage.progress}%` }}
                  />
                </div>
              )}
            </div>
            
            <span className="text-sm text-muted">
              {stage.status === 'completed' ? 'Done' : `${stage.progress}%`}
            </span>
          </div>
        ))}
      </div>

      {state.error && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-500">
          <p className="font-medium">Error: {state.error}</p>
        </div>
      )}
    </div>
  );
}
