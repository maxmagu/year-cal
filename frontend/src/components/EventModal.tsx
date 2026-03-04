import { useState, useEffect } from 'react';
import type { CalendarEvent, CalendarInfo, CreateEventPayload, UpdateEventPayload } from '../lib/types.js';

interface EventModalProps {
  event: CalendarEvent | null;
  defaultDate: string;
  calendars: CalendarInfo[];
  onSave: (payload: CreateEventPayload | UpdateEventPayload) => void;
  onDelete: (detail: { url: string; etag: string }) => void;
  onClose: () => void;
}

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toDateInput(iso: string): string {
  return iso.slice(0, 10);
}

function toISO(val: string, isAllDay: boolean): string {
  // For all-day events, keep the date string as-is — backend handles it as UTC.
  // Converting through Date() here would shift the date in UTC+ timezones.
  if (isAllDay) return val;
  return new Date(val).toISOString();
}

export default function EventModal({ event, defaultDate, calendars, onSave, onDelete, onClose }: EventModalProps) {
  const [summary, setSummary] = useState(event?.summary ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [location, setLocation] = useState(event?.location ?? '');
  const [allDay, setAllDay] = useState(event?.allDay ?? true);
  const [startDate, setStartDate] = useState(() => {
    if (event) return event.allDay ? toDateInput(event.startDate) : toDatetimeLocal(event.startDate);
    return defaultDate;
  });
  const [endDate, setEndDate] = useState(() => {
    if (event) return event.allDay ? toDateInput(event.endDate) : toDatetimeLocal(event.endDate);
    return defaultDate;
  });
  const [calendarUrl, setCalendarUrl] = useState(event?.calendarUrl ?? calendars[0]?.url ?? '');

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [onClose]);

  function handleSave() {
    if (!summary.trim()) return;
    const base = {
      summary: summary.trim(),
      description: description || undefined,
      location: location || undefined,
      allDay,
      startDate: toISO(startDate, allDay),
      endDate: toISO(endDate, allDay),
      calendarUrl,
    };
    if (event) {
      onSave({ ...base, url: event.url, etag: event.etag } as UpdateEventPayload);
    } else {
      onSave(base as CreateEventPayload);
    }
  }

  function handleDelete() {
    if (event) onDelete({ url: event.url, etag: event.etag });
  }

  return (
    <div
      style={overlayStyle}
      onClick={onClose}
      role="presentation"
    >
      <div
        style={modalStyle}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Event"
      >
        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{event ? 'Edit Event' : 'New Event'}</h2>

        <label style={labelStyle}>
          Title
          <input
            type="text"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Event title"
            autoFocus
            style={inputStyle}
          />
        </label>

        {!event && (
          <label style={labelStyle}>
            Calendar
            <select value={calendarUrl} onChange={(e) => setCalendarUrl(e.target.value)} style={inputStyle}>
              {calendars.map((cal) => (
                <option key={cal.url} value={cal.url}>{cal.displayName}</option>
              ))}
            </select>
          </label>
        )}

        <label style={{ ...labelStyle, flexDirection: 'row', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}>
          <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
          All day
        </label>

        {allDay ? (
          <>
            <label style={labelStyle}>
              Start date
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              End date
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
            </label>
          </>
        ) : (
          <>
            <label style={labelStyle}>
              Start
              <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              End
              <input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
            </label>
          </>
        )}

        <label style={labelStyle}>
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Optional description"
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </label>

        <label style={labelStyle}>
          Location
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Optional location"
            style={inputStyle}
          />
        </label>

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
          {event && (
            <button onClick={handleDelete} style={{ ...btnStyle, background: '#e74c3c', color: 'white', marginRight: 'auto' }}>
              Delete
            </button>
          )}
          <button onClick={onClose} style={{ ...btnStyle, background: '#eee', color: '#333' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={!summary.trim()} style={{ ...btnStyle, background: '#4A90E2', color: 'white', opacity: summary.trim() ? 1 : 0.5, cursor: summary.trim() ? 'pointer' : 'not-allowed' }}>
            {event ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100,
};

const modalStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: '10px',
  padding: '1.5rem',
  width: '100%',
  maxWidth: '420px',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
};

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  fontSize: '0.8rem',
  color: '#555',
  gap: '3px',
};

const inputStyle: React.CSSProperties = {
  border: '1px solid #ccc',
  borderRadius: '5px',
  padding: '0.4rem 0.5rem',
  fontSize: '0.9rem',
  fontFamily: 'inherit',
};

const btnStyle: React.CSSProperties = {
  padding: '0.4rem 1rem',
  borderRadius: '5px',
  border: 'none',
  cursor: 'pointer',
  fontSize: '0.875rem',
};
