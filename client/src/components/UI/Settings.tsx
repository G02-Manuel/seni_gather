import React, { useState } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  micEnabled: boolean;
  camEnabled: boolean;
  masterVolume: number;
  onMasterVolume: (v: number) => void;
  onTestMic: () => void;
  pttMode: boolean;
  onPttMode: (b: boolean) => void;
}

const Settings: React.FC<Props> = ({
  open, onClose, micEnabled, camEnabled,
  masterVolume, onMasterVolume, onTestMic, pttMode, onPttMode,
}) => {
  const [tab, setTab] = useState<'audio' | 'video' | 'controls' | 'about'>('audio');
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <header className="modal-header">
          <h2>Configuración</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </header>
        <nav className="tabs">
          <button onClick={() => setTab('audio')} className={tab === 'audio' ? 'active' : ''}>Audio</button>
          <button onClick={() => setTab('video')} className={tab === 'video' ? 'active' : ''}>Video</button>
          <button onClick={() => setTab('controls')} className={tab === 'controls' ? 'active' : ''}>Controles</button>
          <button onClick={() => setTab('about')} className={tab === 'about' ? 'active' : ''}>Acerca</button>
        </nav>
        <div className="tab-body">
          {tab === 'audio' && (
            <div>
              <label>Volumen general</label>
              <input
                type="range" min={0} max={1} step={0.01}
                value={masterVolume}
                onChange={e => onMasterVolume(parseFloat(e.target.value))}
              />
              <p>Estado: micrófono {micEnabled ? '✅ activo' : '❌ inactivo'}</p>
              <button className="btn-secondary" onClick={onTestMic}>Probar micrófono</button>
              <hr />
              <label className="check">
                <input type="checkbox" checked={pttMode} onChange={e => onPttMode(e.target.checked)} />
                Push-to-talk (mantén Espacio para hablar)
              </label>
            </div>
          )}
          {tab === 'video' && (
            <div>
              <p>Cámara {camEnabled ? '✅ activa' : '❌ inactiva'}</p>
              <p style={{ opacity: 0.7 }}>
                Activa la cámara desde la barra inferior. Ajustes avanzados de
                resolución se implementarán en la próxima fase.
              </p>
            </div>
          )}
          {tab === 'controls' && (
            <div className="controls-help">
              <h4>Movimiento</h4>
              <ul>
                <li><kbd>WASD</kbd> / <kbd>↑↓←→</kbd> – mover</li>
                <li><kbd>Click</kbd> en el suelo – ir a un punto</li>
                <li><kbd>Click</kbd> en una silla – sentarse</li>
              </ul>
              <h4>Comunicación</h4>
              <ul>
                <li>Acércate (200px) a otros para activar audio</li>
                <li><kbd>N</kbd> – crear sticky note en tu posición</li>
                <li><kbd>E</kbd> – interactuar con objeto</li>
              </ul>
            </div>
          )}
          {tab === 'about' && (
            <div>
              <h4>Orbitra v0.2</h4>
              <p>Espacios virtuales con audio/video por proximidad.</p>
              <p>Construido con React + Phaser + Socket.io + WebRTC.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
