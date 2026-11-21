import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useReducedMotion } from 'motion/react';
import { formatCompact, formatNumber, formatWeek } from '../../../utils/format.js';
import styles from './CommitActivityChart.module.css';

import { describeActivity, plural } from '../utils/describe.js';

function ActivityTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const week = payload[0].payload;
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipLabel}>Week of {formatWeek(week.weekStart)}</p>
      <p className={styles.tooltipValue}>{plural(week.commits, 'commit')}</p>
      {week.inProgress && <p className={styles.tooltipNote}>Week in progress</p>}
    </div>
  );
}

/**
 * Weekly commits for the latest 12 weeks.
 * One series, so no legend. Only the busiest week carries a value label; the
 * axis, tooltip and table carry the rest.
 *
 * @param {{ activity: import('../utils/normalize.js').CommitActivity }} props
 */
export default function CommitActivityChart({ activity }) {
  const [view, setView] = useState('chart');
  const reduceMotion = useReducedMotion();
  const summary = describeActivity(activity);
  const peakWeek = activity.peak?.weekStart;
  const data = activity.weeks.map((week) => ({ ...week, label: formatWeek(week.weekStart) }));

  return (
    <figure className={styles.figure}>
      <div className={styles.toolbar}>
        <figcaption className={styles.summary}>{summary}</figcaption>
        <div className={styles.switch} role="group" aria-label="Display">
          {['chart', 'table'].map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={view === option}
              className={styles.switchButton}
              onClick={() => setView(option)}
            >
              {option === 'chart' ? 'Chart' : 'Table'}
            </button>
          ))}
        </div>
      </div>

      {view === 'chart' ? (
        <div className={styles.chart}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 20, right: 4, bottom: 0, left: 0 }}
              barCategoryGap="22%"
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={16}
                tickMargin={8}
                className={styles.axis}
              />
              <YAxis
                allowDecimals={false}
                tickFormatter={formatCompact}
                tickLine={false}
                axisLine={false}
                width={40}
                className={styles.axis}
              />
              <Tooltip
                content={<ActivityTooltip />}
                cursor={{ className: styles.cursor }}
                isAnimationActive={false}
              />
              <Bar
                dataKey="commits"
                name="Commits"
                maxBarSize={24}
                radius={[4, 4, 0, 0]}
                isAnimationActive={!reduceMotion}
                animationDuration={400}
              >
                {data.map((week) => (
                  <Cell
                    key={week.weekStart}
                    className={week.inProgress ? styles.barPartial : styles.bar}
                  />
                ))}
                <LabelList
                  dataKey="commits"
                  position="top"
                  className={styles.peakLabel}
                  content={({ x, y, width, value, index }) =>
                    data[index]?.weekStart === peakWeek ? (
                      <text
                        x={x + width / 2}
                        y={y - 6}
                        textAnchor="middle"
                        className={styles.peakLabel}
                      >
                        {formatNumber(value)}
                      </text>
                    ) : null
                  }
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className="visually-hidden">Weekly commits</caption>
            <thead>
              <tr>
                <th scope="col">Week of</th>
                <th scope="col">Commits</th>
              </tr>
            </thead>
            <tbody>
              {data.map((week) => (
                <tr key={week.weekStart}>
                  <th scope="row">
                    {week.label}
                    {week.inProgress && <span className={styles.partialTag}> (in progress)</span>}
                  </th>
                  <td>{formatNumber(week.commits)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {activity.weeks.at(-1)?.inProgress && view === 'chart' && (
        <p className={styles.footnote}>
          <span className={styles.partialSwatch} aria-hidden="true" /> Current week, still in
          progress
        </p>
      )}
    </figure>
  );
}
