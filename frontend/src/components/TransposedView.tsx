// Transposed calendar view: months as rows, day-of-month (1–31) as columns.
// Invalid dates (e.g. Feb 30) are rendered as grey empty cells.
import { useState } from 'react';
import type React from 'react';
import DayCell from './DayCell.js';
import { fmtDayKey } from '../lib/calendarUtils.js';
import type { EventDataItem } from '../lib/calendarUtils.js';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface TransposedViewProps {
  year: number;
  cellSize: number;
  eventsByDay: Map<string, EventDataItem[]>;
  todayKey: string;
  onDayClick: (date: Date) => void;
  onDayHover: (date: Date | null, rect?: DOMRect) => void;
  weekendHighlight: boolean;
  showEventLabels?: boolean;
}

function isValidDate(year: number, month: number, day: number): boolean {
  // If the constructed Date rolls over to a different month, the day doesn't exist
  return new Date(year, month, day).getMonth() === month;
}

export default function TransposedView({ year, cellSize, eventsByDay, todayKey, onDayClick, onDayHover, weekendHighlight, showEventLabels }: TransposedViewProps) {
  // Track hovered (month, day) to cross-highlight the row label and column header
  const [hovered, setHovered] = useState<{ m: number; day: number } | null>(null);

  const stickyRowStyle: React.CSSProperties = {
    position: 'sticky',
    left: 0,
    background: '#fafafa',
    zIndex: 1,
    fontSize: '0.75rem',
    color: '#666',
    textAlign: 'right',
    paddingRight: '6px',
    width: '2rem',
    minWidth: '2rem',
  };

  const headerCellStyle: React.CSSProperties = {
    position: 'sticky',
    top: 0,
    background: '#fafafa',
    zIndex: 2,
    fontSize: '0.75rem',
    color: '#666',
    textAlign: 'center',
    padding: '4px',
    width: cellSize,
  };

  const hlStyle: React.CSSProperties = { color: '#111', fontWeight: 700, background: '#e8e8e8' };

  function handleMouseEnter(date: Date, m: number, day: number, rect: DOMRect) {
    setHovered({ m, day });
    onDayHover(date, rect);
  }

  function handleMouseLeave() {
    setHovered(null);
    onDayHover(null);
  }

  return (
    <div style={{ overflow: 'auto', flex: 1, padding: '0.5rem' }}>
      <table style={{ borderCollapse: 'collapse' }} onMouseLeave={handleMouseLeave}>
        <thead>
          <tr>
            {/* Corner cell — sticky on both axes (zIndex 3 > row labels 1, col headers 2) */}
            <th style={{ position: 'sticky', top: 0, left: 0, zIndex: 3, background: '#fafafa', width: '2rem', minWidth: '2rem' }} />
            {/* Day-of-month headers: 1–31 */}
            {Array.from({ length: 31 }, (_, i) => (
              <th key={i} style={{ ...headerCellStyle, ...(hovered?.day === i + 1 ? hlStyle : {}) }}>{i + 1}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* One row per month */}
          {MONTH_SHORT.map((name, m) => (
            <tr key={m} style={{ borderTop: `${Math.round(cellSize * 0.07)}px solid transparent` }}>
              <td style={{ ...stickyRowStyle, ...(hovered?.m === m ? hlStyle : {}) }}>{name}</td>
              {Array.from({ length: 31 }, (_, dayIdx) => {
                const day = dayIdx + 1;
                if (!isValidDate(year, m, day)) {
                  return <td key={day} style={{ background: '#f5f5f5', width: cellSize, height: cellSize }}
                    onMouseEnter={() => { setHovered({ m, day }); onDayHover(null); }} />;
                }
                const date = new Date(year, m, day);
                return (
                  <DayCell
                    key={day}
                    date={date}
                    events={eventsByDay.get(fmtDayKey(date)) ?? []}
                    isToday={fmtDayKey(date) === todayKey}
                    cellSize={cellSize}
                    onClick={() => onDayClick(date)}
                    label={DOW[date.getDay()]}
                    weekendHighlight={weekendHighlight}
                    showEventLabels={showEventLabels}
                    onMouseEnter={(rect) => handleMouseEnter(date, m, day, rect)}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
