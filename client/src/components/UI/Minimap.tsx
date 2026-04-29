import React from 'react';

interface PlayerPos { id: string; x: number; y: number; isLocal: boolean; }

interface Props {
  image: string;
  positions: PlayerPos[];
  mapWidth: number;
  mapHeight: number;
}

const SIZE = 180;

/**
 * Minimapa con imagen del mapa y puntos de jugadores.
 * Las posiciones se reescalan a SIZExSIZE.
 */
const Minimap: React.FC<Props> = ({ image, positions, mapWidth, mapHeight }) => {
  const sx = SIZE / mapWidth;
  const sy = SIZE / mapHeight;
  return (
    <div className="minimap" style={{ width: SIZE, height: SIZE }}>
      {image && (
        <img src={image} alt="minimap" style={{ width: '100%', height: '100%', imageRendering: 'pixelated' }} />
      )}
      <svg className="minimap-svg" viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {positions.map(p => (
          <circle
            key={p.id}
            cx={p.x * sx}
            cy={p.y * sy}
            r={p.isLocal ? 4 : 3}
            fill={p.isLocal ? '#4ade80' : '#f59e0b'}
            stroke="#000"
            strokeWidth="0.5"
          />
        ))}
      </svg>
    </div>
  );
};

export default Minimap;
