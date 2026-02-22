import type { CalendarInfo } from '../lib/types.js';

interface CalendarSidebarProps {
  calendars: CalendarInfo[];
  selected: Set<string>;
  onToggle: (url: string) => void;
  onlyMultiDay: boolean;
  onToggleOnlyMultiDay: () => void;
}

const sectionLabel: React.CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 600,
  color: '#888',
  marginBottom: '0.5rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

function CalendarList({ calendars, selected, onToggle }: CalendarSidebarProps) {
  return (
    <>
      {calendars.map((cal) => (
        <label key={cal.url} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0', cursor: 'pointer', fontSize: '0.875rem' }}>
          <input
            type="checkbox"
            checked={selected.has(cal.url)}
            onChange={() => onToggle(cal.url)}
            style={{ accentColor: cal.color }}
          />
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: cal.color, flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cal.displayName}</span>
        </label>
      ))}
    </>
  );
}

export default function CalendarSidebar({ calendars, selected, onToggle, onlyMultiDay, onToggleOnlyMultiDay }: CalendarSidebarProps) {
  const veventCals = calendars.filter((c) => c.components.includes('VEVENT'));
  const vtodoCals = calendars.filter((c) => c.components.includes('VTODO'));

  return (
    <div style={{
      width: '200px',
      borderRight: '1px solid #e0e0e0',
      padding: '1rem 0.75rem',
      overflowY: 'auto',
      background: '#fafafa',
      flexShrink: 0,
    }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0', cursor: 'pointer', fontSize: '0.875rem', marginBottom: '1rem' }}>
        <input
          type="checkbox"
          checked={onlyMultiDay}
          onChange={onToggleOnlyMultiDay}
        />
        <span>Only multi-day events</span>
      </label>
      {veventCals.length > 0 && (
        <>
          <div style={sectionLabel}>Calendars</div>
          <CalendarList calendars={veventCals} selected={selected} onToggle={onToggle} />
        </>
      )}
      {vtodoCals.length > 0 && (
        <div style={{ marginTop: veventCals.length > 0 ? '1rem' : 0 }}>
          <div style={sectionLabel}>Reminders</div>
          <CalendarList calendars={vtodoCals} selected={selected} onToggle={onToggle} />
        </div>
      )}
    </div>
  );
}
