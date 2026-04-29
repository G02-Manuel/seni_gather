import React from 'react';
import VideoTile from './VideoTile';

interface PeerInfo { id: string; name: string; stream: MediaStream | null; volume: number; speaking: boolean; }

interface Props {
  localStream: MediaStream | null;
  localName: string;
  localSpeaking: boolean;
  peers: PeerInfo[];
}

const VideoOverlay: React.FC<Props> = ({ localStream, localName, localSpeaking, peers }) => {
  const visible = peers.filter(p => p.volume > 0.02);
  return (
    <div className="video-overlay">
      <VideoTile stream={localStream} name={localName} isLocal speaking={localSpeaking} />
      {visible.map(p => (
        <VideoTile
          key={p.id}
          stream={p.stream}
          name={p.name}
          speaking={p.speaking}
          volume={p.volume}
        />
      ))}
    </div>
  );
};

export default VideoOverlay;
