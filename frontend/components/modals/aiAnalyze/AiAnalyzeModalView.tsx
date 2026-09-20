import React from 'react';

import { resolveDarkBgByMode, resolveLightBg } from '../../../src/assets/images/misc/bgConfig';
import type { TooltipData } from '../../ui/Tooltip';
import type {
  AnalysisCategory,
  AnalysisModule,
  AnalysisModuleId,
  TimeframeMonths,
} from './aiAnalyzeConfig';
import { AiAnalyzeCategoryChips } from './AiAnalyzeCategoryChips';
import { AiAnalyzeFooter } from './AiAnalyzeFooter';
import { AiAnalyzeHeader } from './AiAnalyzeHeader';
import { AiAnalyzeModuleGrid } from './AiAnalyzeModuleGrid';
import { AiAnalyzeTimeframePicker } from './AiAnalyzeTimeframePicker';

interface AiAnalyzeModalViewProps {
  isLightTheme: boolean;
  themeMode: string;
  darkBgChoice: string;
  lightBgChoice: string;
  onClose: () => void;
  months: TimeframeMonths;
  setMonths: (value: TimeframeMonths) => void;
  activeCategory: AnalysisCategory;
  setActiveCategory: (value: AnalysisCategory) => void;
  visibleModules: AnalysisModule[];
  selectedIds: AnalysisModuleId[];
  onToggleModule: (id: AnalysisModuleId) => void;
  isReady: boolean;
  isGenerating: boolean;
  reCopyCopied: boolean;
  rawOnly: boolean;
  onGenerate: () => void;
  onReCopy: () => void;
  onOpenGemini: () => void;
  showTooltip: (e: React.MouseEvent, data: Omit<TooltipData, 'rect'>) => void;
  hideTooltip: () => void;
}

export const AiAnalyzeModalView: React.FC<AiAnalyzeModalViewProps> = ({
  isLightTheme,
  themeMode,
  darkBgChoice,
  lightBgChoice,
  onClose,
  months,
  setMonths,
  activeCategory,
  setActiveCategory,
  visibleModules,
  selectedIds,
  onToggleModule,
  isReady,
  isGenerating,
  reCopyCopied,
  rawOnly,
  onGenerate,
  onReCopy,
  onOpenGemini,
  showTooltip,
  hideTooltip,
}) => (
  <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm overflow-y-auto overscroll-contain">
    <div className="min-h-full w-full px-3 sm:px-6 py-8 flex items-center justify-center">
      <div className="w-full max-w-2xl mx-auto">
        <div
          className="relative bg-slate-950 border border-slate-700/50 rounded-2xl overflow-hidden shadow-lg"
          style={{ height: '85vh', maxHeight: '700px' }}
        >
          {!isLightTheme ? (
            <img
              src={resolveDarkBgByMode(themeMode, darkBgChoice)}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none"
            />
          ) : (
            <img
              src={resolveLightBg(lightBgChoice)}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover opacity-60 pointer-events-none"
            />
          )}

          <AiAnalyzeHeader onClose={onClose} />

          <div className="flex flex-col h-full" style={{ height: 'calc(100% - 80px)' }}>
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4" style={{ maxHeight: 'calc(100% - 100px)' }}>
              <AiAnalyzeTimeframePicker months={months} setMonths={setMonths} />

              <div className="space-y-2">
                <AiAnalyzeCategoryChips
                  activeCategory={activeCategory}
                  setActiveCategory={setActiveCategory}
                  isLightTheme={isLightTheme}
                />

                <AiAnalyzeModuleGrid
                  visibleModules={visibleModules}
                  selectedIds={selectedIds}
                  onToggleModule={onToggleModule}
                  showTooltip={showTooltip}
                  hideTooltip={hideTooltip}
                />
              </div>
            </div>

            <AiAnalyzeFooter
              isReady={isReady}
              isGenerating={isGenerating}
              reCopyCopied={reCopyCopied}
              rawOnly={rawOnly}
              onGenerate={onGenerate}
              onOpenGemini={onOpenGemini}
              onReCopy={onReCopy}
            />
          </div>
        </div>
      </div>
    </div>
  </div>
);
