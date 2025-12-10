import React, { useRef } from 'react';
import { Upload, AlertCircle } from 'lucide-react';

interface CSVImportModalProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
}

export const CSVImportModal: React.FC<CSVImportModalProps> = ({ onFileSelect, isLoading = false }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv' || file?.name.endsWith('.csv')) {
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
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 flex flex-col items-center">
        <div className="w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center mb-6">
          <Upload className="w-6 h-6 text-blue-500" />
        </div>

        <h2 className="text-2xl font-bold text-white mb-2 text-center">Welcome to HevyAnalytics</h2>
        <p className="text-slate-400 mb-8 text-center text-sm">
          Let's get started! Import your Hevy workout CSV to begin tracking your fitness journey.
        </p>

        {/* Drag and Drop Area */}
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="w-full p-8 mb-6 border-2 border-dashed border-slate-600 rounded-xl hover:border-slate-400 hover:bg-slate-800/50 transition-all cursor-pointer flex flex-col items-center justify-center"
        >
          <Upload className="w-8 h-8 text-slate-500 mb-3" />
          <p className="text-slate-300 font-medium text-center">Drag and drop your CSV here</p>
          <p className="text-slate-500 text-sm mt-1">or click to browse</p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
          disabled={isLoading}
        />

        {/* Info Box */}
        <div className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-6">
          <div className="flex gap-3">
            <AlertCircle className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-slate-300 mb-1">Expected CSV Format</p>
              <p className="text-xs text-slate-400">
                Your CSV should include: title, start_time, end_time, description, exercise_title, superset_id, exercise_notes, set_index, set_type, weight_kg, reps, distance_km, duration_seconds, rpe
              </p>
            </div>
          </div>
        </div>

        {isLoading && (
          <p className="text-slate-400 text-sm">
            Loading your data...
          </p>
        )}
      </div>
    </div>
  );
};
