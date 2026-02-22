import { useState, useEffect, useCallback } from 'react';
import { api } from './lib/api.js';
import type { CalendarInfo, CalendarEvent, CreateEventPayload, UpdateEventPayload } from './lib/types.js';
import { fmtDayKey, isMultiDay } from './lib/calendarUtils.js';
import type { EventDataItem } from './lib/calendarUtils.js';
import Toolbar from './components/Toolbar.js';
import CalendarSidebar from './components/CalendarSidebar.js';
import EventModal from './components/EventModal.js';
import DayView from './components/DayView.js';
import type { DayViewEvent } from './components/DayView.js';
import YearView from './components/YearView.js';
import TransposedView from './components/TransposedView.js';
import DayOverview from './components/DayOverview.js';

export default function App() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [cellSize, setCellSize] = useState(38);
  const [view, setView] = useState<'grid' | 'transposed'>('grid');
  const [weekendHighlight, setWeekendHighlight] = useState(true);
  const [calendars, setCalendars] = useState<CalendarInfo[]>([]);
  const [selectedCalendarUrls, setSelectedCalendarUrls] = useState<Set<string>>(new Set());
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
  const [onlyMultiDay, setOnlyMultiDay] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [modalEvent, setModalEvent] = useState<CalendarEvent | null>(null);
  const [modalDefaultDate, setModalDefaultDate] = useState('');

  const [hovered, setHovered] = useState<{ date: Date; rect: DOMRect } | null>(null);

  const [dayViewOpen, setDayViewOpen] = useState(false);
  const [dayViewDate, setDayViewDate] = useState<Date | null>(null);
  const [dayViewEvents, setDayViewEvents] = useState<DayViewEvent[]>([]);

  const calendarColors = new Map(calendars.map((c) => [c.url, c.color]));

  const visibleEvents = allEvents.filter((e) =>
    selectedCalendarUrls.has(e.calendarUrl) && (!onlyMultiDay || e.allDay || isMultiDay(e))
  );

  const dataSource: EventDataItem[] = visibleEvents.map((e) => ({
    // Date-only strings (all-day) must be parsed as local midnight, not UTC midnight,
    // so the calendar highlights the correct local day in every timezone.
    startDate: e.allDay ? new Date(e.startDate + 'T00:00:00') : new Date(e.startDate),
    endDate:   e.allDay ? new Date(e.endDate   + 'T00:00:00') : new Date(e.endDate),
    color: calendarColors.get(e.calendarUrl),
    calendarEvent: e,
  }));

  // Build day → events map for O(1) lookup in calendar cells
  const eventsByDay = new Map<string, EventDataItem[]>();
  for (const e of dataSource) {
    const cur  = new Date(e.startDate.getFullYear(), e.startDate.getMonth(), e.startDate.getDate());
    const last = new Date(e.endDate.getFullYear(),   e.endDate.getMonth(),   e.endDate.getDate());
    while (cur <= last) {
      const key = fmtDayKey(cur);
      eventsByDay.set(key, [...(eventsByDay.get(key) ?? []), e]);
      cur.setDate(cur.getDate() + 1);
    }
  }

  const todayKey = fmtDayKey(new Date());

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
      return next;
    });
  }

  const allCalendarUrls = new Set(calendars.map(c => c.url));

  function prevYear() {
    const yr = year - 1;
    setYear(yr);
    loadEvents(allCalendarUrls, yr);
  }

  function nextYear() {
    const yr = year + 1;
    setYear(yr);
    loadEvents(allCalendarUrls, yr);
  }

  function handleDayClick(date: Date) {
    const isoDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const onDay = eventsByDay.get(fmtDayKey(date)) ?? [];

    if (onDay.length === 0) {
      setModalEvent(null);
      setModalDefaultDate(isoDate);
      setModalOpen(true);
    } else if (onDay.length === 1) {
      const ev = onDay[0].calendarEvent;
      setModalEvent(ev);
      setModalDefaultDate(ev.startDate.slice(0, 10));
      setModalOpen(true);
    } else {
      setDayViewDate(date);
      setDayViewEvents(onDay.map(ev => ({ calendarEvent: ev.calendarEvent, color: ev.color as string | undefined })));
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
      <Toolbar
        year={year}
        onPrev={prevYear}
        onNext={nextYear}
        onSizeIncrease={() => setCellSize(s => Math.min(s + 4, 64))}
        onSizeDecrease={() => setCellSize(s => Math.max(s - 4, 22))}
        view={view}
        onViewChange={setView}
        weekendHighlight={weekendHighlight}
        onToggleWeekendHighlight={() => setWeekendHighlight(v => !v)}
      />
      <div className="main">
        <CalendarSidebar
          calendars={calendars}
          selected={selectedCalendarUrls}
          onToggle={toggleCalendar}
          onlyMultiDay={onlyMultiDay}
          onToggleOnlyMultiDay={() => setOnlyMultiDay(v => !v)}
        />
        <div className="content">
          {loading ? (
            <div className="status">Loading…</div>
          ) : error ? (
            <div className="status error">{error}</div>
          ) : view === 'grid' ? (
            <YearView
              year={year}
              cellSize={cellSize}
              eventsByDay={eventsByDay}
              todayKey={todayKey}
              onDayClick={handleDayClick}
              onDayHover={(date, rect) => setHovered(date && rect ? { date, rect } : null)}
              weekendHighlight={weekendHighlight}
            />
          ) : (
            <TransposedView
              year={year}
              cellSize={cellSize}
              eventsByDay={eventsByDay}
              todayKey={todayKey}
              onDayClick={handleDayClick}
              onDayHover={(date, rect) => setHovered(date && rect ? { date, rect } : null)}
              weekendHighlight={weekendHighlight}
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
      {hovered && (() => {
        const events = eventsByDay.get(fmtDayKey(hovered.date)) ?? [];
        return events.length > 0
          ? <DayOverview date={hovered.date} events={events} anchorRect={hovered.rect} />
          : null;
      })()}
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
