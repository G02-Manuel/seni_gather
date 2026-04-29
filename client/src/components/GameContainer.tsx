import React, { useEffect, useMemo, useRef, useState } from 'react';
import Phaser from 'phaser';
import { GameScene, GameSceneCallbacks } from '../game/GameScene';
import { SocketManager } from '../services/SocketManager';
import { WebRTCManager } from '../services/WebRTCManager';
import { AudioManager } from '../services/AudioManager';
import {
  Player, ChatMessage, AvatarConfig, PlayerStatus, CONSTANTS, WhiteboardStroke,
} from '../types';
import { MAPS, TemplateId } from '../game/utils/MapDefinitions';

import TopBar from './UI/TopBar';
import Sidebar from './UI/Sidebar';
import BottomBar from './UI/BottomBar';
import Minimap from './UI/Minimap';
import Settings from './UI/Settings';
import ChatPanel from './Chat/ChatPanel';
import VideoOverlay from './Video/VideoOverlay';
import AvatarCustomizer from './Avatar/AvatarCustomizer';
import Whiteboard from './Whiteboard/Whiteboard';

interface Props {
  playerName: string;
  avatar: AvatarConfig;
  mode: 'create' | 'join';
  templateId: TemplateId;   // sólo se usa cuando mode='create'
  roomCode: string;         // sólo se usa cuando mode='join'
  onLogout: () => void;
}

interface PeerVideo { id: string; name: string; stream: MediaStream | null; volume: number; speaking: boolean; }

