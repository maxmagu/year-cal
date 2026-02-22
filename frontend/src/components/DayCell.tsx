import { useState } from 'react';
import { layoutEvents } from '../lib/layout.js';
import { fmtDayKey, isMultiDay } from '../lib/calendarUtils.js';
import type { EventDataItem } from '../lib/calendarUtils.js';

interface DayCellProps {
  date: Date;
  events: EventDataItem[];
  isToday: boolean;
  cellSize: number;
  onClick: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  label?: string;
}

function getDayRole(event: { startDate: string; endDate: string }, date: Date): 'start' | 'middle' | 'end' {
  const dateKey = fmtDayKey(date);
  if (fmtDayKey(new Date(event.startDate)) === dateKey) return 'start';
  if (fmtDayKey(new Date(event.endDate))   === dateKey) return 'end';
  return 'middle';
}

export default function DayCell({ date, events, isToday, cellSize, onClick, onMouseEnter, onMouseLeave, label }: DayCellProps) {
  const [isHovered, setIsHovered] = useState(false);
  const dateKey = fmtDayKey(date);

  const trueAllDayEvents    = events.filter(e => e.calendarEvent.allDay);
  const multiDayTimedEvents = events.filter(e => !e.calendarEvent.allDay && isMultiDay(e.calendarEvent));
  const timedEvents         = events.filter(e => !e.calendarEvent.allDay && !isMultiDay(e.calendarEvent));

  // All-day background fills
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

  // Multi-day timed event bars (vertically clipped)
  const mdBars = (() => {
    if (multiDayTimedEvents.length === 0) return [];
    const mdRanges = multiDayTimedEvents.map(e => {
      const role  = getDayRole(e.calendarEvent, date);
      const start = new Date(e.calendarEvent.startDate);
      const end   = new Date(e.calendarEvent.endDate);
      const startMin = role === 'start' ? start.getHours() * 60 + start.getMinutes() : 0;
      const endMin   = role === 'end'   ? end.getHours()   * 60 + end.getMinutes()   : 1440;
      return { startMin, endMin };
    });
    const mdLayout = layoutEvents(mdRanges);
    return multiDayTimedEvents.map((e, i) => {
      const role  = getDayRole(e.calendarEvent, date);
      const start = new Date(e.calendarEvent.startDate);
      const end   = new Date(e.calendarEvent.endDate);
      const startPct = (start.getHours() * 60 + start.getMinutes()) / 1440 * 100;
      const endPct   = Math.max((end.getHours() * 60 + end.getMinutes()) / 1440 * 100, 8);
      const topPct    = role === 'start' ? startPct : 0;
      const heightPct = role === 'start' ? 100 - startPct : role === 'end' ? endPct : 100;
      const { col, totalCols } = mdLayout[i];
      const barWidthPct = 100 / totalCols;
      const r = 3;
      const dayAfterStart = new Date(start); dayAfterStart.setDate(dayAfterStart.getDate() + 1);
      const dayBeforeEnd  = new Date(end);   dayBeforeEnd.setDate(dayBeforeEnd.getDate() - 1);
      const isFirstMiddle = role === 'middle' && fmtDayKey(dayAfterStart) === fmtDayKey(date);
      const isLastMiddle  = role === 'middle' && fmtDayKey(dayBeforeEnd)  === fmtDayKey(date);
      const borderRadius = role === 'start'               ? `${r}px 0 0 ${r}px`
                         : role === 'end'                 ? `0 ${r}px ${r}px 0`
                         : (isFirstMiddle && isLastMiddle)? `${r}px 0 ${r}px 0`
                         : isFirstMiddle                  ? `${r}px 0 0 0`
                         : isLastMiddle                   ? `0 0 ${r}px 0`
                         :                                  '0';
      return {
        key: i,
        top: `${topPct.toFixed(1)}%`,
        height: `${heightPct.toFixed(1)}%`,
        left: `${(col * barWidthPct).toFixed(1)}%`,
        width: `${barWidthPct.toFixed(1)}%`,
        background: e.color ?? '#888',
        borderRadius,
      };
    });
  })();

  // Single-day timed event bars
  const timedBars = (() => {
    if (timedEvents.length === 0) return [];
    const tdRanges = timedEvents.map(e => {
      const start    = new Date(e.calendarEvent.startDate);
      const end      = new Date(e.calendarEvent.endDate);
      const startMin = start.getHours() * 60 + start.getMinutes();
      const endMin   = end.getHours()   * 60 + end.getMinutes();
      return { startMin, endMin: endMin > startMin ? endMin : startMin + 60 };
    });
    const tdLayout = layoutEvents(tdRanges);
    return timedEvents.map((_, i) => {
      const { startMin, endMin } = tdRanges[i];
      const { col, totalCols }   = tdLayout[i];
      const barWidthPct          = 100 / totalCols;
      const durationMin          = endMin - startMin;
      return {
        key: i,
        top: `${(startMin / 1440 * 100).toFixed(1)}%`,
        height: `${Math.max(durationMin / 1440 * 100, 12).toFixed(1)}%`,
        left: `${(col * barWidthPct).toFixed(1)}%`,
        width: `${barWidthPct.toFixed(1)}%`,
        background: timedEvents[i].color ?? '#888',
      };
    });
  })();

  return (
    <td
      style={{ position: 'relative', width: cellSize, height: cellSize, cursor: 'pointer', padding: 0, background: isHovered ? '#e8e8e8' : '#fafafa' }}
      onClick={onClick}
      onMouseEnter={() => { setIsHovered(true); onMouseEnter?.(); }}
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
          position: 'absolute',
          top: b.top, height: b.height, left: b.left, width: b.width,
          background: b.background, borderRadius: b.borderRadius,
          opacity: 0.7, pointerEvents: 'none',
        }} />
      ))}
      {timedBars.map(b => (
        <div key={b.key} style={{
          position: 'absolute',
          top: b.top, height: b.height, left: b.left, width: b.width,
          background: b.background,
          opacity: 0.5, borderRadius: 1, pointerEvents: 'none',
        }} />
      ))}
      {isToday && (
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
          borderRadius: 4,
          boxShadow: 'inset 0 0 0 2px #e74c3c, inset 0 0 0 3px white',
          zIndex: 2, pointerEvents: 'none',
        }} />
      )}
      <div style={{ position: 'relative', zIndex: 1, padding: `${Math.round(cellSize / 4)}px 6px`, fontSize: label ? '0.6rem' : '0.75rem' }}>
        {label ?? date.getDate()}
      </div>
    </td>
  );
}
