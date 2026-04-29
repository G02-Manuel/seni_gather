import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage } from '../../types';

interface Props {
  messages: ChatMessage[];
  onSend: (msg: string) => void;
  localId?: string;
}

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const ChatPanel: React.FC<Props> = ({ messages, onSend, localId }) => {
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = input.trim();
    if (!t) return;
    onSend(t);
    setInput('');
  };

  return (
    <div className={`chat-panel ${open ? 'open' : 'closed'}`}>
      <header className="chat-header" onClick={() => setOpen(o => !o)}>
        <span>💬 Chat de sala</span>
        <span className="badge">{messages.length}</span>
      </header>
      {open && (
        <>
          <div className="chat-body" ref={ref}>
            {messages.map(m => (
              <div key={m.id} className={`chat-line ${m.playerId === localId ? 'mine' : ''}`}>
                <div className="meta">
                  <span className="who">{m.playerName}</span>
                  <span className="when">{formatTime(m.timestamp)}</span>
                </div>
                <div className="text">{m.message}</div>
              </div>
            ))}
            {messages.length === 0 && (
              <div className="empty">Sin mensajes aún. ¡Saluda!</div>
            )}
          </div>
          <form className="chat-input" onSubmit={submit}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Escribe un mensaje…"
              maxLength={500}
            />
            <button type="submit" disabled={!input.trim()}>Enviar</button>
          </form>
        </>
      )}
    </div>
  );
};

export default ChatPanel;
