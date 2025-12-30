import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Upload, Check, X, ArrowLeft, ArrowRight, Trash2, UserRound, Weight, Clock, Globe } from 'lucide-react';
import MaleFrontBodyMapGroup from './MaleFrontBodyMapGroup';
import FemaleFrontBodyMapGroup from './FemaleFrontBodyMapGroup';
import type { BodyMapGender } from './BodyMap';
import type { WeightUnit, Language } from '../utils/storage/localStorage';
import { CSV_LOADING_ANIMATION_SRC } from '../constants';
import { UNIFORM_HEADER_BUTTON_CLASS, UNIFORM_HEADER_ICON_BUTTON_CLASS } from '../utils/ui/uiConstants';

type Intent = 'initial' | 'update';

type CSVImportVariant = 'csv' | 'preferences';

interface CSVImportModalProps {
  intent: Intent;
  platform: 'hevy' | 'strong' | 'lyfta' | 'other';
  variant?: CSVImportVariant;
  /** Hide the body type + weight unit selectors (used when preferences were already collected earlier in onboarding). */
  hideBodyTypeAndUnit?: boolean;
  onFileSelect?: (file: File, gender: BodyMapGender, unit: WeightUnit) => void;
  onContinue?: (gender: BodyMapGender, unit: WeightUnit) => void;
  continueLabel?: string;
  isLoading?: boolean;
  initialGender?: BodyMapGender;
  initialUnit?: WeightUnit;
  initialTimezone?: string;
  initialLanguage?: Language;
  errorMessage?: string | null;
  onBack?: () => void;
  onClose?: () => void;
  onClearCache?: () => void;
  onGenderChange?: (gender: BodyMapGender) => void;
  onUnitChange?: (unit: WeightUnit) => void;
  onTimezoneChange?: (timezone: string) => void;
  onLanguageChange?: (language: Language) => void;
}

