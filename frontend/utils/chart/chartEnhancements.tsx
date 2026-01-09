import React from 'react';
import { Area, Line } from 'recharts';
import { formatNumber } from '../format/formatters';
import type { WeightUnit } from '../storage/localStorage';

export const getRechartsXAxisInterval = (pointCount: number, maxTicks: number = 8): number => {
  const n = Number.isFinite(pointCount) ? pointCount : 0;
  const m = Number.isFinite(maxTicks) ? maxTicks : 0;
  if (n <= 0) return 0;
  if (m <= 1) return n;
  return Math.max(0, Math.ceil(n / m) - 1);
};

export const RECHARTS_XAXIS_PADDING = { left: 16, right: 16 } as const;

// Custom dot component to show values above data points
export const ValueDot = (props: any) => {
  const { cx, cy, payload, index, data, valueKey, unit, showEveryOther = true, color = "var(--text-muted)" } = props;
  
  if (!payload) return null;
  
  const value = payload[valueKey];
  if (typeof value !== 'number') return null;
  
  // Show labels only for every other point to reduce clutter, or for significant points
  const shouldShowLabel = !showEveryOther || index % 2 === 0 || index === data.length - 1 || index === 0;
  
  if (!shouldShowLabel) {
    return (
      <circle 
        cx={cx} 
        cy={cy} 
        r={3} 
        fill={color} 
        stroke={color} 
        strokeWidth={1}
      />
    );
  }
  
  const displayValue = unit 
    ? `${formatNumber(value, { maxDecimals: 1 })}${unit}`
    : (Number.isInteger(value) ? value.toString() : formatNumber(value, { maxDecimals: 1 }));
  
  return (
    <g>
      <circle 
        cx={cx} 
        cy={cy} 
        r={3} 
        fill={color} 
        stroke={color} 
        strokeWidth={1}
      />
      <text
        x={cx}
        y={cy - 10}
        fill={color}
        fontSize={9}
        fontWeight="bold"
        textAnchor="middle"
      >
        {displayValue}
      </text>
    </g>
  );
};

// Enhanced Area chart component with value dots
export const EnhancedAreaChart = ({ 
  dataKey, 
  valueKey, 
  unit, 
  showEveryOther = true,
  ...props 
}: any) => {
  return (
    <>
      {/* Main area without dots */}
      <Area
        {...props}
        dataKey={dataKey}
        dot={false}
      />
      
      {/* Separate line with value dots */}
      <Line
        type="monotone"
        dataKey={valueKey}
        stroke="transparent"
        strokeWidth={0}
        dot={<ValueDot valueKey={valueKey} unit={unit} showEveryOther={showEveryOther} data={props.data} />}
        activeDot={{ r: 5, strokeWidth: 0 }}
        isAnimationActive={true}
        animationDuration={1000}
      />
    </>
  );
};

// Enhanced Line chart component with value dots
export const EnhancedLineChart = ({ 
  valueKey, 
  unit, 
  showEveryOther = true,
  ...props 
}: any) => {
  return (
    <Line
      {...props}
      dot={<ValueDot valueKey={valueKey} unit={unit} showEveryOther={showEveryOther} data={props.data} />}
      activeDot={{ r: 5, strokeWidth: 0 }}
    />
  );
};
