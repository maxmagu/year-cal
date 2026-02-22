import { useState, useEffect, useCallback } from 'react';
import Calendar from 'rc-year-calendar';
import 'js-year-calendar/dist/js-year-calendar.css';
import { api } from './lib/api.js';
import type { CalendarInfo, CalendarEvent, CreateEventPayload, UpdateEventPayload } from './lib/types.js';
import { layoutEvents } from './lib/layout.js';
import type { CalendarDataSourceItem, CalendarDayEventObject } from 'rc-year-calendar';
import Toolbar from './components/Toolbar.js';
import CalendarSidebar from './components/CalendarSidebar.js';
import EventModal from './components/EventModal.js';
import DayView from './components/DayView.js';
import type { DayViewEvent } from './components/DayView.js';

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

function getDayRole(event: CalendarEvent, date: Date): 'start' | 'middle' | 'end' {
  const fmt = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const start = new Date(event.startDate);
  const end   = new Date(event.endDate);
  if (fmt(start) === fmt(date)) return 'start';
  if (fmt(end)   === fmt(date)) return 'end';
  return 'middle';
}

function multiColorRenderer(elt: HTMLElement, _date: Date, events: EventDataItem[]) {
  const parent = elt.parentElement as HTMLElement;

  const trueAllDayEvents    = events.filter((e) => e.calendarEvent.allDay);
  const multiDayTimedEvents = events.filter((e) => !e.calendarEvent.allDay && isMultiDay(e.calendarEvent));
  const timedEvents         = events.filter((e) => !e.calendarEvent.allDay && !isMultiDay(e.calendarEvent));

  // Full background fill for true all-day events
  if (trueAllDayEvents.length > 0) {
    const colors = [...new Set(trueAllDayEvents.map((e) => e.color as string | undefined).filter(Boolean))] as string[];
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

  // Vertical bars clipped to start/end time for multi-day timed events
  if (multiDayTimedEvents.length > 0) {
    parent.style.position = 'relative';
    const mdRanges  = multiDayTimedEvents.map((e) => {
      const role  = getDayRole(e.calendarEvent, _date);
      const start = new Date(e.calendarEvent.startDate);
      const end   = new Date(e.calendarEvent.endDate);
      const startMin = role === 'start' ? start.getHours() * 60 + start.getMinutes() : 0;
      const endMin   = role === 'end'   ? end.getHours()   * 60 + end.getMinutes()   : 1440;
      return { startMin, endMin };
    });
    const mdLayout = layoutEvents(mdRanges);

    multiDayTimedEvents.forEach((e, i) => {
      const role  = getDayRole(e.calendarEvent, _date);
      const start = new Date(e.calendarEvent.startDate);
      const end   = new Date(e.calendarEvent.endDate);

      const startPct = (start.getHours() * 60 + start.getMinutes()) / 1440 * 100;
      const endPct   = Math.max((end.getHours() * 60 + end.getMinutes()) / 1440 * 100, 8);

      const topPct    = role === 'start' ? startPct : 0;
      const heightPct = role === 'start' ? 100 - startPct
                      : role === 'end'   ? endPct
                      :                    100;

      const { col, totalCols } = mdLayout[i];
      const barWidthPct = 100 / totalCols;

      const bar = document.createElement('div');
      bar.style.cssText = [
        'position:absolute',
        `top:${topPct.toFixed(1)}%`,
        `height:${heightPct.toFixed(1)}%`,
        `left:${(col * barWidthPct).toFixed(1)}%`,
        `width:${barWidthPct.toFixed(1)}%`,
        `background:${e.color ?? '#888'}`,
        'opacity:0.7',
        'pointer-events:none',
      ].join(';');
      parent.insertBefore(bar, elt);
    });
  }

  // Vertical time bars for single-day timed events
  if (timedEvents.length > 0) {
    parent.style.position = 'relative';
    const tdRanges = timedEvents.map((e) => {
      const start    = new Date(e.calendarEvent.startDate);
      const end      = new Date(e.calendarEvent.endDate);
      const startMin = start.getHours() * 60 + start.getMinutes();
      const endMin   = end.getHours()   * 60 + end.getMinutes();
      return { startMin, endMin: endMin > startMin ? endMin : startMin + 60 };
    });
    const tdLayout = layoutEvents(tdRanges);

    timedEvents.forEach((e, i) => {
      const { startMin, endMin }   = tdRanges[i];
      const { col, totalCols }     = tdLayout[i];
      const barWidthPct            = 100 / totalCols;
      const durationMin            = endMin - startMin;

      const topPct    = (startMin / 1440 * 100).toFixed(1);
      const heightPct = Math.max(durationMin / 1440 * 100, 12).toFixed(1);

      const bar = document.createElement('div');
      bar.style.cssText = [
        'position:absolute',
        `top:${topPct}%`,
        `height:${heightPct}%`,
        `left:${(col * barWidthPct).toFixed(1)}%`,
        `width:${barWidthPct.toFixed(1)}%`,
        `background:${e.color ?? '#888'}`,
        'opacity:0.5',
        'pointer-events:none',
        'border-radius:1px',
      ].join(';');
      parent.insertBefore(bar, elt);
    });
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

  const [dayViewOpen, setDayViewOpen] = useState(false);
  const [dayViewDate, setDayViewDate] = useState<Date | null>(null);
  const [dayViewEvents, setDayViewEvents] = useState<DayViewEvent[]>([]);

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
    } else if (e.events.length === 1) {
      const ev = e.events[0].calendarEvent;
      setModalEvent(ev);
      setModalDefaultDate(ev.startDate.slice(0, 10));
      setModalOpen(true);
    } else {
      setDayViewDate(d);
      setDayViewEvents(e.events.map(ev => ({ calendarEvent: ev.calendarEvent, color: ev.color as string | undefined })));
      setDayViewOpen(true);
    }
  }

  function closeDayView() {
    setDayViewOpen(false);
  }

  function handleDayViewSelect(event: CalendarEvent) {
    closeDayView();
    setModalEvent(event);
    setModalDefaultDate(event.startDate.slice(0, 10));
    setModalOpen(true);
  }

  function handleDayViewNewEvent() {
    closeDayView();
    const d = dayViewDate!;
    const isoDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setModalEvent(null);
    setModalDefaultDate(isoDate);
    setModalOpen(true);
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
      {dayViewOpen && dayViewDate && (
        <DayView
          date={dayViewDate}
          events={dayViewEvents}
          onSelectEvent={handleDayViewSelect}
          onNewEvent={handleDayViewNewEvent}
          onClose={closeDayView}
        />
      )}
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
