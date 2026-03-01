import type { CalendarInfo } from '../lib/types.js';

interface CalendarSidebarProps {
  calendars: CalendarInfo[];
  selected: Set<string>;
  onToggle: (url: string) => void;
  onlyMultiDay: boolean;
  onToggleOnlyMultiDay: () => void;
  isMobile: boolean;
  open: boolean;
  onClose: () => void;
}

const sectionLabel: React.CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 600,
  color: '#888',
  marginBottom: '0.5rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

function CalendarList({ calendars, selected, onToggle }: Pick<CalendarSidebarProps, 'calendars' | 'selected' | 'onToggle'>) {
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

export default function CalendarSidebar({ calendars, selected, onToggle, onlyMultiDay, onToggleOnlyMultiDay, isMobile, open, onClose }: CalendarSidebarProps) {
  const veventCals = calendars.filter((c) => c.components.includes('VEVENT'));
  const vtodoCals = calendars.filter((c) => c.components.includes('VTODO'));

  // On mobile: render as a fixed overlay when open, hidden when closed
  if (isMobile) {
    if (!open) return null;
    return (
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 900 }}
        onClick={onClose}
      >
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            bottom: 0,
            width: '260px',
            maxWidth: '80vw',
            background: '#fafafa',
            padding: '1rem 0.75rem',
            overflowY: 'auto',
            boxShadow: '2px 0 16px rgba(0,0,0,0.15)',
            zIndex: 901,
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontWeight: 600, fontSize: '1rem' }}>Calendars</span>
            <button
              onClick={onClose}
              style={{ border: 'none', background: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#888', padding: '0 4px' }}
            >×</button>
          </div>
          <SidebarContent
            veventCals={veventCals}
            vtodoCals={vtodoCals}
            selected={selected}
            onToggle={onToggle}
            onlyMultiDay={onlyMultiDay}
            onToggleOnlyMultiDay={onToggleOnlyMultiDay}
          />
        </div>
      </div>
    );
  }

  // Desktop: static sidebar
  return (
    <div style={{
      width: '200px',
      borderRight: '1px solid #e0e0e0',
      padding: '1rem 0.75rem',
      overflowY: 'auto',
      background: '#fafafa',
      flexShrink: 0,
    }}>
      <SidebarContent
        veventCals={veventCals}
        vtodoCals={vtodoCals}
        selected={selected}
        onToggle={onToggle}
        onlyMultiDay={onlyMultiDay}
        onToggleOnlyMultiDay={onToggleOnlyMultiDay}
      />
    </div>
  );
}

function SidebarContent({ veventCals, vtodoCals, selected, onToggle, onlyMultiDay, onToggleOnlyMultiDay }: {
  veventCals: CalendarInfo[];
  vtodoCals: CalendarInfo[];
  selected: Set<string>;
  onToggle: (url: string) => void;
  onlyMultiDay: boolean;
  onToggleOnlyMultiDay: () => void;
}) {
  return (
    <>
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0', cursor: 'pointer', fontSize: '0.875rem', marginBottom: '1rem' }}>
        <input
          type="checkbox"
          checked={onlyMultiDay}
          onChange={onToggleOnlyMultiDay}
        />
        <span>Hide single-day</span>
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
    </>
  );
}
