import { useState } from 'react';
import type React from 'react';
import DayCell from './DayCell.js';
import { fmtDayKey } from '../lib/calendarUtils.js';
import type { EventDataItem } from '../lib/calendarUtils.js';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface TransposedViewProps {
  year: number;
  cellSize: number;
  eventsByDay: Map<string, EventDataItem[]>;
  todayKey: string;
  onDayClick: (date: Date) => void;
}

function isValidDate(year: number, month: number, day: number): boolean {
  return new Date(year, month, day).getMonth() === month;
}

export default function TransposedView({ year, cellSize, eventsByDay, todayKey, onDayClick }: TransposedViewProps) {
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

  return (
    <div style={{ overflow: 'auto', flex: 1, padding: '0.5rem' }}>
      <table style={{ borderCollapse: 'collapse' }} onMouseLeave={() => setHovered(null)}>
        <thead>
          <tr>
            {/* corner */}
            <th style={{ position: 'sticky', top: 0, left: 0, zIndex: 3, background: '#fafafa', width: '2rem', minWidth: '2rem' }} />
            {/* day-number headers: 1–31 */}
            {Array.from({ length: 31 }, (_, i) => (
              <th key={i} style={{ ...headerCellStyle, ...(hovered?.day === i + 1 ? hlStyle : {}) }}>{i + 1}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* one row per month */}
          {MONTH_SHORT.map((name, m) => (
            <tr key={m}>
              <td style={{ ...stickyRowStyle, ...(hovered?.m === m ? hlStyle : {}) }}>{name}</td>
              {Array.from({ length: 31 }, (_, dayIdx) => {
                const day = dayIdx + 1;
                if (!isValidDate(year, m, day)) {
                  return <td key={day} style={{ background: '#f5f5f5', width: cellSize, height: cellSize }}
                    onMouseEnter={() => setHovered({ m, day })} />;
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
                    onMouseEnter={() => setHovered({ m, day })}
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
