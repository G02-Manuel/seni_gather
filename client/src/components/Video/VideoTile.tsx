import React, { useEffect, useRef } from 'react';

interface Props {
  stream: MediaStream | null;
  name: string;
  isLocal?: boolean;
  speaking?: boolean;
  /** Volumen relativo (0-1). Sólo informativo en este componente */
  volume?: number;
}

/**
 * Tile de video flotante 160x120. Si no hay stream o cámara está apagada,
 * muestra un avatar genérico con iniciales.
 */
const VideoTile: React.FC<Props> = ({ stream, name, isLocal, speaking, volume }) => {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream;
      // Local debe ir muteado para evitar feedback
      ref.current.muted = !!isLocal;
    }
  }, [stream, isLocal]);

  const hasVideo = !!stream && stream.getVideoTracks().some(t => t.enabled && t.readyState === 'live');

  return (
    <div className={`video-tile ${speaking ? 'speaking' : ''} ${isLocal ? 'local' : ''}`}>
      {hasVideo ? (
        <video ref={ref} autoPlay playsInline />
      ) : (
        <div className="video-placeholder">
          <div className="avatar-circle">{name.slice(0, 2).toUpperCase()}</div>
        </div>
      )}
      <div className="video-label">
        <span>{name}{isLocal ? ' (tú)' : ''}</span>
        {typeof volume === 'number' && !isLocal && (
          <span className="vol-bar">
            <span style={{ width: `${Math.round(volume * 100)}%` }} />
          </span>
        )}
      </div>
    </div>
  );
};

export default VideoTile;
