import React, { useState } from 'react';
import { EMOTES } from '../../types';

interface Props {
  micOn: boolean;
  camOn: boolean;
  muted: boolean;
  sharingScreen?: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleMute: () => void;
  onOpenSettings: () => void;
  onOpenAvatar: () => void;
  onOpenWhiteboard: () => void;
  onEmote: (emote: string) => void;
  onShareScreen?: () => void;
}

const BottomBar: React.FC<Props> = ({
  micOn, camOn, muted, sharingScreen,
  onToggleMic, onToggleCam, onToggleMute,
  onOpenSettings, onOpenAvatar, onOpenWhiteboard, onEmote, onShareScreen,
}) => {
  const [emotesOpen, setEmotesOpen] = useState(false);
  return (
    <div className="bottombar">
      <button className={`bb-btn ${micOn ? 'on' : ''}`} title="Micrófono (M)" onClick={onToggleMic}>
        {micOn ? '🎤' : '🔇'}
      </button>
      <button className={`bb-btn ${camOn ? 'on' : ''}`} title="Cámara (V)" onClick={onToggleCam}>
        {camOn ? '📹' : '📷'}
      </button>
      <button className={`bb-btn ${muted ? 'danger' : ''}`} title="Silenciar a todos" onClick={onToggleMute}>
        {muted ? '🔕' : '🔔'}
      </button>
      {onShareScreen && (
        <button
          className={`bb-btn ${sharingScreen ? 'on' : ''}`}
          title={sharingScreen ? 'Detener pantalla compartida' : 'Compartir pantalla'}
          onClick={onShareScreen}
        >
          🖥️
        </button>
      )}
      <button className="bb-btn" title="Pizarra" onClick={onOpenWhiteboard}>🖊️</button>
      <button className="bb-btn" title="Emote" onClick={() => setEmotesOpen(o => !o)}>
        😊
      </button>
      <button className="bb-btn" title="Mi avatar" onClick={onOpenAvatar}>👤</button>
      <button className="bb-btn" title="Configuración" onClick={onOpenSettings}>⚙️</button>

      {emotesOpen && (
        <div className="emote-popover">
          {EMOTES.map(e => (
            <button key={e} className="emote-btn" onClick={() => { onEmote(e); setEmotesOpen(false); }}>{e}</button>
          ))}
        </div>
      )}
    </div>
  );
};

export default BottomBar;
