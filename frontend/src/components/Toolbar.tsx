interface ToolbarProps {
  year: number;
  onPrev: () => void;
  onNext: () => void;
}

export default function Toolbar({ year, onPrev, onNext }: ToolbarProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      padding: '0.5rem 1rem',
      borderBottom: '1px solid #e0e0e0',
      background: '#fafafa',
    }}>
      <button onClick={onPrev} style={btnStyle}>‹</button>
      <span style={{ fontWeight: 600, fontSize: '1.1rem', minWidth: '4ch', textAlign: 'center' }}>{year}</span>
      <button onClick={onNext} style={btnStyle}>›</button>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid #ccc',
  borderRadius: '4px',
  cursor: 'pointer',
  padding: '0.2rem 0.6rem',
  fontSize: '1.1rem',
  lineHeight: 1,
};
