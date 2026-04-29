import React from 'react';
import { Player, STATUS_COLORS, STATUS_LABELS, PlayerStatus } from '../../types';

interface Props {
  players: Player[];
  localId?: string;
  nearbyIds: Set<string>;
  speakingIds: Set<string>;
  onChangeStatus: (s: PlayerStatus) => void;
  myStatus: PlayerStatus;
  onMessagePlayer?: (id: string) => void;
}

const Sidebar: React.FC<Props> = ({ players, localId, nearbyIds, speakingIds, onChangeStatus, myStatus }) => {
  const sorted = [...players].sort((a, b) => {
    if (a.id === localId) return -1;
    if (b.id === localId) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <h3>Personas en la sala</h3>
        <span className="count">{players.length}</span>
      </header>

      <div className="status-row">
        <label>Mi estado</label>
        <select
          value={myStatus}
          onChange={(e) => onChangeStatus(e.target.value as PlayerStatus)}
        >
          {Object.keys(STATUS_LABELS).map(k => (
            <option key={k} value={k}>{STATUS_LABELS[k as PlayerStatus]}</option>
          ))}
        </select>
      </div>

      <ul className="player-list">
        {sorted.map(p => {
          const isMe = p.id === localId;
          const isNearby = nearbyIds.has(p.id);
          const isSpeaking = speakingIds.has(p.id);
          return (
            <li key={p.id} className={`player-item ${isMe ? 'me' : ''} ${isSpeaking ? 'speaking' : ''}`}>
              <div className="avatar-dot">
                <span className="initials">{p.name.slice(0, 2).toUpperCase()}</span>
                <span className="status-dot" style={{ background: STATUS_COLORS[p.status] }} />
              </div>
              <div className="player-info">
                <div className="player-name">
                  {p.name} {isMe && <span className="me-tag">tú</span>}
                </div>
                <div className="player-meta">
                  {isSpeaking && <span className="badge speaking">🎙️ hablando</span>}
                  {isNearby && !isMe && <span className="badge near">📍 cerca</span>}
                  {p.sittingOn && <span className="badge sit">🪑 sentado</span>}
                  {p.inPrivateZone && <span className="badge private">🔒 privado</span>}
                </div>
              </div>
              <div className="player-icons">
                <span className={p.micOn ? 'on' : 'off'}>{p.micOn ? '🎤' : '🔇'}</span>
                <span className={p.camOn ? 'on' : 'off'}>{p.camOn ? '📹' : '📷'}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
};

export default Sidebar;
