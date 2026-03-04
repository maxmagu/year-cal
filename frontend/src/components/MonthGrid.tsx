import DayCell from './DayCell.js';
import { getMonthDays, fmtDayKey } from '../lib/calendarUtils.js';
import type { EventDataItem } from '../lib/calendarUtils.js';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface MonthGridProps {
  year: number;
  month: number; // 0-indexed
  cellSize: number;
  eventsByDay: Map<string, EventDataItem[]>;
  todayKey: string;
  onDayClick: (date: Date) => void;
  onDayHover: (date: Date | null, rect?: DOMRect) => void;
  showEventLabels?: boolean;
  backgroundCalendarUrls?: Set<string>;
}

export default function MonthGrid({ year, month, cellSize, eventsByDay, todayKey, onDayClick, onDayHover, showEventLabels, backgroundCalendarUrls }: MonthGridProps) {
  const cells = getMonthDays(year, month);
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <table style={{ borderCollapse: 'separate', borderSpacing: 2 }}>
      <thead>
        <tr>
          <th colSpan={7} style={{ fontSize: '0.85rem', padding: '4px 0', textAlign: 'center', fontWeight: 600 }}>
            {MONTH_NAMES[month]}
          </th>
        </tr>
        <tr>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <th key={i} style={{ width: cellSize, fontSize: '0.7rem', color: '#aaa', fontWeight: 400, textAlign: 'left', paddingLeft: 5, padding: '2px 0 2px 5px' }}>
              {d}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {weeks.map((week, wi) => (
          <tr key={wi}>
            {week.map((date, di) => date
              ? <DayCell
                  key={di}
                  date={date}
                  events={eventsByDay.get(fmtDayKey(date)) ?? []}
                  isToday={fmtDayKey(date) === todayKey}
                  cellSize={cellSize}
                  onClick={() => onDayClick(date)}
                  showEventLabels={showEventLabels}
                  backgroundCalendarUrls={backgroundCalendarUrls}
                  onMouseEnter={(rect) => onDayHover(date, rect)}
                  onMouseLeave={() => onDayHover(null)}
                />
              : <td key={di} style={{ width: cellSize, height: cellSize }} />
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
