import React from 'react';
import { Brain, Check, Copy } from 'lucide-react';

interface AiAnalyzeFooterProps {
  isReady: boolean;
  isGenerating: boolean;
  reCopyCopied: boolean;
  rawOnly: boolean;
  onGenerate: () => void;
  onOpenGemini: () => void;
  onReCopy: () => void;
}

export const AiAnalyzeFooter: React.FC<AiAnalyzeFooterProps> = ({
  isReady,
  isGenerating,
  reCopyCopied,
  rawOnly,
  onGenerate,
  onOpenGemini,
  onReCopy,
}) => (
  <div className="flex-shrink-0 flex items-center justify-center px-4 sm:px-5" style={{ height: '40px' }}>
    <div className="flex items-center justify-center gap-2 w-full">
      {!isReady ? (
        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating}
          data-track="export-generate"
          className="inline-flex items-center gap-2 justify-center whitespace-nowrap rounded-md text-sm font-semibold focus-visible:outline-none disabled:pointer-events-none disabled:opacity-60 h-10 px-4 py-2 bg-transparent border border-purple-500/40 text-slate-200 hover:border-purple-400 hover:text-purple-200 hover:bg-purple-500/10 transition-colors duration-200"
        >
          <Brain className="w-4 h-4" />
          <span>{isGenerating ? (rawOnly ? 'Copying logs…' : 'Generating…') : (rawOnly ? 'Copy Raw Logs' : 'Generate Prompt')}</span>
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenGemini}
            data-track="export-open-gemini"
            className="inline-flex items-center gap-2 justify-center whitespace-nowrap rounded-md text-sm font-semibold focus-visible:outline-none disabled:pointer-events-none disabled:opacity-60 h-10 px-4 py-2 bg-transparent border border-emerald-500/40 text-slate-200 hover:border-emerald-400 hover:text-emerald-200 hover:bg-emerald-500/10 transition-colors duration-200"
          >
            <span>Analyse with Gemini</span>
          </button>

          <button
            type="button"
            onClick={onReCopy}
            data-track="export-recopy"
            className="inline-flex items-center gap-2 justify-center whitespace-nowrap rounded-md text-sm font-semibold focus-visible:outline-none disabled:pointer-events-none disabled:opacity-60 h-10 px-4 py-2 bg-transparent border border-slate-700/50 text-slate-200 hover:border-white hover:text-white hover:bg-white/5 transition-colors duration-200"
            title="Copy export to clipboard"
          >
            {reCopyCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{reCopyCopied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      )}
    </div>
  </div>
);
