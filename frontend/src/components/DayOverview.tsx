import type { EventDataItem } from '../lib/calendarUtils.js';

const DOW   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WIDTH = 180;
const GAP   = 8; // px between popover and anchor cell

function formatDate(d: Date): string {
  return `${DOW[d.getDay()]} ${d.getDate()} ${MONTH[d.getMonth()]}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

interface DayOverviewProps {
  date: Date;
  events: EventDataItem[];
  anchorRect: DOMRect; // bounding rect of the hovered day cell
}

export default function DayOverview({ date, events, anchorRect }: DayOverviewProps) {
  // Prefer left of cell; fall back to right if there isn't enough room
  const left = anchorRect.left - WIDTH - GAP >= 0
    ? anchorRect.left - WIDTH - GAP
    : anchorRect.right + GAP;

  const top = Math.min(anchorRect.top, window.innerHeight - 40);

  // All-day events first, then by start time
  const sorted = [...events].sort((a, b) => {
    if (a.calendarEvent.allDay !== b.calendarEvent.allDay) return a.calendarEvent.allDay ? -1 : 1;
    return a.calendarEvent.startDate.localeCompare(b.calendarEvent.startDate);
  });

  return (
    <div style={{
      position: 'fixed',
      top,
      left,
      width: WIDTH,
      background: '#fff',
      border: '1px solid #e0e0e0',
      borderRadius: 6,
      boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
      padding: '0.6rem 0.75rem',
      zIndex: 100,
      pointerEvents: 'none',
    }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#444', marginBottom: '0.4rem' }}>
        {formatDate(date)}
      </div>
      {sorted.length === 0 ? (
        <div style={{ fontSize: '0.75rem', color: '#aaa' }}>No events</div>
      ) : (
        sorted.map((e, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', marginBottom: '0.2rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: e.color ?? '#888', flexShrink: 0, marginTop: 3 }} />
            <div style={{ fontSize: '0.75rem', lineHeight: 1.3 }}>
              {!e.calendarEvent.allDay && (
                <span style={{ color: '#888', marginRight: '0.3rem' }}>{formatTime(e.calendarEvent.startDate)}</span>
              )}
              <span>{e.calendarEvent.summary}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
