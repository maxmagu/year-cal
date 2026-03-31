import { Fragment, useEffect, useRef, useCallback } from 'react';
import MonthGrid from './MonthGrid.js';
import type { EventDataItem } from '../lib/calendarUtils.js';

interface YearViewProps {
  years: number[];
  cellSize: number;
  eventsByDay: Map<string, EventDataItem[]>;
  todayKey: string;
  onDayClick: (date: Date) => void;
  onDayHover: (date: Date | null, rect?: DOMRect) => void;
  isMobile?: boolean;
  showEventLabels?: boolean;
  backgroundCalendarUrls?: Set<string>;
  hoveredEventUrl?: string | null;
  onEventHover?: (url: string | null) => void;
  onLoadPrevYear: () => void;
  onLoadNextYear: () => void;
  onVisibleYearChange: (year: number) => void;
  scrollToYear: number | null;
  onScrollToYearHandled: () => void;
}

export default function YearView({
  years, cellSize, eventsByDay, todayKey, onDayClick, onDayHover,
  isMobile, showEventLabels, backgroundCalendarUrls, hoveredEventUrl, onEventHover,
  onLoadPrevYear, onLoadNextYear, onVisibleYearChange,
  scrollToYear, onScrollToYearHandled,
}: YearViewProps) {
  const gap = isMobile ? Math.round(cellSize * 0.3) : Math.round(cellSize * 0.6);
  const padding = isMobile ? '0.5rem' : '1rem';

  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  const yearHeadingRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const visibleYearsRef = useRef<Set<number>>(new Set());

  // Use refs for callbacks so the IntersectionObserver doesn't re-create on every render
  const onLoadPrevRef = useRef(onLoadPrevYear);
  const onLoadNextRef = useRef(onLoadNextYear);
  const onVisibleYearRef = useRef(onVisibleYearChange);
  onLoadPrevRef.current = onLoadPrevYear;
  onLoadNextRef.current = onLoadNextYear;
  onVisibleYearRef.current = onVisibleYearChange;

  // Sentinel observer: trigger loading prev/next year
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        if (entry.target === topSentinelRef.current) onLoadPrevRef.current();
        if (entry.target === bottomSentinelRef.current) onLoadNextRef.current();
      }
    }, { rootMargin: '300px' });

    if (topSentinelRef.current) observer.observe(topSentinelRef.current);
    if (bottomSentinelRef.current) observer.observe(bottomSentinelRef.current);
    return () => observer.disconnect();
  }, []); // stable — callbacks via refs

  // Year heading observer: track which year is visible for the toolbar
  useEffect(() => {
    visibleYearsRef.current.clear();

    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const yr = Number(entry.target.getAttribute('data-year'));
        if (isNaN(yr)) continue;
        if (entry.isIntersecting) {
          visibleYearsRef.current.add(yr);
        } else {
          visibleYearsRef.current.delete(yr);
        }
      }

      if (visibleYearsRef.current.size > 0) {
        onVisibleYearRef.current(Math.min(...visibleYearsRef.current));
      } else {
        // All headings scrolled above viewport — find the most recent one above
        let bestYear: number | null = null;
        yearHeadingRefs.current.forEach((el, yr) => {
          if (el.getBoundingClientRect().bottom < 0 && (bestYear === null || yr > bestYear)) {
            bestYear = yr;
          }
        });
        if (bestYear !== null) onVisibleYearRef.current(bestYear);
      }
    }, { threshold: 0 });

    yearHeadingRefs.current.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [years]); // re-run when year list changes to observe new headings

  // Handle scrollToYear
  useEffect(() => {
    if (scrollToYear == null) return;
    const el = yearHeadingRefs.current.get(scrollToYear);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    onScrollToYearHandled();
  }, [scrollToYear, onScrollToYearHandled]);

  const setHeadingRef = useCallback((yr: number, el: HTMLDivElement | null) => {
    if (el) yearHeadingRefs.current.set(yr, el);
    else yearHeadingRefs.current.delete(yr);
  }, []);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(auto-fill, ${cellSize * 7 + 20}px)`,
      alignItems: 'start',
      rowGap: `${gap}px`,
      columnGap: `${gap}px`,
      padding,
    }}>
      <div ref={topSentinelRef} style={{ gridColumn: '1 / -1', height: 1 }} />

      {years.map(yr => (
        <Fragment key={yr}>
          <div
            ref={el => setHeadingRef(yr, el)}
            data-year={yr}
            style={{
              gridColumn: '1 / -1',
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#333',
              padding: `${gap}px 0 ${Math.round(gap * 0.3)}px`,
              borderBottom: '1px solid #e0e0e0',
              marginBottom: `${Math.round(gap * 0.3)}px`,
            }}
          >
            {yr}
          </div>
          {Array.from({ length: 12 }, (_, m) => (
            <MonthGrid
              key={`${yr}-${m}`}
              year={yr}
              month={m}
              cellSize={cellSize}
              eventsByDay={eventsByDay}
              todayKey={todayKey}
              onDayClick={onDayClick}
              onDayHover={onDayHover}
              showEventLabels={showEventLabels}
              backgroundCalendarUrls={backgroundCalendarUrls}
              hoveredEventUrl={hoveredEventUrl}
              onEventHover={onEventHover}
            />
          ))}
        </Fragment>
      ))}

      <div ref={bottomSentinelRef} style={{ gridColumn: '1 / -1', height: 1 }} />
    </div>
  );
}
