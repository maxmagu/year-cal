// CSS is bundled by js-year-calendar (the underlying lib): import 'js-year-calendar/dist/js-year-calendar.css'
declare module 'rc-year-calendar' {
  import type { ComponentType } from 'react';

  export interface CalendarDataSourceItem {
    startDate: Date;
    endDate: Date;
    name: string;
    color?: string;
    [key: string]: unknown;
  }

  export interface CalendarDayEventObject<T> {
    date: Date;
    events: T[];
  }

  export interface CalendarProps<T extends CalendarDataSourceItem = CalendarDataSourceItem> {
    year?: number;
    dataSource?: T[];
    style?: 'border' | 'background' | 'custom';
    displayHeader?: boolean;
    language?: string;
    weekStart?: number;
    onDayClick?: (e: CalendarDayEventObject<T>) => void;
    customDataSourceRenderer?: (element: HTMLElement, date: Date, events: T[]) => void;
  }

  const Calendar: ComponentType<CalendarProps>;
  export default Calendar;
}