const GameContainer: React.FC<Props> = ({ playerName, avatar, mode, templateId, roomCode, onLogout }) => {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<GameScene | null>(null);

  const socketRef = useRef<SocketManager | null>(null);
  const rtcRef = useRef<WebRTCManager | null>(null);
  const audioRef = useRef<AudioManager | null>(null);

  const [players, setPlayers] = useState<Player[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [localId, setLocalId] = useState<string>('');
  const [activeTemplate, setActiveTemplate] = useState<TemplateId>(templateId);
  const [activeRoomCode, setActiveRoomCode] = useState<string>(mode === 'join' ? roomCode : '');
  const [activeRoomName, setActiveRoomName] = useState<string>('Conectando…');
  const [roomError, setRoomError] = useState<string | null>(null);
  const [minimap, setMinimap] = useState<string>('');
  const [positions, setPositions] = useState<{ id: string; x: number; y: number; isLocal: boolean }[]>([]);
  const [proximityDistances, setProximityDistances] = useState<Map<string, number>>(new Map());

  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [muted, setMuted] = useState(false);
  const [masterVolume, setMasterVolume] = useState(1);
  const [pttMode, setPttMode] = useState(false);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peerStreams, setPeerStreams] = useState<Map<string, MediaStream>>(new Map());
  const [speakingIds, setSpeakingIds] = useState<Set<string>>(new Set());
  const [iAmSpeaking, setIAmSpeaking] = useState(false);

  const [sharingScreen, setSharingScreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAvatar, setShowAvatar] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [whiteboardHistory, setWhiteboardHistory] = useState<WhiteboardStroke[]>([]);

  // -------------------------------------------------------------------
  // BOOT
  // -------------------------------------------------------------------
  useEffect(() => {
    if (!gameRef.current) return;

    // Patrón anti-StrictMode (React 18 dev): retrasamos el arranque real un
    // tick. Si React desmonta inmediatamente, cancelamos antes de crear nada.
    let cancelled = false;
    let socket: SocketManager | null = null;
    let rtc: WebRTCManager | null = null;
    let audio: AudioManager | null = null;
    let game: Phaser.Game | null = null;

    const bootTimer = setTimeout(() => {
      if (cancelled) return;

      socket = new SocketManager();
      audio = new AudioManager();
      rtc = new WebRTCManager(socket, {
        onPeerStream: (id, stream) => {
          setPeerStreams(prev => { const m = new Map(prev); m.set(id, stream); return m; });
        },
        onPeerClose: (id) => {
          setPeerStreams(prev => { const m = new Map(prev); m.delete(id); return m; });
        },
        onLocalStream: (stream) => {
          setLocalStream(stream);
          if (stream && stream.getAudioTracks().length > 0) {
            audio!.attachStream(stream, (sp) => {
              setIAmSpeaking(sp);
              socket!.sendSpeaking(sp);
            });
          } else {
            audio!.detach();
          }
        },
        onError: (e) => console.error('WebRTC error:', e),
      });

      socketRef.current = socket;
      rtcRef.current = rtc;
      audioRef.current = audio;

      const localSocket = socket;
      const localRtc = rtc;
      const localAudio = audio;

      const callbacks: GameSceneCallbacks = {
        onLocalPlayerReady: (id) => { setLocalId(id); localRtc.setLocalId(id); },
        onPlayersUpdated: (list) => setPlayers([...list]),
        onMapChanged: (id) => setActiveTemplate(id as TemplateId),
        onMinimapReady: (img) => setMinimap(img),
        onPlayerPositions: (pos) => setPositions(pos),
        onProximityDistances: (d) => setProximityDistances(d),
        onWhiteboardOpen: () => setShowWhiteboard(true),
        onScreenOpen: () => alert('Compartir pantalla – próximamente'),
        onSceneReady: () => {
          // La escena quedó lista. Disparamos crear o unirnos a la sala.
          localSocket.connect();
          if (mode === 'create') {
            localSocket.createRoom(playerName, templateId, avatar);
          } else {
            localSocket.joinByCode(playerName, roomCode, avatar);
          }
        },
      };

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: gameRef.current!,
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: '#16213e',
        pixelArt: true,
        physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
        scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
      };
      game = new Phaser.Game(config);
      phaserRef.current = game;

      game.events.once(Phaser.Core.Events.READY, () => {
        if (cancelled || !game) return;
        const scene = game.scene.add(
          'main', GameScene, true,
          { name: playerName, avatar, templateId, callbacks }
        ) as GameScene;
        sceneRef.current = scene;
        scene.setManagers(localSocket, localRtc, localAudio);
      });

      // Listeners React-side
      localSocket.onChatMessage((m) => { setMessages(p => [...p.slice(-199), m]); localAudio.playMessage(); });
      localSocket.onChatHistory((h) => setMessages(h));
      localSocket.onPlayerSpeaking(({ id, speaking }) => {
        setSpeakingIds(prev => {
          const s = new Set(prev);
          if (speaking) s.add(id); else s.delete(id);
          return s;
        });
      });
      localSocket.onWhiteboardHistory((h) => setWhiteboardHistory(h));
      localSocket.onStroke((s) => setWhiteboardHistory(prev => [...prev, s]));
      localSocket.onWhiteboardClear(() => setWhiteboardHistory([]));

      // Salas: confirmación / error
      localSocket.onRoomJoined((info) => {
        setActiveRoomCode(info.roomCode);
        setActiveTemplate(info.templateId as TemplateId);
        setActiveRoomName(info.name);
        setRoomError(null);
        // Si entramos por código, el template real puede diferir del por-defecto.
        sceneRef.current?.setTemplate(info.templateId as TemplateId);
      });
      localSocket.onRoomError((err) => {
        setRoomError(err.message || 'Error al entrar a la sala');
      });
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(bootTimer);
      try { rtc?.closeAll(); } catch {}
      try { audio?.detach(); } catch {}
      try { socket?.disconnect(); } catch {}
      try { game?.destroy(true); } catch {}
      socketRef.current = null;
      rtcRef.current = null;
      audioRef.current = null;
      sceneRef.current = null;
      phaserRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------------------------------------------
  // MASTER VOLUME / MUTE
  // -------------------------------------------------------------------
  useEffect(() => { rtcRef.current?.setMasterVolume(masterVolume); }, [masterVolume]);
  useEffect(() => { rtcRef.current?.setMuted(muted); }, [muted]);

  // -------------------------------------------------------------------
  // PTT (Push-to-talk: Espacio para hablar)
  // -------------------------------------------------------------------
  useEffect(() => {
    if (!pttMode) return;
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
        rtcRef.current?.toggleMicTrack(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') rtcRef.current?.toggleMicTrack(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    rtcRef.current?.toggleMicTrack(false);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [pttMode]);

  // -------------------------------------------------------------------
  // ACTIONS
  // -------------------------------------------------------------------
  const toggleMic = async () => {
    const rtc = rtcRef.current!;
    const next = !micOn;
    const ok = await rtc.setMicEnabled(next);
    if (ok) {
      setMicOn(next);
      sceneRef.current?.setLocalMicCam(next, camOn);
    }
  };

  const toggleCam = async () => {
    const rtc = rtcRef.current!;
    const next = !camOn;
    const ok = await rtc.setCamEnabled(next);
    if (ok) {
      setCamOn(next);
      sceneRef.current?.setLocalMicCam(micOn, next);
    }
  };

  const toggleScreenShare = async () => {
    const rtc = rtcRef.current!;
    if (rtc.screenSharing) {
      await rtc.stopScreenShare();
      setSharingScreen(false);
      // Si la cámara seguía conceptualmente apagada, reflejarlo
      setCamOn(rtc.camEnabled);
      sceneRef.current?.setLocalMicCam(micOn, rtc.camEnabled);
    } else {
      const ok = await rtc.startScreenShare();
      if (ok) {
        setSharingScreen(true);
        // Mientras se comparte, se reemplaza el vídeo de cámara
        sceneRef.current?.setLocalMicCam(micOn, true);
      }
    }
  };

  const handleEmote = (e: string) => {
    sceneRef.current?.triggerEmote(e);
  };
  const handleStatus = (s: PlayerStatus) => {
    sceneRef.current?.setLocalStatus(s);
  };
  const handleNewAvatar = (cfg: AvatarConfig) => {
    sceneRef.current?.setLocalAvatar(cfg);
    setShowAvatar(false);
  };
  const handleChangeMap = (newArea: string) => {
    socketRef.current?.changeMap(newArea);
  };

  const handleSendChat = (msg: string) => {
    socketRef.current?.sendChatMessage(msg);
  };

  // -------------------------------------------------------------------
  // DERIVED
  // -------------------------------------------------------------------
  const me = players.find(p => p.id === localId);
  const myStatus = me?.status || 'online';
  const roomName = MAPS[activeTemplate]?.name || activeRoomName || 'Orbitra';
  const mapDef = MAPS[activeTemplate];
  const mapPxW = (mapDef?.widthTiles || 1) * (mapDef?.tileSize || 32);
  const mapPxH = (mapDef?.heightTiles || 1) * (mapDef?.tileSize || 32);

  const nearbyIds = useMemo(() => new Set(proximityDistances.keys()), [proximityDistances]);

  const peerVideoData: PeerVideo[] = useMemo(() => {
    const arr: PeerVideo[] = [];
    for (const [pid, d] of proximityDistances) {
      const p = players.find(x => x.id === pid);
      const stream = peerStreams.get(pid) || null;
      const t = Math.max(0, 1 - d / CONSTANTS.PROXIMITY_RADIUS);
      arr.push({
        id: pid,
        name: p?.name || '???',
        stream,
        volume: t * t,
        speaking: speakingIds.has(pid),
      });
    }
    return arr;
  }, [proximityDistances, players, peerStreams, speakingIds]);

  // -------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------
  return (
    <div className="game-wrapper">
      <div ref={gameRef} className="game-canvas" />

      <TopBar
        roomName={roomName}
        roomCode={activeRoomCode}
        templateId={activeTemplate}
        playersCount={players.length}
        playerX={me?.x}
        playerY={me?.y}
        onFastTravel={handleChangeMap}
        onLogout={onLogout}
      />

      <Sidebar
        players={players}
        localId={localId}
        nearbyIds={nearbyIds}
        speakingIds={speakingIds}
        onChangeStatus={handleStatus}
        myStatus={myStatus}
      />

      <BottomBar
        micOn={micOn}
        camOn={camOn}
        muted={muted}
        sharingScreen={sharingScreen}
        onToggleMic={toggleMic}
        onToggleCam={toggleCam}
        onToggleMute={() => setMuted(m => !m)}
        onShareScreen={toggleScreenShare}
        onOpenSettings={() => setShowSettings(true)}
        onOpenAvatar={() => setShowAvatar(true)}
        onOpenWhiteboard={() => setShowWhiteboard(true)}
        onEmote={handleEmote}
      />

      <div className="topright-stack">
        {minimap && mapDef && (
          <Minimap image={minimap} positions={positions} mapWidth={mapPxW} mapHeight={mapPxH} />
        )}
      </div>

      <ChatPanel messages={messages} onSend={handleSendChat} localId={localId} />

      <VideoOverlay
        localStream={localStream}
        localName={playerName}
        localSpeaking={iAmSpeaking}
        peers={peerVideoData}
      />

      <Settings
        open={showSettings}
        onClose={() => setShowSettings(false)}
        micEnabled={micOn}
        camEnabled={camOn}
        masterVolume={masterVolume}
        onMasterVolume={setMasterVolume}
        onTestMic={toggleMic}
        pttMode={pttMode}
        onPttMode={setPttMode}
      />

      {showAvatar && (
        <AvatarCustomizer
          asModal
          initial={me?.avatar || avatar}
          onConfirm={handleNewAvatar}
          onCancel={() => setShowAvatar(false)}
        />
      )}

      <Whiteboard
        open={showWhiteboard}
        onClose={() => setShowWhiteboard(false)}
        history={whiteboardHistory}
        onStroke={(s) => { socketRef.current?.sendStroke(s); setWhiteboardHistory(prev => [...prev, s]); }}
        onClear={() => { socketRef.current?.clearWhiteboard(); setWhiteboardHistory([]); }}
        authorId={localId}
      />

      <div className="hint-pill">
        WASD/Click para moverte · Acércate para hablar · N: nota · Espacio: PTT (si activo)
      </div>

      {roomError && (
        <div className="room-error-modal">
          <div className="room-error-card">
            <div className="room-error-icon">⚠️</div>
            <h3>No se pudo entrar a la sala</h3>
            <p>{roomError}</p>
            <button className="btn-primary" onClick={onLogout}>Volver</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameContainer;
