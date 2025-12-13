import React, { useRef, useState } from 'react';
import { Upload, Check, X, Trash2 } from 'lucide-react';
import MaleFrontBodyMapGroup from './MaleFrontBodyMapGroup';
import FemaleFrontBodyMapGroup from './FemaleFrontBodyMapGroup';
import type { BodyMapGender } from './BodyMap';
import type { WeightUnit } from '../utils/localStorage';

interface CSVImportModalProps {
  onFileSelect: (file: File, gender: BodyMapGender, unit: WeightUnit) => void;
  isLoading?: boolean;
  initialGender?: BodyMapGender;
  initialUnit?: WeightUnit;
  onClose?: () => void;
  onClearData?: () => void;
  onGenderChange?: (gender: BodyMapGender) => void;
  onUnitChange?: (unit: WeightUnit) => void;
}

export const CSVImportModal: React.FC<CSVImportModalProps> = ({
  onFileSelect,
  isLoading = false,
  initialGender,
  initialUnit,
  onClose,
  onClearData,
  onGenderChange,
  onUnitChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedGender, setSelectedGender] = useState<BodyMapGender | null>(initialGender ?? null);
  const [selectedUnit, setSelectedUnit] = useState<WeightUnit | null>(initialUnit ?? null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!selectedGender) {
      alert('Please select your body type first');
      return;
    }
    if (!selectedUnit) {
      alert('Please select your preferred weight unit first');
      return;
    }
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      onFileSelect(file, selectedGender, selectedUnit);
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
    
    if (!selectedGender) {
      alert('Please select your body type first');
      return;
    }
    if (!selectedUnit) {
      alert('Please select your preferred weight unit first');
      return;
    }
    
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      onFileSelect(file, selectedGender, selectedUnit);
    } else {
      alert('Please drop a valid CSV file');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 overflow-y-auto overscroll-contain">
      <div className="min-h-full w-full px-4 sm:px-6 py-6 sm:py-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Welcome to HevyAnalytics</h2>
                  <p className="text-slate-400 text-xs sm:text-sm">Select your preferences, then drop your CSV to load your dashboard.</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onClearData ? (
                <button
                  type="button"
                  onClick={onClearData}
                  className="inline-flex items-center gap-2 h-9 px-3 rounded-md text-xs font-semibold bg-red-950/40 hover:bg-red-950/60 border border-red-500/30 text-red-200"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Remove Data</span>
                  <span className="sm:hidden">Remove</span>
                </button>
              ) : null}

              {onClose ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center gap-2 h-9 px-3 rounded-md text-xs font-semibold bg-black/60 hover:bg-black/70 border border-slate-700/50 text-slate-200"
                >
                  <X className="w-4 h-4" />
                  <span className="hidden sm:inline">Close</span>
                </button>
              ) : null}
            </div>
          </div>

          <p className="text-slate-400 mb-6 text-center text-xs sm:text-sm">
            Let's get started! First, select your body type for accurate muscle visualization.
          </p>

          {/* Gender Selection with Body Map Preview */}
          <div className="w-full mb-6">
            <p className="text-sm font-semibold text-slate-300 mb-3 text-center">Select Your Body Type</p>
            <div className="grid grid-cols-2 gap-3">
            {/* Male Option */}
            <button
              onClick={() => {
                setSelectedGender('male');
                onGenderChange?.('male');
              }}
              className={`relative p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center ${
                selectedGender === 'male'
                  ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20'
                  : 'border-slate-700/50 hover:border-slate-500/70 hover:bg-black/60'
              }`}
            >
              {selectedGender === 'male' && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              <div className="h-28 sm:h-32 flex items-center justify-center overflow-hidden">
                <MaleFrontBodyMapGroup className="h-full w-auto opacity-70" />
              </div>
              <span className={`mt-1 font-semibold text-xs ${
                selectedGender === 'male' ? 'text-blue-400' : 'text-slate-400'
              }`}>
                Male
              </span>
            </button>

            {/* Female Option */}
            <button
              onClick={() => {
                setSelectedGender('female');
                onGenderChange?.('female');
              }}
              className={`relative p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center ${
                selectedGender === 'female'
                  ? 'border-pink-500 bg-pink-500/10 shadow-lg shadow-pink-500/20'
                  : 'border-slate-700/50 hover:border-slate-500/70 hover:bg-black/60'
              }`}
            >
              {selectedGender === 'female' && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              <div className="h-28 sm:h-32 flex items-center justify-center overflow-hidden">
                <FemaleFrontBodyMapGroup className="h-full w-auto opacity-70" />
              </div>
              <span className={`mt-1 font-semibold text-xs ${
                selectedGender === 'female' ? 'text-pink-400' : 'text-slate-400'
              }`}>
                Female
              </span>
            </button>
            </div>
          </div>

          {/* Weight Unit Selection */}
          <div className="w-full mb-6">
            <p className="text-sm font-semibold text-slate-300 mb-3 text-center">Select Your Preferred Weight Unit</p>
            <div className="grid grid-cols-2 gap-3">
            {/* KG Option */}
            <button
              onClick={() => {
                setSelectedUnit('kg');
                onUnitChange?.('kg');
              }}
              className={`relative p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center ${
                selectedUnit === 'kg'
                  ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/20'
                  : 'border-slate-700/50 hover:border-slate-500/70 hover:bg-black/60'
              }`}
            >
              {selectedUnit === 'kg' && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              <span className={`text-2xl font-bold ${
                selectedUnit === 'kg' ? 'text-emerald-400' : 'text-slate-400'
              }`}>
                KG
              </span>
              <span className={`mt-1 text-xs ${
                selectedUnit === 'kg' ? 'text-emerald-400/70' : 'text-slate-500'
              }`}>
                Kilograms
              </span>
            </button>

            {/* LBS Option */}
            <button
              onClick={() => {
                setSelectedUnit('lbs');
                onUnitChange?.('lbs');
              }}
              className={`relative p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center ${
                selectedUnit === 'lbs'
                  ? 'border-orange-500 bg-orange-500/10 shadow-lg shadow-orange-500/20'
                  : 'border-slate-700/50 hover:border-slate-500/70 hover:bg-black/60'
              }`}
            >
              {selectedUnit === 'lbs' && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              <span className={`text-2xl font-bold ${
                selectedUnit === 'lbs' ? 'text-orange-400' : 'text-slate-400'
              }`}>
                LBS
              </span>
              <span className={`mt-1 text-xs ${
                selectedUnit === 'lbs' ? 'text-orange-400/70' : 'text-slate-500'
              }`}>
                Pounds
              </span>
            </button>
            </div>
          </div>

          {/* Drag and Drop Area - Only enabled after gender and unit selection */}
          <div
            onDragOver={(selectedGender && selectedUnit) ? handleDragOver : undefined}
            onDrop={(selectedGender && selectedUnit) ? handleDrop : undefined}
            onClick={() => (selectedGender && selectedUnit) && fileInputRef.current?.click()}
            className={`w-full p-6 mb-6 border-2 border-dashed rounded-xl transition-all flex flex-col items-center justify-center ${
              (selectedGender && selectedUnit)
                ? 'border-slate-600 hover:border-slate-400 hover:bg-black/60 cursor-pointer'
                : 'border-slate-800 bg-black/40 cursor-not-allowed opacity-50'
            }`}
          >
            <Upload className={`w-6 h-6 sm:w-8 sm:h-8 mb-3 ${(selectedGender && selectedUnit) ? 'text-slate-500' : 'text-slate-600'}`} />
            <p className={`font-medium text-center text-sm sm:text-base ${(selectedGender && selectedUnit) ? 'text-slate-300' : 'text-slate-500'}`}>
              {(selectedGender && selectedUnit) ? 'Drag and drop your CSV here' : 'Complete selections above first'}
            </p>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              {(selectedGender && selectedUnit) ? 'or click to browse' : 'Then you can upload your CSV'}
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
            disabled={isLoading || !selectedGender || !selectedUnit}
          />

          {/* Welcome Steps */}
          <div className="w-full mb-4">
            <p className="text-xs text-slate-500 mb-2 text-center">How to export from Hevy:</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="flex flex-col items-center">
                <img src="/Step1.png" className="w-full h-auto rounded-lg border border-slate-700" alt="Step 1" loading="lazy" decoding="async" />
              </div>
              <div className="flex flex-col items-center">
                <img src="/Step2.png" className="w-full h-auto rounded-lg border border-slate-700" alt="Step 2" loading="lazy" decoding="async" />
              </div>
              <div className="flex flex-col items-center">
                <img src="/Step3.png" className="w-full h-auto rounded-lg border border-slate-700" alt="Step 3" loading="lazy" decoding="async" />
              </div>
              <div className="flex flex-col items-center">
                <img src="/Step4.png" className="w-full h-auto rounded-lg border border-slate-700" alt="Step 4" loading="lazy" decoding="async" />
              </div>
            </div>
          </div>

          {isLoading && (
            <p className="text-slate-400 text-xs sm:text-sm text-center">
              Loading your data...
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CSVImportModal;