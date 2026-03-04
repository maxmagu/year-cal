import MonthGrid from './MonthGrid.js';
import type { EventDataItem } from '../lib/calendarUtils.js';

interface YearViewProps {
  year: number;
  cellSize: number;
  eventsByDay: Map<string, EventDataItem[]>;
  todayKey: string;
  onDayClick: (date: Date) => void;
  onDayHover: (date: Date | null, rect?: DOMRect) => void;
  isMobile?: boolean;
  showEventLabels?: boolean;
}

export default function YearView({ year, cellSize, eventsByDay, todayKey, onDayClick, onDayHover, isMobile, showEventLabels }: YearViewProps) {
  const gap = isMobile ? Math.round(cellSize * 0.3) : Math.round(cellSize * 0.6);
  const padding = isMobile ? '0.5rem' : '1rem';

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(auto-fill, ${cellSize * 7 + 20}px)`,
      alignItems: 'start',
      rowGap: `${gap}px`,
      columnGap: `${gap}px`,
      padding,
    }}>
      {Array.from({ length: 12 }, (_, m) => (
        <MonthGrid
          key={m}
          year={year}
          month={m}
          cellSize={cellSize}
          eventsByDay={eventsByDay}
          todayKey={todayKey}
          onDayClick={onDayClick}
          onDayHover={onDayHover}
          showEventLabels={showEventLabels}
        />
      ))}
    </div>
  );
}
