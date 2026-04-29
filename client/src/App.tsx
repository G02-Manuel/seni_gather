import React, { useState } from 'react';
import LoginScreen from './components/LoginScreen';
import GameContainer from './components/GameContainer';
import { AvatarConfig, DEFAULT_AVATAR } from './types';
import { TemplateId } from './game/utils/MapDefinitions';
import './App.css';

type Mode = 'create' | 'join';

interface CreateOpts { permanent: boolean; roomName?: string; }

function App() {
  const [logged, setLogged] = useState(false);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<AvatarConfig>(DEFAULT_AVATAR);
  const [mode, setMode] = useState<Mode>('create');
  const [templateId, setTemplateId] = useState<TemplateId>('office');
  const [roomCode, setRoomCode] = useState<string>('');
  const [createOpts, setCreateOpts] = useState<CreateOpts>({ permanent: false });

  const handleCreateRoom = (n: string, t: TemplateId, a: AvatarConfig, opts: CreateOpts) => {
    setName(n); setAvatar(a); setMode('create'); setTemplateId(t); setRoomCode('');
    setCreateOpts(opts);
    setLogged(true);
  };

  const handleJoinRoom = (n: string, code: string, a: AvatarConfig) => {
    setName(n); setAvatar(a); setMode('join'); setRoomCode(code.toUpperCase());
    setLogged(true);
  };

  const handleLogout = () => setLogged(false);

  return (
    <div className="App">
      {!logged ? (
        <LoginScreen onCreate={handleCreateRoom} onJoin={handleJoinRoom} />
      ) : (
        <GameContainer
          playerName={name}
          avatar={avatar}
          mode={mode}
          templateId={templateId}
          roomCode={roomCode}
          permanent={createOpts.permanent}
          customRoomName={createOpts.roomName}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}

export default App;
