import React, { useRef } from 'react';
import { Upload } from 'lucide-react';

// ❌ DELETED: Do not import files located in the public folder.
// The build tool automatically serves everything in 'public' at the root URL.

interface CSVImportModalProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
}

export const CSVImportModal: React.FC<CSVImportModalProps> = ({ onFileSelect, isLoading = false }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      onFileSelect(file);
    } else {
      alert('Please select a valid CSV file');
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      onFileSelect(file);
    } else {
      alert('Please drop a valid CSV file');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 flex flex-col items-center">
        <div className="w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center mb-6">
          <Upload className="w-6 h-6 text-blue-500" />
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 text-center">Welcome to HevyAnalytics</h2>
        <p className="text-slate-400 mb-6 sm:mb-8 text-center text-xs sm:text-sm">
          Let's get started! Import your Hevy workout CSV to begin tracking your fitness journey.
        </p>

        {/* Drag and Drop Area */}
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="w-full p-6 sm:p-8 mb-6 border-2 border-dashed border-slate-600 rounded-xl hover:border-slate-400 hover:bg-slate-800/50 transition-all cursor-pointer flex flex-col items-center justify-center"
        >
          <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-slate-500 mb-3" />
          <p className="text-slate-300 font-medium text-center text-sm sm:text-base">Drag and drop your CSV here</p>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">or click to browse</p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
          disabled={isLoading}
        />

        {/* Welcome Steps */}
        <div className="w-full mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="flex flex-col items-center gap-2">
              {/* ✅ FIXED: Use string paths pointing to root (files are in public/) */}
              <img src="/Step1.png" className="w-full h-auto rounded-lg border border-slate-700" alt="Step 1" loading="lazy" decoding="async" />
            </div>
            <div className="flex flex-col items-center gap-2">
              <img src="/Step2.png" className="w-full h-auto rounded-lg border border-slate-700" alt="Step 2" loading="lazy" decoding="async" />
            </div>
            <div className="flex flex-col items-center gap-2">
              <img src="/Step3.png" className="w-full h-auto rounded-lg border border-slate-700" alt="Step 3" loading="lazy" decoding="async" />
            </div>
            <div className="flex flex-col items-center gap-2">
              <img src="/Step4.png" className="w-full h-auto rounded-lg border border-slate-700" alt="Step 4" loading="lazy" decoding="async" />
            </div>
          </div>
        </div>

        {isLoading && (
          <p className="text-slate-400 text-xs sm:text-sm">
            Loading your data...
          </p>
        )}
      </div>
    </div>
  );
};