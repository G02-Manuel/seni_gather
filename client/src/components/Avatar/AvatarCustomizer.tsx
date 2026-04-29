import React, { useEffect, useRef, useState } from 'react';
import { AvatarConfig, DEFAULT_AVATAR, SKIN_PALETTE, HAIR_PALETTE, OUTFIT_PALETTE } from '../../types';
import { SpriteFactory } from '../../game/utils/SpriteFactory';

interface Props {
  initial?: AvatarConfig;
  onConfirm: (cfg: AvatarConfig) => void;
  onCancel?: () => void;
  asModal?: boolean;
  title?: string;
}

const Picker: React.FC<{
  label: string;
  count: number;
  value: number;
  onChange: (v: number) => void;
  colors?: number[];
}> = ({ label, count, value, onChange, colors }) => (
  <div className="picker">
    <label>{label}</label>
    <div className="picker-options">
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          className={`po ${i === value ? 'active' : ''}`}
          style={colors ? { background: '#' + colors[i].toString(16).padStart(6, '0') } : {}}
          onClick={() => onChange(i)}
        >
          {!colors ? i + 1 : ''}
        </button>
      ))}
    </div>
  </div>
);

const AvatarCustomizer: React.FC<Props> = ({ initial, onConfirm, onCancel, asModal, title = 'Personaliza tu avatar' }) => {
  const [cfg, setCfg] = useState<AvatarConfig>(initial || DEFAULT_AVATAR);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = '';
    const c = SpriteFactory.renderPreview(cfg, 4);
    ref.current.appendChild(c);
  }, [cfg]);

  const body = (
    <div className="avatar-customizer">
      <h3>{title}</h3>
      <div className="ac-content">
        <div className="ac-preview" ref={ref} />
        <div className="ac-controls">
          <Picker label="Piel" count={SKIN_PALETTE.length} value={cfg.skin} onChange={v => setCfg({ ...cfg, skin: v })} colors={SKIN_PALETTE} />
          <Picker label="Cabello" count={10} value={cfg.hair} onChange={v => setCfg({ ...cfg, hair: v })} />
          <Picker label="Color cabello" count={HAIR_PALETTE.length} value={cfg.hairColor} onChange={v => setCfg({ ...cfg, hairColor: v })} colors={HAIR_PALETTE} />
          <Picker label="Ropa" count={8} value={cfg.outfit} onChange={v => setCfg({ ...cfg, outfit: v })} />
          <Picker label="Color ropa" count={OUTFIT_PALETTE.length} value={cfg.outfitColor} onChange={v => setCfg({ ...cfg, outfitColor: v })} colors={OUTFIT_PALETTE} />
          <Picker label="Accesorio" count={5} value={cfg.accessory} onChange={v => setCfg({ ...cfg, accessory: v })} />
        </div>
      </div>
      <div className="ac-actions">
        {onCancel && <button className="btn-secondary" onClick={onCancel}>Cancelar</button>}
        <button className="btn-primary" onClick={() => onConfirm(cfg)}>Guardar</button>
      </div>
    </div>
  );

  if (!asModal) return body;
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        {body}
      </div>
    </div>
  );
};

export default AvatarCustomizer;
