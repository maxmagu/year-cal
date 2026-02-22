import { useState, useEffect, useCallback } from 'react';
import Calendar from 'rc-year-calendar';
import 'js-year-calendar/dist/js-year-calendar.css';
import { api } from './lib/api.js';
import type { CalendarInfo, CalendarEvent, CreateEventPayload, UpdateEventPayload } from './lib/types.js';
import type { CalendarDataSourceItem, CalendarDayEventObject } from 'rc-year-calendar';
import Toolbar from './components/Toolbar.js';
import CalendarSidebar from './components/CalendarSidebar.js';
import EventModal from './components/EventModal.js';

interface EventDataItem extends CalendarDataSourceItem {
  calendarEvent: CalendarEvent;
}

function isMultiDay(event: CalendarEvent): boolean {
  const start = new Date(event.startDate);
  const end   = new Date(event.endDate);
  return (
    start.getFullYear() !== end.getFullYear() ||
    start.getMonth()    !== end.getMonth()    ||
    start.getDate()     !== end.getDate()
  );
}

function multiColorRenderer(elt: HTMLElement, _date: Date, events: EventDataItem[]) {
  const parent = elt.parentElement as HTMLElement;

  const allDayEvents = events.filter((e) => e.calendarEvent.allDay || isMultiDay(e.calendarEvent));
  const timedEvents  = events.filter((e) => !e.calendarEvent.allDay && !isMultiDay(e.calendarEvent));

  // Full background fill for all-day / multi-day events
  if (allDayEvents.length > 0) {
    const colors = [...new Set(allDayEvents.map((e) => e.color as string | undefined).filter(Boolean))] as string[];
    if (colors.length === 1) {
      parent.style.background = colors[0];
    } else {
      const stops = colors.flatMap((color, i) => {
        const start = ((i / colors.length) * 100).toFixed(1);
        const end   = (((i + 1) / colors.length) * 100).toFixed(1);
        return [`${color} ${start}%`, `${color} ${end}%`];
      });
      parent.style.background = `linear-gradient(to bottom, ${stops.join(', ')})`;
    }
  }

  // Colored dots for timed (non-all-day) events
  if (timedEvents.length > 0) {
    const colors = [...new Set(timedEvents.map((e) => e.color as string | undefined).filter(Boolean))] as string[];
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;justify-content:center;gap:3px;padding-top:2px;';
    colors.forEach((color) => {
      const dot = document.createElement('span');
      dot.style.cssText = `width:5px;height:5px;border-radius:50%;background:${color};display:inline-block;flex-shrink:0;`;
      row.appendChild(dot);
    });
    elt.appendChild(row);
  }
}

export default function App() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [calendars, setCalendars] = useState<CalendarInfo[]>([]);
  const [selectedCalendarUrls, setSelectedCalendarUrls] = useState<Set<string>>(new Set());
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [modalEvent, setModalEvent] = useState<CalendarEvent | null>(null);
  const [modalDefaultDate, setModalDefaultDate] = useState('');

  const calendarColors = new Map(calendars.map((c) => [c.url, c.color]));

  const visibleEvents = allEvents.filter((e) => selectedCalendarUrls.has(e.calendarUrl));

  const dataSource: EventDataItem[] = visibleEvents.map((e) => ({
    ...e,
    // Date-only strings (all-day) must be parsed as local midnight, not UTC midnight,
    // so js-year-calendar highlights the correct local day in every timezone.
    startDate: e.allDay ? new Date(e.startDate + 'T00:00:00') : new Date(e.startDate),
    endDate: e.allDay ? new Date(e.endDate + 'T00:00:00') : new Date(e.endDate),
    name: e.summary,
    color: calendarColors.get(e.calendarUrl),
    calendarEvent: e,
  }));

  const loadEvents = useCallback(async (urls: Set<string>, yr: number) => {
    setLoading(true);
    setError('');
    try {
      const results = await Promise.all([...urls].map((url) => api.listEvents(url, yr)));
      setAllEvents(results.flat());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const cals = await api.listCalendars();
        setCalendars(cals);
        const urls = new Set(cals.map((c) => c.url));
        setSelectedCalendarUrls(urls);
        await loadEvents(urls, year);
      } catch (e) {
        setError(String(e));
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleCalendar(url: string) {
    setSelectedCalendarUrls((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      loadEvents(next, year);
      return next;
    });
  }

  function prevYear() {
    const yr = year - 1;
    setYear(yr);
    loadEvents(selectedCalendarUrls, yr);
  }

  function nextYear() {
    const yr = year + 1;
    setYear(yr);
    loadEvents(selectedCalendarUrls, yr);
  }

  function handleDayClick(e: CalendarDayEventObject<EventDataItem>) {
    // Use local date components — toISOString() would shift to UTC and may change the date.
    const d = e.date;
    const isoDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (e.events.length === 0) {
      setModalEvent(null);
      setModalDefaultDate(isoDate);
      setModalOpen(true);
    } else {
      const ev = e.events[0].calendarEvent;
      setModalEvent(ev);
      setModalDefaultDate(ev.startDate.slice(0, 10));
      setModalOpen(true);
    }
  }

  function closeModal() {
    setModalOpen(false);
    setModalEvent(null);
  }

  async function handleSave(payload: CreateEventPayload | UpdateEventPayload) {
    try {
      if ('url' in payload) {
        await api.updateEvent(payload as UpdateEventPayload);
      } else {
        await api.createEvent(payload as CreateEventPayload);
      }
      closeModal();
      await loadEvents(selectedCalendarUrls, year);
    } catch (e) {
      alert(`Failed to save event: ${e}`);
    }
  }

  async function handleDelete(detail: { url: string; etag: string }) {
    try {
      await api.deleteEvent(detail.url, detail.etag);
      closeModal();
      await loadEvents(selectedCalendarUrls, year);
    } catch (e) {
      alert(`Failed to delete event: ${e}`);
    }
  }

  return (
    <div className="app">
      <Toolbar year={year} onPrev={prevYear} onNext={nextYear} />
      <div className="main">
        <CalendarSidebar
          calendars={calendars}
          selected={selectedCalendarUrls}
          onToggle={toggleCalendar}
        />
        <div className="content">
          {loading ? (
            <div className="status">Loading…</div>
          ) : error ? (
            <div className="status error">{error}</div>
          ) : (
            <Calendar
              year={year}
              dataSource={dataSource}
              style="custom"
              customDataSourceRenderer={multiColorRenderer}
              displayHeader={false}
              weekStart={1}
              onDayClick={handleDayClick}
            />
          )}
        </div>
      </div>
      {modalOpen && (
        <EventModal
          event={modalEvent}
          defaultDate={modalDefaultDate}
          calendars={calendars.filter(c => c.components.includes('VEVENT'))}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={closeModal}
        />
      )}
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; font-family: system-ui, sans-serif; background: #fff; }
        .app { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
        .main { display: flex; flex: 1; overflow: hidden; }
        .content { flex: 1; overflow: auto; display: flex; flex-direction: column; }
        .status { padding: 2rem; text-align: center; color: #666; }
        .error { color: #e74c3c; }
      `}</style>
    </div>
  );
}
