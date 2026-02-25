import { useState } from 'react';
import { fmtDayKey, isMultiDay } from '../lib/calendarUtils.js';
import type { EventDataItem } from '../lib/calendarUtils.js';

interface DayCellProps {
  date: Date;
  events: EventDataItem[];
  isToday: boolean;
  cellSize: number;
  onClick: () => void;
  onMouseEnter?: (rect: DOMRect) => void;
  onMouseLeave?: () => void;
  label?: string;          // overrides date number (used by TransposedView for DOW letter)
  weekendHighlight?: boolean;
}

// Returns where this date falls within a multi-day event's span.
function getDayRole(event: { startDate: string; endDate: string }, date: Date): 'start' | 'middle' | 'end' {
  const dateKey = fmtDayKey(date);
  if (fmtDayKey(new Date(event.startDate)) === dateKey) return 'start';
  if (fmtDayKey(new Date(event.endDate))   === dateKey) return 'end';
  return 'middle';
}

export default function DayCell({ date, events, isToday, cellSize, onClick, onMouseEnter, onMouseLeave, label, weekendHighlight }: DayCellProps) {
  const [isHovered, setIsHovered] = useState(false);
  const dateKey = fmtDayKey(date);

  // Three visual categories with different rendering:
  //   trueAllDayEvents    → full-height background fills (with rounded caps at start/end)
  //   multiDayTimedEvents → full-width vertical bars clipped to start/end time on boundary days
  //   timedEvents         → dots at the bottom of the cell
  const trueAllDayEvents    = events.filter(e => e.calendarEvent.allDay);
  const multiDayTimedEvents = events.filter(e => !e.calendarEvent.allDay && isMultiDay(e.calendarEvent));
  const timedEvents         = events.filter(e => !e.calendarEvent.allDay && !isMultiDay(e.calendarEvent));

  // Multi-day timed event bars: full width, vertically clipped by time on the first and last day.
  // Middle days fill the entire cell height.
  const mdBars = (() => {
    if (multiDayTimedEvents.length === 0) return [];
    return multiDayTimedEvents.map((e, i) => {
      const role  = getDayRole(e.calendarEvent, date);
      const start = new Date(e.calendarEvent.startDate);
      const end   = new Date(e.calendarEvent.endDate);
      const startPct = (start.getHours() * 60 + start.getMinutes()) / 1440 * 100;
      const endPct   = Math.max((end.getHours() * 60 + end.getMinutes()) / 1440 * 100, 8);
      const topPct    = role === 'start' ? startPct : 0;
      const heightPct = role === 'start' ? 100 - startPct : role === 'end' ? endPct : 100;

      // Round only the "outer" corners of each day's slice so the bar looks continuous
      // across days. Middle days adjacent to start/end get one rounded corner each.
      const r = 3;
      const dayAfterStart = new Date(start); dayAfterStart.setDate(dayAfterStart.getDate() + 1);
      const dayBeforeEnd  = new Date(end);   dayBeforeEnd.setDate(dayBeforeEnd.getDate() - 1);
      const isFirstMiddle = role === 'middle' && fmtDayKey(dayAfterStart) === dateKey;
      const isLastMiddle  = role === 'middle' && fmtDayKey(dayBeforeEnd)  === dateKey;
      const borderRadius = role === 'start'                ? `${r}px 0 0 ${r}px`
                         : role === 'end'                  ? `0 ${r}px ${r}px 0`
                         : (isFirstMiddle && isLastMiddle) ? `${r}px 0 ${r}px 0`
                         : isFirstMiddle                   ? `${r}px 0 0 0`
                         : isLastMiddle                    ? `0 0 ${r}px 0`
                         :                                   '0';
      return { key: i, top: `${topPct.toFixed(1)}%`, height: `${heightPct.toFixed(1)}%`, background: e.color ?? '#888', borderRadius };
    });
  })();

  // All-day background fills: split cell width evenly when multiple overlap.
  const allDayBars = (() => {
    const n = trueAllDayEvents.length;
    if (n === 0) return [];
    const colWidthPct = 100 / n;
    return trueAllDayEvents.map((e, i) => {
      const isStartDay = fmtDayKey(e.startDate) === dateKey;
      const isEndDay   = fmtDayKey(e.endDate)   === dateKey;
      const r = 4;
      const borderRadius = (isStartDay && isEndDay) ? `${r}px`
                         : isStartDay               ? `${r}px 0 0 ${r}px`
                         : isEndDay                 ? `0 ${r}px ${r}px 0`
                         :                            '0';
      return { key: i, left: `${(i * colWidthPct).toFixed(1)}%`, width: `${colWidthPct.toFixed(1)}%`, background: e.color ?? '#888', borderRadius };
    });
  })();


  return (
    <td
      style={{ position: 'relative', width: cellSize, height: cellSize, cursor: 'pointer', padding: 0, background: isHovered ? '#e8e8e8' : '#fafafa' }}
      onClick={onClick}
      onMouseEnter={(e) => { setIsHovered(true); onMouseEnter?.(e.currentTarget.getBoundingClientRect()); }}
      onMouseLeave={() => { setIsHovered(false); onMouseLeave?.(); }}
    >
      {allDayBars.map(b => (
        <div key={b.key} style={{
          position: 'absolute', top: 1, height: 'calc(100% - 2px)',
          left: b.left, width: b.width,
          background: b.background, borderRadius: b.borderRadius,
          pointerEvents: 'none',
        }} />
      ))}
      {mdBars.map(b => (
        <div key={b.key} style={{
          position: 'absolute', left: 0, right: 0,
          top: b.top, height: b.height,
          background: b.background, borderRadius: b.borderRadius,
          pointerEvents: 'none', zIndex: 1,
        }} />
      ))}
      {timedEvents.length > 0 && (
        <div style={{
          position: 'absolute', bottom: 3, left: 0, right: 0,
          display: 'flex', justifyContent: 'center', gap: 2,
          pointerEvents: 'none', zIndex: 1,
        }}>
          {timedEvents.map((e, i) => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: e.color ?? '#888', flexShrink: 0 }} />
          ))}
        </div>
      )}
      {/* Today indicator: inset ring so it doesn't affect layout */}
      {isToday && (
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
          borderRadius: 4,
          boxShadow: 'inset 0 0 0 2px #e74c3c, inset 0 0 0 3px white',
          zIndex: 2, pointerEvents: 'none',
        }} />
      )}
      <div style={{ position: 'relative', zIndex: 1, padding: `${Math.round(cellSize / 4)}px 6px`, fontSize: label ? '0.6rem' : '0.75rem', textAlign: label ? 'center' : 'left', fontWeight: (weekendHighlight && (date.getDay() === 0 || date.getDay() === 6)) ? 700 : 400 }}>
        {label ?? date.getDate()}
      </div>
    </td>
  );
}
