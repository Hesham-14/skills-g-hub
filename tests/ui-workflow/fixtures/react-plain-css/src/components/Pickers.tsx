import { useState } from 'react';

const MODELS = [
  { id: 'balanced', label: 'Balanced', note: 'default' },
  { id: 'strongest', label: 'Strongest', note: 'uses the limit faster' },
];

export function ModelPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="picker">
      <button aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(o => !o)}>Model: {value}</button>
      {open && (
        <ul role="menu">
          {MODELS.map(m => (
            <li key={m.id} role="menuitemradio" aria-checked={m.id === value} onClick={() => { onChange(m.id); setOpen(false); }}>
              {m.label} <span className="hint">{m.note}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function EffortPicker({ onPick }: { onPick: (effort: string) => void }) {
  return (
    <select aria-label="Effort" onChange={e => onPick(e.target.value)}>
      <option>low</option><option>medium</option><option>high</option>
    </select>
  );
}
