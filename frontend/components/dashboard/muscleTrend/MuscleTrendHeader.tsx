import React from 'react';
import { AreaChart as AreaChartIcon, ChartColumnStacked, Infinity } from 'lucide-react';
import { SegmentControl } from '../../ui/SegmentControl';
import { MuscleTrendBodyIcon, MuscleTrendIcon } from './MuscleTrendIcons';

type MuscleGrouping = 'groups' | 'muscles';
type MusclePeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all';
type MuscleTrendView = 'area' | 'stackedBar';

interface MuscleTrendHeaderProps {
  muscleGrouping: MuscleGrouping;
  setMuscleGrouping: (v: MuscleGrouping) => void;
  musclePeriod: MusclePeriod;
  setMusclePeriod: (v: MusclePeriod) => void;
  muscleTrendView: MuscleTrendView;
  setMuscleTrendView: (v: MuscleTrendView) => void;
}

export const MuscleTrendHeader: React.FC<MuscleTrendHeaderProps> = ({
  muscleGrouping,
  setMuscleGrouping,
  musclePeriod,
  setMusclePeriod,
  muscleTrendView,
  setMuscleTrendView,
}) => (
  <div className="flex flex-row justify-between items-center gap-2 mb-4">
    <h3 className="text-sm sm:text-lg font-semibold text-white flex items-center gap-2">
      <MuscleTrendIcon className="w-5 h-5 text-emerald-500" />
      <span>Muscle Analysis</span>
    </h3>

    <div className="flex items-center justify-end gap-1 flex-wrap sm:flex-nowrap overflow-x-auto w-full sm:w-auto sm:overflow-visible">
      <SegmentControl
        options={[
          { value: 'groups', icon: <MuscleTrendBodyIcon className="w-3.5 h-3.5" />, title: 'Groups' },
          { value: 'muscles', icon: <MuscleTrendIcon className="w-3.5 h-3.5" />, title: 'Muscles' },
        ]}
        value={muscleGrouping}
        onChange={setMuscleGrouping}
      />

      <SegmentControl
        dataTrack="timerange-muscletrend"
        options={[
          { value: 'all', icon: <Infinity className="w-3 h-3" />, title: 'All' },
          { value: 'weekly', label: 'lst wk', title: 'Last Week' },
          { value: 'monthly', label: 'lst mo', title: 'Last Month' },
          { value: 'yearly', label: 'lst yr', title: 'Last Year' },
        ]}
        value={musclePeriod}
        onChange={setMusclePeriod}
      />

      <SegmentControl
        dataTrack="charttype-muscletrend"
        options={[
          { value: 'stackedBar', icon: <ChartColumnStacked className="w-3.5 h-3.5" />, title: 'Stacked' },
          { value: 'area', icon: <AreaChartIcon className="w-3.5 h-3.5" />, title: 'Area' },
        ]}
        value={muscleTrendView}
        onChange={setMuscleTrendView}
      />
    </div>
  </div>
);

export default MuscleTrendHeader;