import { useState, useRef } from 'react';
import type React from 'react';
import type { CalendarInfo, ExtractedEvent } from '../lib/types.js';
import { api } from '../lib/api.js';

interface ImportModalProps {
  year: number;
  calendars: CalendarInfo[];
  onImported: () => void;
  onClose: () => void;
}

type DraftEvent = {
  id: string;
  selected: boolean;
  summary: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
};

type Step = 'upload' | 'review';

function makeDraft(e: ExtractedEvent, index: number): DraftEvent {
  return {
    id: `draft-${index}-${Date.now()}`,
    selected: true,
    summary: e.summary,
    description: e.description ?? '',
    location: e.location ?? '',
    startDate: e.startDate,
    endDate: e.endDate,
    allDay: e.allDay,
  };
}

export default function ImportModal({ year, calendars, onImported, onClose }: ImportModalProps) {
  const veventCals = calendars.filter(c => c.components.includes('VEVENT'));

  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const [drafts, setDrafts] = useState<DraftEvent[]>([]);
  const [calendarUrl, setCalendarUrl] = useState(veventCals[0]?.url ?? '');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');

  async function handleExtract() {
    if (!file && !text.trim()) return;
    setExtracting(true);
    setExtractError('');
    try {
      const events = await api.importFile(file, text, year);
      if (events.length === 0) {
        setExtractError('No events found. Try a different file or paste the text directly.');
        return;
      }
      setDrafts(events.map(makeDraft));
      setStep('review');
    } catch (e) {
      setExtractError(String(e));
    } finally {
      setExtracting(false);
    }
  }

  function updateDraft(id: string, patch: Partial<DraftEvent>) {
    setDrafts(prev => prev.map(d => d.id === id ? { ...d, ...patch } : d));
  }

  async function handleImport() {
    const selected = drafts.filter(d => d.selected);
    if (selected.length === 0) return;
    setImporting(true);
    setImportError('');
    try {
      for (const d of selected) {
        await api.createEvent({
          calendarUrl,
          summary: d.summary,
          description: d.description || undefined,
          location: d.location || undefined,
          startDate: d.allDay ? d.startDate.slice(0, 10) : d.startDate,
          endDate: d.allDay ? d.endDate.slice(0, 10) : d.endDate,
          allDay: d.allDay,
        });
      }
      onImported();
    } catch (e) {
      setImportError(String(e));
    } finally {
      setImporting(false);
    }
  }

  const selectedCount = drafts.filter(d => d.selected).length;
  const canExtract = !extracting && (file !== null || text.trim().length > 0);

  return (
    <div style={overlayStyle} onClick={onClose} role="presentation">
      <div
        style={modalStyle}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Import events"
      >
        {step === 'upload' && (
          <>
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Import events</h2>

            <div
              style={dropZoneStyle}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                const dropped = e.dataTransfer.files[0];
                if (dropped) setFile(dropped);
              }}
            >
              {file ? (
                <span style={{ fontSize: '0.875rem', color: '#333' }}>📄 {file.name}</span>
              ) : (
                <span style={{ fontSize: '0.875rem', color: '#888' }}>
                  Drop a PDF or image here, or tap to choose
                </span>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.txt,image/jpeg,image/png,image/webp,image/gif"
                style={{ display: 'none' }}
                onChange={e => setFile(e.target.files?.[0] ?? null)}
              />
            </div>

            <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#aaa' }}>or paste text</div>

            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Paste email, itinerary, or event text…"
              rows={5}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            />

            {extractError && (
              <div style={{ fontSize: '0.8rem', color: '#e74c3c' }}>{extractError}</div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={{ ...btnStyle, background: '#eee', color: '#333' }}>
                Cancel
              </button>
              <button
                onClick={handleExtract}
                disabled={!canExtract}
                style={{ ...btnStyle, background: canExtract ? '#4A90E2' : '#aaa', color: 'white', cursor: canExtract ? 'pointer' : 'not-allowed' }}
              >
                {extracting ? 'Extracting…' : 'Extract events'}
              </button>
            </div>
          </>
        )}

        {step === 'review' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', flexShrink: 0 }}>Review events</h2>
              <select
                value={calendarUrl}
                onChange={e => setCalendarUrl(e.target.value)}
                style={{ ...inputStyle, flex: 1, minWidth: 120 }}
              >
                {veventCals.map(cal => (
                  <option key={cal.url} value={cal.url}>{cal.displayName}</option>
                ))}
              </select>
            </div>

            <div style={{ overflowY: 'auto', maxHeight: '55vh', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {drafts.map(d => (
                <div
                  key={d.id}
                  style={{ border: '1px solid #e0e0e0', borderRadius: 6, padding: '0.5rem 0.6rem', opacity: d.selected ? 1 : 0.45 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                    <input
                      type="checkbox"
                      checked={d.selected}
                      onChange={e => updateDraft(d.id, { selected: e.target.checked })}
                    />
                    <input
                      type="text"
                      value={d.summary}
                      onChange={e => updateDraft(d.id, { summary: e.target.value })}
                      style={{ ...inputStyle, flex: 1, fontSize: '0.875rem', padding: '0.25rem 0.4rem' }}
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: '#555', whiteSpace: 'nowrap' }}>
                      <input
                        type="checkbox"
                        checked={d.allDay}
                        onChange={e => updateDraft(d.id, { allDay: e.target.checked })}
                      />
                      All day
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', paddingLeft: '1.5rem' }}>
                    <input
                      type={d.allDay ? 'date' : 'datetime-local'}
                      value={d.allDay ? d.startDate.slice(0, 10) : d.startDate.slice(0, 16)}
                      onChange={e => updateDraft(d.id, { startDate: e.target.value })}
                      style={{ ...inputStyle, fontSize: '0.8rem', padding: '0.2rem 0.35rem', flex: 1 }}
                    />
                    <span style={{ alignSelf: 'center', color: '#aaa', fontSize: '0.8rem' }}>→</span>
                    <input
                      type={d.allDay ? 'date' : 'datetime-local'}
                      value={d.allDay ? d.endDate.slice(0, 10) : d.endDate.slice(0, 16)}
                      onChange={e => updateDraft(d.id, { endDate: e.target.value })}
                      style={{ ...inputStyle, fontSize: '0.8rem', padding: '0.2rem 0.35rem', flex: 1 }}
                    />
                  </div>
                  <input
                    type="text"
                    value={d.location}
                    onChange={e => updateDraft(d.id, { location: e.target.value })}
                    placeholder="Location (optional)"
                    style={{ ...inputStyle, fontSize: '0.8rem', padding: '0.2rem 0.35rem', marginTop: '0.3rem', marginLeft: '1.5rem', width: 'calc(100% - 1.5rem)', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
            </div>

            {importError && (
              <div style={{ fontSize: '0.8rem', color: '#e74c3c' }}>{importError}</div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setStep('upload')} style={{ ...btnStyle, background: '#eee', color: '#333', marginRight: 'auto' }}>
                ← Back
              </button>
              <button onClick={onClose} style={{ ...btnStyle, background: '#eee', color: '#333' }}>
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={importing || selectedCount === 0}
                style={{ ...btnStyle, background: selectedCount > 0 && !importing ? '#4A90E2' : '#aaa', color: 'white', cursor: selectedCount > 0 && !importing ? 'pointer' : 'not-allowed' }}
              >
                {importing ? 'Importing…' : `Import ${selectedCount} event${selectedCount === 1 ? '' : 's'}`}
              </button>
            </div>
          </>
        )}
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
  maxWidth: '520px',
  maxHeight: '90dvh',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
  overflowY: 'auto',
};

const dropZoneStyle: React.CSSProperties = {
  border: '2px dashed #ccc',
  borderRadius: '6px',
  padding: '1.25rem',
  textAlign: 'center',
  cursor: 'pointer',
  background: '#fafafa',
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
