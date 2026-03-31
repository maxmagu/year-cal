import { useState, useEffect, useCallback, useMemo, useRef, useLayoutEffect } from 'react';
import { api } from './lib/api.js';
import type { CalendarInfo, CalendarEvent, CreateEventPayload, UpdateEventPayload } from './lib/types.js';
import { fmtDayKey, isMultiDay } from './lib/calendarUtils.js';
import type { EventDataItem } from './lib/calendarUtils.js';
import useIsMobile from './hooks/useIsMobile.js';
import Toolbar from './components/Toolbar.js';
import CalendarSidebar from './components/CalendarSidebar.js';
import EventModal from './components/EventModal.js';
import DayView from './components/DayView.js';
import type { DayViewEvent } from './components/DayView.js';
import YearView from './components/YearView.js';
import TransposedView from './components/TransposedView.js';
import DayOverview from './components/DayOverview.js';
import ImportModal from './components/ImportModal.js';

const TODAY_YEAR = new Date().getFullYear();

export default function App() {
  const isMobile = useIsMobile();
  const defaultCellSize = useIsMobile() ? 22 : 38;
  const [cellSize, setCellSize] = useState(defaultCellSize);
  const [view, setView] = useState<'grid' | 'transposed'>('grid');
  const [calendars, setCalendars] = useState<CalendarInfo[]>([]);
  const [selectedCalendarUrls, setSelectedCalendarUrls] = useState<Set<string>>(new Set());
  const [onlyMultiDay, setOnlyMultiDay] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Multi-year infinite scroll state
  const [loadedYears, setLoadedYears] = useState<number[]>([TODAY_YEAR]);
  const [eventsByYear, setEventsByYear] = useState<Map<number, CalendarEvent[]>>(new Map());
  const [visibleYear, setVisibleYear] = useState(TODAY_YEAR);
  const [scrollToYear, setScrollToYear] = useState<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const fetchedYearsRef = useRef<Set<number>>(new Set());
  const scrollCorrectionRef = useRef<{ scrollTop: number; scrollHeight: number } | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalEvent, setModalEvent] = useState<CalendarEvent | null>(null);
  const [modalDefaultDate, setModalDefaultDate] = useState('');

  const [hovered, setHovered] = useState<{ date: Date; rect: DOMRect } | null>(null);

  const [dayViewOpen, setDayViewOpen] = useState(false);
  const [dayViewDate, setDayViewDate] = useState<Date | null>(null);
  const [dayViewEvents, setDayViewEvents] = useState<DayViewEvent[]>([]);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [showEventLabels, setShowEventLabels] = useState(false);
  const [hoveredEventUrl, setHoveredEventUrl] = useState<string | null>(null);

  const allCalendarUrls = useMemo(() => new Set(calendars.map(c => c.url)), [calendars]);
  const calendarColors = new Map(calendars.map((c) => [c.url, c.color]));
  const backgroundCalendarUrls = new Set(calendars.filter(c => c.displayName === 'Hotels & Stays').map(c => c.url));

  // Derive allEvents from all loaded years
  const allEvents = useMemo(() => {
    const events: CalendarEvent[] = [];
    for (const [, yearEvents] of eventsByYear) {
      events.push(...yearEvents);
    }
    return events;
  }, [eventsByYear]);

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
    calendarUrl: e.calendarUrl,
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

  // Load events for a single year (no-op if already fetched)
  const loadYear = useCallback(async (yr: number, calUrls?: Set<string>) => {
    if (fetchedYearsRef.current.has(yr)) return;
    fetchedYearsRef.current.add(yr);
    try {
      const urls = [...(calUrls ?? allCalendarUrls)];
      const results = await Promise.all(urls.map(url => api.listEvents(url, yr)));
      setEventsByYear(prev => new Map([...prev, [yr, results.flat()]]));
    } catch (e) {
      console.error(`Failed to load events for ${yr}:`, e);
      fetchedYearsRef.current.delete(yr);
    }
  }, [allCalendarUrls]);

  // Refresh events for a year (force re-fetch)
  const refreshYear = useCallback(async (yr: number) => {
    fetchedYearsRef.current.delete(yr);
    try {
      const urls = [...allCalendarUrls];
      const results = await Promise.all(urls.map(url => api.listEvents(url, yr)));
      setEventsByYear(prev => new Map([...prev, [yr, results.flat()]]));
      fetchedYearsRef.current.add(yr);
    } catch (e) {
      console.error(`Failed to refresh events for ${yr}:`, e);
    }
  }, [allCalendarUrls]);

  // Initial load
  useEffect(() => {
    (async () => {
      try {
        const cals = await api.listCalendars();
        setCalendars(cals);
        const urls = new Set(cals.map((c) => c.url));
        setSelectedCalendarUrls(urls);
        fetchedYearsRef.current.add(TODAY_YEAR);
        const results = await Promise.all([...urls].map(url => api.listEvents(url, TODAY_YEAR)));
        setEventsByYear(new Map([[TODAY_YEAR, results.flat()]]));
      } catch (e) {
        setError(String(e));
      } finally {
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

  // Stable callbacks for infinite scroll via refs (avoids re-creating IntersectionObservers)
  const loadPrevYearRef = useRef<() => void>(() => {});
  const loadNextYearRef = useRef<() => void>(() => {});

  loadPrevYearRef.current = () => {
    const yr = loadedYears[0] - 1;
    if (loadedYears.includes(yr)) return;
    // Save scroll position before prepending content above
    const el = contentRef.current;
    if (el) {
      scrollCorrectionRef.current = { scrollTop: el.scrollTop, scrollHeight: el.scrollHeight };
    }
    setLoadedYears(prev => [yr, ...prev]);
    loadYear(yr);
  };

  loadNextYearRef.current = () => {
    const yr = loadedYears[loadedYears.length - 1] + 1;
    if (loadedYears.includes(yr)) return;
    setLoadedYears(prev => [...prev, yr]);
    loadYear(yr);
  };

  const handleLoadPrevYear = useCallback(() => loadPrevYearRef.current(), []);
  const handleLoadNextYear = useCallback(() => loadNextYearRef.current(), []);
  const handleVisibleYearChange = useCallback((yr: number) => setVisibleYear(yr), []);
  const handleScrollToYearHandled = useCallback(() => setScrollToYear(null), []);

  // Correct scroll position after prepending a year (runs before paint)
  useLayoutEffect(() => {
    if (scrollToYear !== null) {
      scrollCorrectionRef.current = null;
      return;
    }
    const correction = scrollCorrectionRef.current;
    const el = contentRef.current;
    if (correction && el) {
      const heightDiff = el.scrollHeight - correction.scrollHeight;
      if (heightDiff > 0) {
        el.scrollTop = correction.scrollTop + heightDiff;
      }
      scrollCorrectionRef.current = null;
    }
  }, [loadedYears, scrollToYear]);

  // Year navigation (toolbar buttons)
  function prevYear() {
    const yr = visibleYear - 1;
    setLoadedYears(prev => prev.includes(yr) ? prev : [...prev, yr].sort((a, b) => a - b));
    loadYear(yr);
    if (view === 'grid') {
      setScrollToYear(yr);
    } else {
      setVisibleYear(yr);
    }
  }

  function nextYear() {
    const yr = visibleYear + 1;
    setLoadedYears(prev => prev.includes(yr) ? prev : [...prev, yr].sort((a, b) => a - b));
    loadYear(yr);
    if (view === 'grid') {
      setScrollToYear(yr);
    } else {
      setVisibleYear(yr);
    }
  }

  function handleYearClick() {
    if (view === 'grid') {
      setLoadedYears(prev => prev.includes(TODAY_YEAR) ? prev : [...prev, TODAY_YEAR].sort((a, b) => a - b));
      loadYear(TODAY_YEAR);
      setScrollToYear(TODAY_YEAR);
    } else {
      setVisibleYear(TODAY_YEAR);
      loadYear(TODAY_YEAR);
    }
  }

  function handleDayClick(date: Date) {
    const isoDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const onDay = eventsByDay.get(fmtDayKey(date)) ?? [];

    if (onDay.length === 0) {
      setModalEvent(null);
      setModalDefaultDate(isoDate);
      setModalOpen(true);
    } else if (onDay.length === 1 && !isMobile) {
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
      await refreshYear(visibleYear);
    } catch (e) {
      alert(`Failed to save event: ${e}`);
    }
  }

  async function handleDelete(detail: { url: string; etag: string }) {
    try {
      await api.deleteEvent(detail.url, detail.etag);
      closeModal();
      await refreshYear(visibleYear);
    } catch (e) {
      alert(`Failed to delete event: ${e}`);
    }
  }

  const effectiveCellSize = cellSize;

  return (
    <div className="app">
      <Toolbar
        year={visibleYear}
        onPrev={prevYear}
        onNext={nextYear}
        onYearClick={handleYearClick}
        onSizeIncrease={() => setCellSize(s => Math.min(s + 4, 64))}
        onSizeDecrease={() => setCellSize(s => Math.max(s - 4, 18))}
        view={view}
        onViewChange={setView}
        isMobile={isMobile}
        onToggleSidebar={() => setSidebarOpen(v => !v)}
        onImport={() => setImportModalOpen(true)}
      />
      <div className="main">
        <CalendarSidebar
          calendars={calendars}
          selected={selectedCalendarUrls}
          onToggle={toggleCalendar}
          onlyMultiDay={onlyMultiDay}
          onToggleOnlyMultiDay={() => setOnlyMultiDay(v => !v)}
          showEventLabels={showEventLabels}
          onToggleEventLabels={() => setShowEventLabels(v => !v)}
          isMobile={isMobile}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div className="content" ref={contentRef}>
          {loading ? (
            <div className="status">Loading…</div>
          ) : error ? (
            <div className="status error">{error}</div>
          ) : view === 'grid' ? (
            <YearView
              years={loadedYears}
              cellSize={effectiveCellSize}
              eventsByDay={eventsByDay}
              todayKey={todayKey}
              onDayClick={handleDayClick}
              onDayHover={(date, rect) => setHovered(date && rect ? { date, rect } : null)}
              isMobile={isMobile}
              showEventLabels={showEventLabels}
              backgroundCalendarUrls={backgroundCalendarUrls}
              hoveredEventUrl={hoveredEventUrl}
              onEventHover={setHoveredEventUrl}
              onLoadPrevYear={handleLoadPrevYear}
              onLoadNextYear={handleLoadNextYear}
              onVisibleYearChange={handleVisibleYearChange}
              scrollToYear={scrollToYear}
              onScrollToYearHandled={handleScrollToYearHandled}
            />
          ) : (
            <TransposedView
              year={visibleYear}
              cellSize={effectiveCellSize}
              eventsByDay={eventsByDay}
              todayKey={todayKey}
              onDayClick={handleDayClick}
              onDayHover={(date, rect) => setHovered(date && rect ? { date, rect } : null)}
              showEventLabels={showEventLabels}
              backgroundCalendarUrls={backgroundCalendarUrls}
              hoveredEventUrl={hoveredEventUrl}
              onEventHover={setHoveredEventUrl}
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
          isMobile={isMobile}
        />
      )}
      {!isMobile && hovered && (() => {
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
      {importModalOpen && (
        <ImportModal
          year={visibleYear}
          calendars={calendars}
          onImported={async () => {
            setImportModalOpen(false);
            await Promise.all(loadedYears.map(yr => refreshYear(yr)));
          }}
          onClose={() => setImportModalOpen(false)}
        />
      )}
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; font-family: system-ui, sans-serif; background: #fff; }
        .app { display: flex; flex-direction: column; height: 100dvh; overflow: hidden; }
        .main { display: flex; flex: 1; overflow: hidden; }
        .content { flex: 1; overflow: auto; display: flex; flex-direction: column; }
        .status { padding: 2rem; text-align: center; color: #666; }
        .error { color: #e74c3c; }
        @keyframes event-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .event-bar-active { animation: event-pulse 1s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
