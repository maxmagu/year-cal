import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ImportModal from './ImportModal';
import { api } from '../lib/api';
import type { CalendarInfo } from '../lib/types';

vi.mock('../lib/api', () => ({
  api: {
    importFile: vi.fn(),
    createEvent: vi.fn(),
  },
}));

const mockCalendars: CalendarInfo[] = [
  { url: 'https://cal1', displayName: 'Personal', color: '#4A90E2', components: ['VEVENT'] },
];

describe('ImportModal', () => {
  const onImported = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders upload step initially', () => {
    render(<ImportModal year={2026} calendars={mockCalendars} onImported={onImported} onClose={onClose} />);
    expect(screen.getByRole('button', { name: /extract events/i })).toBeInTheDocument();
  });

  it('disables Extract button when neither file nor text is provided', () => {
    render(<ImportModal year={2026} calendars={mockCalendars} onImported={onImported} onClose={onClose} />);
    expect(screen.getByRole('button', { name: /extract events/i })).toBeDisabled();
  });

  it('enables Extract button when text is entered', () => {
    render(<ImportModal year={2026} calendars={mockCalendars} onImported={onImported} onClose={onClose} />);
    fireEvent.change(screen.getByPlaceholderText(/paste email/i), {
      target: { value: 'Team dinner April 3' },
    });
    expect(screen.getByRole('button', { name: /extract events/i })).not.toBeDisabled();
  });

  it('shows "No events found" error when extraction returns empty array', async () => {
    vi.mocked(api.importFile).mockResolvedValueOnce([]);
    render(<ImportModal year={2026} calendars={mockCalendars} onImported={onImported} onClose={onClose} />);

    fireEvent.change(screen.getByPlaceholderText(/paste email/i), {
      target: { value: 'hello world' },
    });
    fireEvent.click(screen.getByRole('button', { name: /extract events/i }));

    await waitFor(() =>
      expect(screen.getByText(/no events found/i)).toBeInTheDocument()
    );
    // Stays on upload step
    expect(screen.getByRole('button', { name: /extract events/i })).toBeInTheDocument();
  });

  it('transitions to review step when events are extracted', async () => {
    vi.mocked(api.importFile).mockResolvedValueOnce([
      { summary: 'Team dinner', startDate: '2026-04-03', endDate: '2026-04-03', allDay: true },
    ]);
    render(<ImportModal year={2026} calendars={mockCalendars} onImported={onImported} onClose={onClose} />);

    fireEvent.change(screen.getByPlaceholderText(/paste email/i), {
      target: { value: 'Team dinner April 3' },
    });
    fireEvent.click(screen.getByRole('button', { name: /extract events/i }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /import 1 event/i })).toBeInTheDocument()
    );
    expect(screen.getByDisplayValue('Team dinner')).toBeInTheDocument();
  });

  it('Import button label reflects selected count', async () => {
    vi.mocked(api.importFile).mockResolvedValueOnce([
      { summary: 'Event A', startDate: '2026-04-01', endDate: '2026-04-01', allDay: true },
      { summary: 'Event B', startDate: '2026-04-02', endDate: '2026-04-02', allDay: true },
    ]);
    render(<ImportModal year={2026} calendars={mockCalendars} onImported={onImported} onClose={onClose} />);

    fireEvent.change(screen.getByPlaceholderText(/paste email/i), {
      target: { value: 'two events' },
    });
    fireEvent.click(screen.getByRole('button', { name: /extract events/i }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /import 2 events/i })).toBeInTheDocument()
    );

    // Uncheck first event — the first checkbox in the list
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    expect(screen.getByRole('button', { name: /import 1 event\b/i })).toBeInTheDocument();
  });

  it('Back button returns to upload step', async () => {
    vi.mocked(api.importFile).mockResolvedValueOnce([
      { summary: 'Trip', startDate: '2026-06-01', endDate: '2026-06-05', allDay: true },
    ]);
    render(<ImportModal year={2026} calendars={mockCalendars} onImported={onImported} onClose={onClose} />);

    fireEvent.change(screen.getByPlaceholderText(/paste email/i), {
      target: { value: 'Summer trip' },
    });
    fireEvent.click(screen.getByRole('button', { name: /extract events/i }));
    await waitFor(() => screen.getByRole('button', { name: /back/i }));

    fireEvent.click(screen.getByRole('button', { name: /back/i }));

    expect(screen.getByPlaceholderText(/paste email/i)).toBeInTheDocument();
  });

  it('calls api.createEvent for each selected event then calls onImported', async () => {
    vi.mocked(api.importFile).mockResolvedValueOnce([
      { summary: 'Dinner', startDate: '2026-04-03', endDate: '2026-04-03', allDay: true },
    ]);
    vi.mocked(api.createEvent).mockResolvedValue({ id: 'new-id' });

    render(<ImportModal year={2026} calendars={mockCalendars} onImported={onImported} onClose={onClose} />);

    fireEvent.change(screen.getByPlaceholderText(/paste email/i), {
      target: { value: 'Dinner April 3' },
    });
    fireEvent.click(screen.getByRole('button', { name: /extract events/i }));
    await waitFor(() => screen.getByRole('button', { name: /import 1 event/i }));

    fireEvent.click(screen.getByRole('button', { name: /import 1 event/i }));

    await waitFor(() => expect(onImported).toHaveBeenCalledOnce());
    expect(api.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: 'Dinner',
        calendarUrl: 'https://cal1',
        allDay: true,
      })
    );
  });
});
