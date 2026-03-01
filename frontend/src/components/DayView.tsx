import React, { useEffect, useRef } from 'react';
import type { CalendarEvent } from '../lib/types.js';
import { layoutEvents } from '../lib/layout.js';

export interface DayViewEvent {
  calendarEvent: CalendarEvent;
  color?: string;
}

interface DayViewProps {
  date: Date;
  events: DayViewEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onNewEvent: () => void;
  onClose: () => void;
  isMobile?: boolean;
}

const HOUR_PX = 44; // pixels per hour in the timeline

// Returns the start/end minutes for this event *on the given day*.
// Multi-day events are clipped: midnight (0) at the start of day if the event
// began earlier, 1440 (end of day) if it continues past midnight.
function getMinutesForDay(event: CalendarEvent, date: Date): { startMin: number; endMin: number } {
  const fmt = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const start = new Date(event.startDate);
  const end   = new Date(event.endDate);
  const key   = fmt(date);
  const startMin = fmt(start) === key ? start.getHours() * 60 + start.getMinutes() : 0;
  const endMin   = fmt(end)   === key ? end.getHours()   * 60 + end.getMinutes()   : 1440;
  return { startMin, endMin };
}

function fmtTime(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
}


export default function DayView({ date, events, onSelectEvent, onNewEvent, onClose, isMobile }: DayViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to first event (or 8am) on open
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const fmt = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const key  = fmt(date);
    const timed = events.filter(e => !e.calendarEvent.allDay);
    const earliest = timed.reduce((min, e) => {
      const s = new Date(e.calendarEvent.startDate);
      return Math.min(min, fmt(s) === key ? s.getHours() : 0);
    }, 8);
    el.scrollTop = Math.max(0, earliest - 1) * HOUR_PX;
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const allDayEvts = events.filter(e => e.calendarEvent.allDay);
  const timedEvts  = events.filter(e => !e.calendarEvent.allDay);
  const ranges     = timedEvts.map(e => getMinutesForDay(e.calendarEvent, date));
  const layout     = layoutEvents(ranges);

  const label = date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: isMobile ? 0 : 10,
          boxShadow: isMobile ? 'none' : '0 4px 32px rgba(0,0,0,0.2)',
          width: isMobile ? '100%' : 380,
          maxWidth: isMobile ? undefined : 380,
          height: isMobile ? '100%' : undefined,
          maxHeight: isMobile ? undefined : '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #eee', flexShrink: 0 }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>{label}</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={onNewEvent}
              style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid #ccc', cursor: 'pointer', background: '#fff' }}
            >
              + New Event
            </button>
            <button
              onClick={onClose}
              style={{ fontSize: 20, lineHeight: 1, border: 'none', background: 'none', cursor: 'pointer', color: '#888', padding: '0 2px' }}
            >
              ×
            </button>
          </div>
        </div>

        {/* All-day chips */}
        {allDayEvts.length > 0 && (
          <div style={{ padding: '6px 16px', display: 'flex', gap: 6, flexWrap: 'wrap', borderBottom: '1px solid #eee', flexShrink: 0 }}>
            {allDayEvts.map((e, i) => (
              <div
                key={i}
                onClick={() => onSelectEvent(e.calendarEvent)}
                style={{ background: e.color ?? '#888', color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: 12, cursor: 'pointer', fontWeight: 500, userSelect: 'none' }}
              >
                {e.calendarEvent.summary}
              </div>
            ))}
          </div>
        )}

        {/* Timeline */}
        <div ref={scrollRef} style={{ overflowY: 'auto', flex: 1 }}>
          <div style={{ position: 'relative', height: HOUR_PX * 24, display: 'flex' }}>

            {/* Hour labels */}
            <div style={{ width: 44, flexShrink: 0 }}>
              {Array.from({ length: 24 }, (_, h) => (
                <div
                  key={h}
                  style={{ height: HOUR_PX, display: 'flex', alignItems: 'flex-start', paddingTop: 3, justifyContent: 'flex-end', paddingRight: 8, fontSize: 10, color: '#aaa', boxSizing: 'border-box' }}
                >
                  {h > 0 ? `${String(h).padStart(2, '0')}:00` : ''}
                </div>
              ))}
            </div>

            {/* Grid + events */}
            <div style={{ flex: 1, position: 'relative', borderLeft: '1px solid #eee' }}>
              {/* Hour grid lines */}
              {Array.from({ length: 24 }, (_, h) => (
                <div
                  key={h}
                  style={{ position: 'absolute', top: h * HOUR_PX, left: 0, right: 0, height: HOUR_PX, borderTop: h > 0 ? '1px solid #f0f0f0' : 'none', boxSizing: 'border-box' }}
                />
              ))}

              {/* Event bars */}
              {timedEvts.map((e, i) => {
                const { startMin, endMin } = ranges[i];
                const { col, totalCols }   = layout[i];
                const top    = (startMin / 60) * HOUR_PX;
                const height = Math.max(((endMin - startMin) / 60) * HOUR_PX, 20);
                const colW   = 100 / totalCols;
                const fmt    = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
                const startObj = new Date(e.calendarEvent.startDate);
                const showTime = fmt(startObj) === fmt(date);

                return (
                  <div
                    key={i}
                    onClick={() => onSelectEvent(e.calendarEvent)}
                    title={e.calendarEvent.summary}
                    style={{
                      position: 'absolute',
                      top,
                      height,
                      left: `${col * colW}%`,
                      width: `${colW}%`,
                      background: e.color ?? '#888',
                      opacity: 0.85,
                      borderRadius: 3,
                      cursor: 'pointer',
                      padding: '2px 5px',
                      overflow: 'hidden',
                      boxSizing: 'border-box',
                      fontSize: 11,
                      color: '#fff',
                      fontWeight: 500,
                      userSelect: 'none',
                    }}
                  >
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.calendarEvent.summary}
                    </div>
                    {showTime && height >= 30 && (
                      <div style={{ fontSize: 10, opacity: 0.9 }}>{fmtTime(startObj)}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
