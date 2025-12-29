import { parse, isValid } from 'date-fns';
import { DATE_FORMAT_HEVY } from './dateUtils';

export const parseHevyDateString = (value: string): Date | undefined => {
  if (!value) return undefined;
  try {
    const d = parse(value, DATE_FORMAT_HEVY, new Date(0));
    return isValid(d) ? d : undefined;
  } catch {
    return undefined;
  }
};
