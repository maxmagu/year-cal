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
  showEventLabels?: boolean;
  backgroundCalendarUrls?: Set<string>;
}

// Returns where this date falls within a multi-day event's span.
function getDayRole(event: { startDate: string; endDate: string }, date: Date): 'start' | 'middle' | 'end' {
  const dateKey = fmtDayKey(date);
  if (fmtDayKey(new Date(event.startDate)) === dateKey) return 'start';
  if (fmtDayKey(new Date(event.endDate))   === dateKey) return 'end';
  return 'middle';
}

export default function DayCell({ date, events, isToday, cellSize, onClick, onMouseEnter, onMouseLeave, label, showEventLabels, backgroundCalendarUrls }: DayCellProps) {
  const [isHovered, setIsHovered] = useState(false);
  const dateKey = fmtDayKey(date);

  const isTentative = (e: EventDataItem) => e.calendarEvent.summary?.includes('Tentative');

  // Three visual categories with different rendering:
  //   trueAllDayEvents    → full-height background fills (with rounded caps at start/end)
  //   multiDayTimedEvents → full-width vertical bars clipped to start/end time on boundary days
  //   timedEvents         → dots at the bottom of the cell
  const isBackground = (e: EventDataItem) => backgroundCalendarUrls?.has(e.calendarUrl);
  const trueAllDayEvents    = events.filter(e => e.calendarEvent.allDay && !isBackground(e));
  const bgAllDayEvents      = events.filter(e => e.calendarEvent.allDay && isBackground(e));
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
      const isTwoDay = fmtDayKey(dayAfterStart) === fmtDayKey(end);
      const borderRadius = role === 'start'                ? (isTwoDay ? `${r}px 0 ${r}px ${r}px` : `${r}px 0 0 ${r}px`)
                         : role === 'end'                  ? (isTwoDay ? `${r}px ${r}px ${r}px 0` : `0 ${r}px ${r}px 0`)
                         : (isFirstMiddle && isLastMiddle) ? `${r}px 0 ${r}px 0`
                         : isFirstMiddle                   ? `${r}px 0 0 0`
                         : isLastMiddle                    ? `0 0 ${r}px 0`
                         :                                   '0';
      // Bleed 1px past the cell edge on open sides to cover the borderSpacing gap
      const bleedLeft  = role === 'start' ? 0 : 1;
      const bleedRight = role === 'end'   ? 0 : 1;
      const role_ = role;
      return { key: i, top: `${topPct.toFixed(1)}%`, height: `${heightPct.toFixed(1)}%`, background: e.color ?? '#888', borderRadius, bleedLeft, bleedRight, summary: e.calendarEvent.summary, isStart: role_ === 'start', tentative: isTentative(e) };
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
      // Bleed 1px past the cell edge on open sides to cover the borderSpacing gap
      const bleedLeft  = isStartDay ? 0 : 1;
      const bleedRight = isEndDay   ? 0 : 1;
      const left  = `calc(${(i * colWidthPct).toFixed(1)}% - ${bleedLeft}px)`;
      const width = `calc(${colWidthPct.toFixed(1)}% + ${bleedLeft + bleedRight}px)`;
      return { key: i, left, width, background: e.color ?? '#888', borderRadius, summary: e.calendarEvent.summary, isStart: isStartDay, tentative: isTentative(e) };
    });
  })();

  // Background calendar events (e.g. hotel stays): bottom strip tall enough for label.
  const bgStripHeight = 10;
  const bgStrips = bgAllDayEvents.map((e, i) => {
    const isStartDay = fmtDayKey(e.startDate) === dateKey;
    const isEndDay   = fmtDayKey(e.endDate)   === dateKey;
    const r = 2;
    const borderRadius = (isStartDay && isEndDay) ? `${r}px`
                       : isStartDay               ? `${r}px 0 0 ${r}px`
                       : isEndDay                 ? `0 ${r}px ${r}px 0`
                       :                            '0';
    const bleedLeft  = isStartDay ? 0 : 1;
    const bleedRight = isEndDay   ? 0 : 1;
    return { key: `bg-${i}`, background: e.color ?? '#888', borderRadius, bleedLeft, bleedRight, height: bgStripHeight, bottom: i * (bgStripHeight + 1), summary: e.calendarEvent.summary, isStart: isStartDay, tentative: isTentative(e) };
  });

  return (
    <td
      style={{ position: 'relative', width: cellSize, height: cellSize, cursor: 'pointer', padding: 0, background: isHovered ? '#e8e8e8' : '#fafafa', overflow: showEventLabels ? 'visible' : undefined }}
      onClick={onClick}
      onMouseEnter={(e) => { setIsHovered(true); onMouseEnter?.(e.currentTarget.getBoundingClientRect()); }}
      onMouseLeave={() => { setIsHovered(false); onMouseLeave?.(); }}
    >
      {allDayBars.map(b => (
        <div key={b.key} style={{
          position: 'absolute', top: 1, height: 'calc(100% - 2px)',
          left: b.left, width: b.width,
          background: b.background, borderRadius: b.borderRadius,
          pointerEvents: 'none', opacity: b.tentative ? 0.5 : 1,
        }} />
      ))}
      {mdBars.map(b => (
        <div key={b.key} style={{
          position: 'absolute', left: -b.bleedLeft, right: -b.bleedRight,
          top: b.top, height: b.height,
          background: b.background, borderRadius: b.borderRadius,
          pointerEvents: 'none', zIndex: 1, opacity: b.tentative ? 0.5 : 1,
        }} />
      ))}
      {showEventLabels && allDayBars.filter(b => b.isStart).map(b => (
        <span key={`lbl-ad-${b.key}`} style={{ position: 'absolute', left: 2, top: '50%', transform: 'translateY(-50%)', fontSize: '0.5rem', color: '#fff', whiteSpace: 'nowrap', lineHeight: 1, pointerEvents: 'none', zIndex: 4 }}>
          {b.summary}
        </span>
      ))}
      {showEventLabels && bgStrips.filter(b => b.isStart).map(b => (
        <span key={`lbl-${b.key}`} style={{ position: 'absolute', left: 2, bottom: b.bottom + 1, fontSize: '0.5rem', color: '#fff', whiteSpace: 'nowrap', lineHeight: `${b.height}px`, pointerEvents: 'none', zIndex: 4 }}>
          {b.summary}
        </span>
      ))}
      {showEventLabels && mdBars.filter(b => b.isStart).map(b => (
        <span key={`lbl-md-${b.key}`} style={{ position: 'absolute', left: 2, top: b.top, fontSize: '0.5rem', color: '#fff', whiteSpace: 'nowrap', lineHeight: 1, pointerEvents: 'none', zIndex: 4 }}>
          {b.summary}
        </span>
      ))}
      {/* Dots anchored bottom-right, max 3 per row, rows grow upward */}
      {timedEvents.length > 0 && (() => {
        const COLS = 3;
        // Build rows bottom-up: last events go in the bottom row
        const chunks: EventDataItem[][] = [];
        for (let i = timedEvents.length; i > 0; i -= COLS)
          chunks.push(timedEvents.slice(Math.max(0, i - COLS), i));
        // chunks[0] = bottom row; reverse to render top-down
        chunks.reverse();
        return (
          <div style={{ position: 'absolute', bottom: 3, right: 3, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, pointerEvents: 'none', zIndex: 1 }}>
            {chunks.map((row, ri) => (
              <div key={ri} style={{ display: 'flex', gap: 2 }}>
                {row.map((e, i) => {
                  const dotSize = cellSize <= 26 ? 4 : label ? 5 : 7;
                  return <div key={i} style={{ width: dotSize, height: dotSize, borderRadius: '50%', background: e.color ?? '#888', flexShrink: 0, opacity: isTentative(e) ? 0.5 : 1 }} />;
                })}
              </div>
            ))}
          </div>
        );
      })()}
      {/* Today indicator: inset ring so it doesn't affect layout */}
      {isToday && (
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
          borderRadius: 4,
          boxShadow: 'inset 0 0 0 2px #e74c3c, inset 0 0 0 3px white',
          zIndex: 2, pointerEvents: 'none',
        }} />
      )}
      {bgStrips.map(b => (
        <div key={b.key} style={{
          position: 'absolute', bottom: b.bottom, left: -b.bleedLeft, right: -b.bleedRight,
          height: b.height,
          background: b.background, borderRadius: b.borderRadius,
          pointerEvents: 'none', opacity: b.tentative ? 0.5 : 1,
          boxShadow: '0 -1px 0 #fff',
        }} />
      ))}
      {/* Date/label — top-left corner, above everything */}
      <div style={{
        position: 'absolute', top: 4, left: 5,
        fontSize: '0.65rem', lineHeight: 1,
        fontWeight: (date.getDay() === 0 || date.getDay() === 6) ? 700 : 400,
        zIndex: 3, pointerEvents: 'none',
      }}>
        {label ?? date.getDate()}
      </div>
    </td>
  );
}
