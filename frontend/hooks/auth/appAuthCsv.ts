import { WeightUnit } from '../../utils/storage/localStorage';
import type { DataSourceChoice } from '../../utils/storage/dataSourceStorage';
import { addCombinedDataSource, saveLastCsvPlatform, saveLastLoginMethod, saveSetupComplete } from '../../utils/storage/dataSourceStorage';
import { getHevyUsernameOrEmail } from '../../utils/storage/hevyCredentialsStorage';
import { saveCSVData } from '../../utils/storage/localStorage';
import { clearHistoryTruncation } from '../../app/state/historyTruncation';
import { identifyPersonalRecords } from '../../utils/analysis/core';
import { getErrorMessage } from '../../app/ui';
import { parseWorkoutCSVAsyncWithUnit, ParseWorkoutCsvResult } from '../../utils/csv/csvParser';
import { parseMotraCSV } from '../../utils/csv/motraParser';
import { trackEvent, identifyUser } from '../../utils/integrations/analytics';
import { getAnalyticsClientId } from '../../utils/integrations/analyticsClientId';
import type { AppAuthHandlersDeps } from './appAuthTypes';


export const runCsvImport = (
  deps: AppAuthHandlersDeps,
  file: File,
  platform: DataSourceChoice,
  unitOverride?: WeightUnit
): void => {
  trackEvent('csv_import_start', { platform, unit: unitOverride ?? deps.weightUnit });
  deps.setLoadingKind('csv');
  deps.setIsAnalyzing(true);
  const startedAt = deps.startProgress();

  const xlsxMimeTypes = new Set([
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel.sheet.macroenabled.12',
  ]);
  const normalizedFileName = file.name.toLowerCase();
  const isXlsx = normalizedFileName.endsWith('.xlsx') || xlsxMimeTypes.has(file.type);

  const reader = new FileReader();

  reader.onload = async (e) => {
    let text = '';
    try {
      if (isXlsx) {
        // Heavy parser (~MBs) loaded only on the .xlsx path so CSV users never download it.
        const XLSX = await import('xlsx');
        const data = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) throw new Error('No sheets found in Excel file');
        const worksheet = workbook.Sheets[firstSheetName];
        text = XLSX.utils.sheet_to_csv(worksheet);
      } else {
        text = e.target?.result as string;
      }
    } catch (err) {
      deps.setCsvImportError('Failed to parse Excel file. Please try exporting as CSV.');
      deps.finishProgress(startedAt);
      return;
    }

    if (typeof text === 'string' && text.length > 0) {
      deps.setCsvImportError(null);

      const unit = unitOverride ?? deps.weightUnit;
      const isMotraFormat = platform === 'motra' || (platform === 'other' && text.includes('Workout Start'));
      const parsePromise = isMotraFormat
        ? parseMotraCSV(text, { unit })
        : parseWorkoutCSVAsyncWithUnit(text, { unit });

      parsePromise
        .then((result: ParseWorkoutCsvResult) => {
          const enriched = identifyPersonalRecords(result.sets);
          const sourced = enriched.map((s) => ({ ...s, source: platform }));
          trackEvent('csv_import_success', {
            platform,
            unit,
            sets: result.sets?.length,
            enriched_sets: sourced?.length,
          });

          // CSV users have no login — identify by stable client_id so their
          // history merges and retention/LTV become measurable (was anonymous).
          identifyUser(getAnalyticsClientId(), { login_method: 'csv', platform });

          deps.setParsedData(sourced);
          clearHistoryTruncation();
          saveCSVData(text);
          saveLastCsvPlatform(platform);
          saveLastLoginMethod(
            platform,
            'csv',
            platform === 'hevy' ? (getHevyUsernameOrEmail() ?? undefined) : undefined
          );
          deps.setDataSource(platform);
          addCombinedDataSource(platform);
          saveSetupComplete(true);
          deps.setOnboarding(null);
        })
        .catch((err) => {
          trackEvent('csv_import_error', { platform });
          deps.setCsvImportError(getErrorMessage(err));
        })
        .finally(() => {
          deps.setSelectedMonth('all');
          deps.setSelectedDay(null);
          deps.finishProgress(startedAt);
        });
    } else {
      deps.setCsvImportError('File is empty or contains invalid characters. Please try exporting again.');
      deps.finishProgress(startedAt);
    }
  };

  reader.onerror = () => {
    deps.setCsvImportError('Failed to read file');
    deps.finishProgress(startedAt);
  };

  if (isXlsx) {
    reader.readAsArrayBuffer(file);
  } else {
    reader.readAsText(file);
  }
};
