import React from 'react';
import { AreaChart as AreaChartIcon, ChartBarStacked, Infinity, Zap } from 'lucide-react';
import { SegmentControl } from '../../ui/SegmentControl';
import type { TopExerciseMode, TopExercisesView } from './TopExercisesCard';

interface TopExercisesHeaderProps {
  topExerciseMode: TopExerciseMode;
  setTopExerciseMode: (m: TopExerciseMode) => void;
  topExercisesView: TopExercisesView;
  setTopExercisesView: (v: TopExercisesView) => void;
}

export const TopExercisesHeader: React.FC<TopExercisesHeaderProps> = ({
  topExerciseMode,
  setTopExerciseMode,
  topExercisesView,
  setTopExercisesView,
}) => (
  <div
    className="flex flex-row justify-between items-center mb-4 gap-3"
  >
    <h3 className="text-sm sm:text-base sm:text-lg font-semibold text-white flex items-center gap-2">
      <Zap className="w-5 h-5 text-amber-500" />
      Most Frequent Exercises
    </h3>
    <div className="flex items-center justify-end gap-1 flex-wrap sm:flex-nowrap overflow-x-auto sm:overflow-visible max-w-full">
      <SegmentControl
        dataTrack="timerange-topexercises"
        options={[
          { value: 'all', icon: <Infinity className="w-3 h-3" />, title: 'All' },
          { value: 'weekly', label: 'lst wk', title: 'Last Week' },
          { value: 'monthly', label: 'lst mo', title: 'Last Month' },
          { value: 'yearly', label: 'lst yr', title: 'Last Year' },
        ]}
        value={topExerciseMode}
        onChange={setTopExerciseMode}
      />

      <SegmentControl
        dataTrack="charttype-topexercises"
        options={[
          { value: 'barh', icon: <ChartBarStacked className="w-3 h-3" />, title: 'Bars' },
          { value: 'area', icon: <AreaChartIcon className="w-3 h-3" />, title: 'Area' },
        ]}
        value={topExercisesView}
        onChange={setTopExercisesView}
      />
    </div>
  </div>
);

export default TopExercisesHeader;