export const CSVImportModal: React.FC<CSVImportModalProps> = ({
  intent,
  platform,
  onFileSelect,
  variant = 'csv',
  hideBodyTypeAndUnit = false,
  onContinue,
  continueLabel = 'Continue',
  isLoading = false,
  initialGender,
  initialUnit,
  initialTimezone,
  initialLanguage,
  errorMessage,
  onBack,
  onClose,
  onClearCache,
  onGenderChange,
  onUnitChange,
  onTimezoneChange,
  onLanguageChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedGender, setSelectedGender] = useState<BodyMapGender | null>(initialGender ?? null);
  const [selectedUnit, setSelectedUnit] = useState<WeightUnit | null>(initialUnit ?? null);
  const [selectedTimezone, setSelectedTimezone] = useState<string>(initialTimezone ?? 'Europe/London');
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(initialLanguage ?? 'en-GB');
  const [showExportHelp, setShowExportHelp] = useState(false);

  const showBodyTypeAndUnitSelectors = variant === 'preferences' || !hideBodyTypeAndUnit;
  const canUploadCsv = Boolean(selectedGender && selectedUnit);

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
      onFileSelect?.(file, selectedGender, selectedUnit);
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
      onFileSelect?.(file, selectedGender, selectedUnit);
    } else {
      alert('Drop a valid .csv file');
    }
  };

  const handleContinue = () => {
    if (!selectedGender) {
      alert('Choose a body type to continue');
      return;
    }
    if (!selectedUnit) {
      alert('Choose a weight unit to continue');
      return;
    }
    onContinue?.(selectedGender, selectedUnit);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm overflow-y-auto overscroll-contain">
      <div className="min-h-full w-full px-2 sm:px-3 py-8 flex items-center justify-center">
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-black/60 border border-slate-700/50 rounded-2xl p-5 sm:p-6 overflow-hidden backdrop-blur-md">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-24 -right-28 w-72 h-72 rounded-full blur-3xl bg-emerald-500/10" />
              <div className="absolute -bottom-28 -left-28 w-72 h-72 rounded-full blur-3xl bg-violet-500/10" />
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/20" />
            </div>

            <div className="relative grid grid-cols-3 items-start gap-4 mb-6">
              <div className="flex items-center justify-start">
                {onBack ? (
                  <button
                    type="button"
                    onClick={onBack}
                    className={UNIFORM_HEADER_ICON_BUTTON_CLASS}
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
                    className={`${UNIFORM_HEADER_BUTTON_CLASS} gap-2`}
                  >
                    <X className="w-4 h-4" />
                    <span className="hidden sm:inline">Close</span>
                  </button>
                ) : null}
              </div>
            </div>

          <p className="text-slate-400 mb-6 text-center text-xs sm:text-sm">
            {(() => {
              if (variant === 'preferences') {
                return "Let's get set up. Choose your body type and unit, then continue.";
              }

              // For 'other' platform we should be generic and avoid platform-specific copy
              if (platform === 'other') {
                if (showBodyTypeAndUnitSelectors) {
                  return "Let's get set up. Choose your body type and unit, then upload your CSV.";
                }
                return "Drop your CSV below.";
              }

              const platformName = platform === 'strong' ? 'Strong' : platform === 'lyfta' ? 'Lyfta' : 'Hevy';
              if (showBodyTypeAndUnitSelectors) {
                return `Let's get set up. Choose your body type and unit, then upload your ${platformName} CSV export.`;
              }
              return `Drop your ${platformName} CSV export below.`;
            })()}
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

          {showBodyTypeAndUnitSelectors ? (
            <>
              {/* Gender Selection with Body Map Preview */}
              <div className="w-full mb-6">
                <p className="text-sm font-semibold text-slate-300 mb-3 text-center inline-flex items-center justify-center gap-2 w-full">
                  <UserRound className="w-4 h-4 text-slate-300" />
                  <span>Choose your body type</span>
                </p>
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
                <p className="text-sm font-semibold text-slate-300 mb-3 text-center inline-flex items-center justify-center gap-2 w-full">
                  <Weight className="w-4 h-4 text-slate-300" />
                  <span>Choose your weight unit</span>
                </p>
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

              {/* Language Selection */}
              <div className="w-full mb-6">
                <p className="text-sm font-semibold text-slate-300 mb-3 text-center inline-flex items-center justify-center gap-2 w-full">
                  <Globe className="w-4 h-4 text-slate-300" />
                  <span>Choose your language</span>
                </p>
                <div className="grid grid-cols-2 gap-3">
                {/* UK English Option */}
                <button
                  onClick={() => {
                    setSelectedLanguage('en-GB');
                    onLanguageChange?.('en-GB');
                  }}
                  className={`relative p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center ${
                    selectedLanguage === 'en-GB'
                      ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20'
                      : 'border-slate-700/50 hover:border-slate-500/70 hover:bg-black/60'
                  }`}
                >
                  {selectedLanguage === 'en-GB' && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <span className={`text-2xl font-bold ${
                    selectedLanguage === 'en-GB' ? 'text-blue-400' : 'text-slate-400'
                  }`}>
                    🇬🇧
                  </span>
                  <span className={`mt-1 text-xs ${
                    selectedLanguage === 'en-GB' ? 'text-blue-400/70' : 'text-slate-500'
                  }`}>
                    English (UK)
                  </span>
                </button>

                {/* US English Option */}
                <button
                  onClick={() => {
                    setSelectedLanguage('en-US');
                    onLanguageChange?.('en-US');
                  }}
                  className={`relative p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center ${
                    selectedLanguage === 'en-US'
                      ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20'
                      : 'border-slate-700/50 hover:border-slate-500/70 hover:bg-black/60'
                  }`}
                >
                  {selectedLanguage === 'en-US' && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <span className={`text-2xl font-bold ${
                    selectedLanguage === 'en-US' ? 'text-purple-400' : 'text-slate-400'
                  }`}>
                    🇺🇸
                  </span>
                  <span className={`mt-1 text-xs ${
                    selectedLanguage === 'en-US' ? 'text-purple-400/70' : 'text-slate-500'
                  }`}>
                    English (US)
                  </span>
                </button>
                </div>
              </div>

              {/* Timezone Selection */}
              <div className="w-full mb-6">
                <p className="text-sm font-semibold text-slate-300 mb-3 text-center inline-flex items-center justify-center gap-2 w-full">
                  <Clock className="w-4 h-4 text-slate-300" />
                  <span>Choose your timezone</span>
                </p>
                <div className="grid grid-cols-1 gap-3">
                  <select
                    value={selectedTimezone}
                    onChange={(e) => {
                      setSelectedTimezone(e.target.value);
                      onTimezoneChange?.(e.target.value);
                    }}
                    className="w-full p-3 rounded-xl border-2 border-slate-700/50 bg-black/60 text-slate-200 hover:border-slate-500/70 focus:border-blue-500 focus:bg-blue-500/10 focus:outline-none transition-all duration-200"
                  >
                    <optgroup label="United Kingdom">
                      <option value="Europe/London">London (GMT/BST)</option>
                    </optgroup>
                    <optgroup label="United States">
                      <option value="America/New_York">Eastern Time (ET)</option>
                      <option value="America/Chicago">Central Time (CT)</option>
                      <option value="America/Denver">Mountain Time (MT)</option>
                      <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    </optgroup>
                    <optgroup label="Europe">
                      <option value="Europe/Paris">Paris (CET/CEST)</option>
                      <option value="Europe/Berlin">Berlin (CET/CEST)</option>
                      <option value="Europe/Madrid">Madrid (CET/CEST)</option>
                      <option value="Europe/Rome">Rome (CET/CEST)</option>
                      <option value="Europe/Dublin">Dublin (GMT/IST)</option>
                    </optgroup>
                    <optgroup label="Asia">
                      <option value="Asia/Dubai">Dubai (GST)</option>
                      <option value="Asia/Kolkata">India (IST)</option>
                      <option value="Asia/Singapore">Singapore (SGT)</option>
                      <option value="Asia/Tokyo">Tokyo (JST)</option>
                      <option value="Asia/Hong_Kong">Hong Kong (HKT)</option>
                    </optgroup>
                    <optgroup label="Australia">
                      <option value="Australia/Sydney">Sydney (AEDT/AEST)</option>
                      <option value="Australia/Melbourne">Melbourne (AEDT/AEST)</option>
                      <option value="Australia/Perth">Perth (AWST)</option>
                    </optgroup>
                    <optgroup label="Other">
                      <option value="UTC">UTC</option>
                    </optgroup>
                  </select>
                </div>
              </div>
            </>
          ) : null}

          {variant === 'preferences' ? (
            <button
              type="button"
              onClick={handleContinue}
              disabled={isLoading || !selectedGender || !selectedUnit}
              className={`${UNIFORM_HEADER_BUTTON_CLASS} w-full h-11 text-sm font-semibold disabled:opacity-60 gap-2`}
            >
              <span>{continueLabel}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <>
              {/* Drag and Drop Area - Only enabled after gender and unit selection */}
              <div
                onDragOver={canUploadCsv ? handleDragOver : undefined}
                onDrop={canUploadCsv ? handleDrop : undefined}
                onClick={() => canUploadCsv && fileInputRef.current?.click()}
                className={`w-full p-6 mb-6 border-2 border-dashed rounded-xl transition-all flex flex-col items-center justify-center ${
                  canUploadCsv
                    ? 'border-slate-600 hover:border-slate-400 hover:bg-black/60 cursor-pointer'
                    : 'border-slate-800 bg-black/40 cursor-not-allowed opacity-50'
                }`}
              >
                <Upload className={`w-6 h-6 sm:w-8 sm:h-8 mb-3 ${canUploadCsv ? 'text-slate-500' : 'text-slate-600'}`} />
                <p className={`font-medium text-center text-sm sm:text-base ${canUploadCsv ? 'text-slate-300' : 'text-slate-500'}`}>
                  {canUploadCsv
                    ? (platform === 'other' ? 'Drop your CSV here' : `Drop your ${platform === 'strong' ? 'Strong' : platform === 'lyfta' ? 'Lyfta' : 'Hevy'} CSV here`)
                    : hideBodyTypeAndUnit
                    ? 'Go back to choose body type + unit first'
                    : 'Choose body type + unit first'}
                </p>
                <p className="text-slate-500 text-xs sm:text-sm mt-1">
                  {canUploadCsv ? 'or click to choose a file' : 'Then upload your CSV'}
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                disabled={isLoading || !canUploadCsv}
              />
            </>
          )}

          {/* Export help section - toggled by bottom button (hidden for unknown platforms) */}
          {variant === 'csv' && platform !== 'other' && showExportHelp ? (
            <div className="w-full mb-4">
              {platform === 'hevy' ? (
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
                ) : platform === 'strong' ? (
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <img src="/StrongStep1.png" className="w-full h-auto rounded-lg border border-slate-700" alt="Strong export step 1" loading="lazy" decoding="async" />
                      <img src="/StrongStep2.png" className="w-full h-auto rounded-lg border border-slate-700" alt="Strong export step 2" loading="lazy" decoding="async" />
                      <img src="/StrongStep3.png" className="w-full h-auto rounded-lg border border-slate-700" alt="Strong export step 3" loading="lazy" decoding="async" />
                    </div>
                  </div>
                ) : (
                  <div className="mt-3">
                    <p className="text-xs text-slate-400 text-center">
                      Support is English-only right now. Make sure your Lyfta app language is set to English before exporting.
                    </p>
                  </div>
                )}
            </div>
          ) : null}

          {isLoading && (
            <p className="text-slate-400 text-xs sm:text-sm text-center">
              Importing your data...
            </p>
          )}

          {/* Action buttons row - See how to export CSV + Clear cache */}
          {variant === 'csv' ? (
            <div className="mt-4 flex items-center justify-center gap-3">
              {platform !== 'other' ? (
                <button
                  type="button"
                  onClick={() => setShowExportHelp((v) => !v)}
                  className={`${UNIFORM_HEADER_BUTTON_CLASS} h-10 text-sm font-semibold gap-2`}
                >
                  <Upload className="w-4 h-4" />
                  <span className="hidden sm:inline">{showExportHelp ? 'Hide export guide' : 'How to export CSV'}</span>
                  <span className="sm:hidden">{showExportHelp ? 'Hide' : 'Export guide'}</span>
                </button>
              ) : null}

              {onClearCache ? (
                <button
                  type="button"
                  onClick={onClearCache}
                  disabled={isLoading}
                  className={`${UNIFORM_HEADER_BUTTON_CLASS} h-10 text-sm font-semibold disabled:opacity-60 gap-2`}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Clear cache</span>
                </button>
              ) : null}
            </div>
          ) : onClearCache ? (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={onClearCache}
                disabled={isLoading}
                className={`${UNIFORM_HEADER_BUTTON_CLASS} h-10 text-sm font-semibold disabled:opacity-60 gap-2`}
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear cache</span>
              </button>
            </div>
          ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CSVImportModal;