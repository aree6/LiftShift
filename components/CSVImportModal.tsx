import React, { useEffect, useRef, useState } from 'react';
import { Upload, Check, X, ArrowLeft } from 'lucide-react';
import MaleFrontBodyMapGroup from './MaleFrontBodyMapGroup';
import FemaleFrontBodyMapGroup from './FemaleFrontBodyMapGroup';
import type { BodyMapGender } from './BodyMap';
import type { WeightUnit } from '../utils/storage/localStorage';
import { CSV_LOADING_ANIMATION_SRC } from '../constants';

type Intent = 'initial' | 'update';

interface CSVImportModalProps {
  intent: Intent;
  platform: 'hevy' | 'strong';
  onFileSelect: (file: File, gender: BodyMapGender, unit: WeightUnit) => void;
  isLoading?: boolean;
  initialGender?: BodyMapGender;
  initialUnit?: WeightUnit;
  errorMessage?: string | null;
  onBack?: () => void;
  onClose?: () => void;
  onGenderChange?: (gender: BodyMapGender) => void;
  onUnitChange?: (unit: WeightUnit) => void;
}

export const CSVImportModal: React.FC<CSVImportModalProps> = ({
  intent,
  platform,
  onFileSelect,
  isLoading = false,
  initialGender,
  initialUnit,
  errorMessage,
  onBack,
  onClose,
  onGenderChange,
  onUnitChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedGender, setSelectedGender] = useState<BodyMapGender | null>(initialGender ?? null);
  const [selectedUnit, setSelectedUnit] = useState<WeightUnit | null>(initialUnit ?? null);
  const [showExportHelp, setShowExportHelp] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(CSV_LOADING_ANIMATION_SRC, {
      method: 'GET',
      mode: 'cors',
      cache: 'force-cache',
      signal: controller.signal,
    }).catch(() => {});
    return () => controller.abort();
  }, []);

  const showNonEnglishHevyDateHelp = Boolean(
    errorMessage && errorMessage.includes("couldn't parse the workout dates")
  );

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!selectedGender) {
      alert('Choose a body type to continue');
      return;
    }
    if (!selectedUnit) {
      alert('Choose a weight unit to continue');
      return;
    }
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      onFileSelect(file, selectedGender, selectedUnit);
    } else {
      alert('Please choose a valid .csv file');
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
      alert('Choose a body type to continue');
      return;
    }
    if (!selectedUnit) {
      alert('Choose a weight unit to continue');
      return;
    }
    
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      onFileSelect(file, selectedGender, selectedUnit);
    } else {
      alert('Drop a valid .csv file');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 overflow-y-auto overscroll-contain">
      <div className="min-h-full w-full px-2 sm:px-3 pt-10 pb-4 sm:pt-12 sm:pb-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-3 items-start gap-4 mb-6">
            <div className="flex items-center justify-start">
              {onBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-md text-xs font-semibold bg-black/60 hover:bg-black/70 border border-slate-700/50 text-slate-200"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : null}
            </div>

            <div className="flex justify-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">LiftShift</h2>
            </div>

            <div className="flex items-center justify-end">
              {intent === 'update' && onClose ? (
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
            {platform === 'strong'
              ? 'Let’s get set up. Choose your body type and unit, then upload your Strong CSV export.'
              : 'Let’s get set up. Choose your body type and unit, then upload your Hevy CSV export.'}
          </p>

          {errorMessage ? (
            <div className="mb-6 rounded-lg border border-red-500/30 bg-red-950/40 px-4 py-3 text-xs sm:text-sm text-red-200">
              {errorMessage}
              {showNonEnglishHevyDateHelp ? (
                <div className="mt-3">
                  <img
                    src="/step5.png"
                    className="w-full max-w-sm h-auto rounded-lg border border-red-500/20 mx-auto"
                    alt="Hevy export language must be English"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Gender Selection with Body Map Preview */}
          <div className="w-full mb-6">
            <p className="text-sm font-semibold text-slate-300 mb-3 text-center">Choose your body type</p>
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
            <p className="text-sm font-semibold text-slate-300 mb-3 text-center">Choose your weight unit</p>
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
              {(selectedGender && selectedUnit)
                ? `Drop your ${platform === 'strong' ? 'Strong' : 'Hevy'} CSV here`
                : 'Choose body type + unit first'}
            </p>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              {(selectedGender && selectedUnit) ? 'or click to choose a file' : 'Then upload your CSV'}
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

          <div className="w-full mb-4">
            <button
              type="button"
              onClick={() => setShowExportHelp((v) => !v)}
              className="w-full text-center text-sm font-semibold text-blue-400 hover:text-blue-300 underline underline-offset-4"
            >
              {showExportHelp ? 'Hide: See how to export .CSV' : 'See how to export .CSV'}
            </button>

            {showExportHelp ? (
              platform === 'hevy' ? (
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <img src="/Step1.png" className="w-full h-auto rounded-lg border border-slate-700" alt="Hevy export step 1" loading="lazy" decoding="async" />
                    <img src="/Step2.png" className="w-full h-auto rounded-lg border border-slate-700" alt="Hevy export step 2" loading="lazy" decoding="async" />
                    <img src="/Step3.png" className="w-full h-auto rounded-lg border border-slate-700" alt="Hevy export step 3" loading="lazy" decoding="async" />
                    <img src="/Step4.png" className="w-full h-auto rounded-lg border border-slate-700" alt="Hevy export step 4" loading="lazy" decoding="async" />
                  </div>

                  <div className="flex justify-center">
                    <img
                      src="/step5.png"
                      className="w-full max-w-xs h-auto rounded-lg border border-slate-700/60"
                      alt="Set Hevy export language to English"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>

                  <div className="text-xs text-slate-400 text-center">
                    Support is English-only right now. Make sure your Hevy app language is set to English before exporting.
                  </div>
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <img src="/StrongStep1.png" className="w-full h-auto rounded-lg border border-slate-700" alt="Strong export step 1" loading="lazy" decoding="async" />
                    <img src="/StrongStep2.png" className="w-full h-auto rounded-lg border border-slate-700" alt="Strong export step 2" loading="lazy" decoding="async" />
                    <img src="/StrongStep3.png" className="w-full h-auto rounded-lg border border-slate-700" alt="Strong export step 3" loading="lazy" decoding="async" />
                  </div>
                </div>
              )
            ) : null}
          </div>

          {isLoading && (
            <p className="text-slate-400 text-xs sm:text-sm text-center">
              Importing your data...
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CSVImportModal;