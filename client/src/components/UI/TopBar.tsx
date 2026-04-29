import React, { useMemo, useState } from 'react';
import { fastTravelFor, TemplateId } from '../../game/utils/MapDefinitions';

interface Props {
  roomName: string;
  roomCode: string;
  templateId: TemplateId;
  playersCount: number;
  playerX?: number;
  playerY?: number;
  onFastTravel: (areaId: string) => void;
  onLogout: () => void;
}

function activeArea(
  points: { id: string; tileX: number; tileY: number }[],
  x: number | undefined,
  y: number | undefined
): string | null {
  if (typeof x !== 'number' || typeof y !== 'number') return null;
  const T = 32;
  let best: { id: string; d: number } | null = null;
  for (const p of points) {
    const dx = x - p.tileX * T;
    const dy = y - p.tileY * T;
    const d = Math.hypot(dx, dy);
    if (!best || d < best.d) best = { id: p.id, d };
  }
  return best?.id || null;
}

const TopBar: React.FC<Props> = ({
  roomName, roomCode, templateId, playersCount, playerX, playerY,
  onFastTravel, onLogout,
}) => {
  const points = useMemo(() => fastTravelFor(templateId), [templateId]);
  const current = activeArea(points, playerX, playerY);
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    if (!roomCode) return;
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard bloqueado */
    }
  };

  return (
    <div className="topbar">
      <div className="topbar-left">
        <div className="brand">🌍 <strong>Orbitra</strong></div>
        <div className="room-name">{roomName}</div>
        {roomCode && (
          <button
            className={`room-code-badge ${copied ? 'copied' : ''}`}
            onClick={copyCode}
            title="Copiar código de sala"
          >
            <span className="room-code-label">Sala</span>
            <span className="room-code-value">{roomCode}</span>
            <span className="room-code-icon">{copied ? '✓' : '📋'}</span>
          </button>
        )}
      </div>
      <div className="topbar-center">
        {points.map((p) => (
          <button
            key={p.id}
            className={`map-pill ${p.id === current ? 'active' : ''}`}
            onClick={() => onFastTravel(p.id)}
            title={`Ir a ${p.name}`}
          >
            <span>{p.icon}</span> {p.name}
          </button>
        ))}
      </div>
      <div className="topbar-right">
        <span className="players-pill">👥 {playersCount}</span>
        <button className="btn-ghost" onClick={onLogout} title="Salir">🚪</button>
      </div>
    </div>
  );
};

export default TopBar;
