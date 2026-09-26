import React from 'react';
import { Grid3X3, Infinity, Scan } from 'lucide-react';
import { SegmentControl } from '../../ui/SegmentControl';
import { WeeklySetsBodyIcon } from './WeeklySetsIcons';

type WeeklySetsView = 'radar' | 'heatmap';
type WeeklySetsWindow = 'all' | '7d' | '30d' | '365d';

interface WeeklySetsHeaderProps {
  weeklySetsView: WeeklySetsView;
  setWeeklySetsView: (v: WeeklySetsView) => void;
  muscleCompQuick: WeeklySetsWindow;
  setMuscleCompQuick: (v: WeeklySetsWindow) => void;
}

export const WeeklySetsHeader: React.FC<WeeklySetsHeaderProps> = ({
  weeklySetsView,
  setWeeklySetsView,
  muscleCompQuick,
  setMuscleCompQuick,
}) => (
  <div className="relative z-30 flex flex-row justify-between items-center gap-2 mb-4">
    <h3 className="text-sm sm:text-lg font-semibold text-white flex items-center gap-2">
      <WeeklySetsBodyIcon className="w-5 h-5 text-cyan-500" />
      <span>Weekly sets</span>
    </h3>

    <div className="flex items-center justify-end gap-1 flex-wrap sm:flex-nowrap overflow-x-auto sm:overflow-visible">
      <SegmentControl
        dataTrack="charttype-weeklysets"
        options={[
          { value: 'radar', icon: <Scan className="w-3 h-3" />, title: 'Radar' },
          { value: 'heatmap', icon: <Grid3X3 className="w-3 h-3" />, title: 'Heatmap' },
        ]}
        value={weeklySetsView}
        onChange={setWeeklySetsView}
      />

      <SegmentControl
        dataTrack="timerange-weeklysets"
        options={[
          { value: 'all', icon: <Infinity className="w-3 h-3" />, title: 'All' },
          { value: '7d', label: 'lst wk', title: 'Last week' },
          { value: '30d', label: 'lst mo', title: 'Last month' },
          { value: '365d', label: 'lst yr', title: 'Last year' },
        ]}
        value={muscleCompQuick}
        onChange={setMuscleCompQuick}
      />
    </div>
  </div>
);

export default WeeklySetsHeader;
