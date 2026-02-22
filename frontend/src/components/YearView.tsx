import MonthGrid from './MonthGrid.js';
import type { EventDataItem } from '../lib/calendarUtils.js';

interface YearViewProps {
  year: number;
  cellSize: number;
  eventsByDay: Map<string, EventDataItem[]>;
  todayKey: string;
  onDayClick: (date: Date) => void;
}

export default function YearView({ year, cellSize, eventsByDay, todayKey, onDayClick }: YearViewProps) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(auto-fill, ${cellSize * 7 + 20}px)`,
      alignItems: 'start',
      rowGap: `${Math.round(cellSize * 0.6)}px`,
      columnGap: `${Math.round(cellSize * 0.6)}px`,
      padding: '1rem',
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
        />
      ))}
    </div>
  );
}
