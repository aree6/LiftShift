import { formatDeltaPercentage, getDeltaFormatPreset, DELTA_FORMAT_PRESETS } from '../utils/format/deltaFormat';

// Test cases to verify the delta formatting works correctly
console.log('=== Delta Percentage Formatting Tests ===');

// Test regular percentages
console.log('Regular percentages:');
console.log(`50%: ${formatDeltaPercentage(50)}`);
console.log(`-25%: ${formatDeltaPercentage(-25)}`);
console.log(`0%: ${formatDeltaPercentage(0)}`);

// Test large percentages with compact format (now at 150% threshold)
console.log('\nLarge percentages (compact format at 150% threshold):');
console.log(`100%: ${formatDeltaPercentage(100, { compact: true })} (should be 100% - below threshold)`);
console.log(`125%: ${formatDeltaPercentage(125, { compact: true })} (should be 125% - below threshold)`);
console.log(`150%: ${formatDeltaPercentage(150, { compact: true })} (should be 2.5x - 150% increase = 2.5x total)`);
console.log(`175%: ${formatDeltaPercentage(175, { compact: true })} (should be 2.8x - 175% increase = 2.8x total)`);
console.log(`200%: ${formatDeltaPercentage(200, { compact: true })} (should be 3x - 200% increase = 3x total)`);
console.log(`250%: ${formatDeltaPercentage(250, { compact: true })} (should be 3.5x - 250% increase = 3.5x total)`);
console.log(`300%: ${formatDeltaPercentage(300, { compact: true })} (should be 4x - 300% increase = 4x total)`);

// Test with plus sign
console.log('\nWith plus sign:');
console.log(`50%: ${formatDeltaPercentage(50, { showPlus: true })}`);
console.log(`150%: ${formatDeltaPercentage(150, { showPlus: true, compact: true })}`);

// Test presets
console.log('\nPresets:');
console.log(`Badge preset 50%: ${formatDeltaPercentage(50, DELTA_FORMAT_PRESETS.COMPACT)}`);
console.log(`Badge preset 100%: ${formatDeltaPercentage(100, DELTA_FORMAT_PRESETS.COMPACT)}`);
console.log(`Badge preset 150%: ${formatDeltaPercentage(150, DELTA_FORMAT_PRESETS.COMPACT)} (should be 2.5x)`);
console.log(`Badge preset 200%: ${formatDeltaPercentage(200, DELTA_FORMAT_PRESETS.COMPACT)} (should be 3x)`);
console.log(`Chart preset 200%: ${formatDeltaPercentage(200, getDeltaFormatPreset('chart'))}`);
console.log(`Tooltip preset 200%: ${formatDeltaPercentage(200, getDeltaFormatPreset('tooltip'))}`);

// Test edge cases
console.log('\nEdge cases:');
console.log(`Infinity: ${formatDeltaPercentage(Infinity)}`);
console.log(`NaN: ${formatDeltaPercentage(NaN)}`);
console.log(`Very large: ${formatDeltaPercentage(1000)}`);

export default function testDeltaFormatting() {
  // This function can be used for manual testing
  return {
    regular: formatDeltaPercentage(50),
    compact: formatDeltaPercentage(200, { compact: true }),
    withPlus: formatDeltaPercentage(150, { showPlus: true, compact: true }),
    badge: formatDeltaPercentage(250, getDeltaFormatPreset('badge'))
  };
}
