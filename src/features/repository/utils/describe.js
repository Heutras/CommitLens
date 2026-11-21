import { formatNumber, formatWeek } from '../../../utils/format.js';

export const plural = (count, word) => `${formatNumber(count)} ${word}${count === 1 ? '' : 's'}`;

/** Text equivalent of the chart, used for screen readers and the table view. */
export function describeActivity(activity) {
  const parts = [`${plural(activity.total, 'commit')} in the last ${activity.weeks.length} weeks.`];
  if (activity.peak) {
    parts.push(
      `Busiest week: ${formatWeek(activity.peak.weekStart)}, with ${plural(activity.peak.commits, 'commit')}.`,
    );
  }
  return parts.join(' ');
}
