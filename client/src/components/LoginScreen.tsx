import React, { useEffect, useState } from 'react';
import { AvatarConfig, DEFAULT_AVATAR } from '../types';
import { TEMPLATE_LIST, TemplateId } from '../game/utils/MapDefinitions';
import AvatarCustomizer from './Avatar/AvatarCustomizer';

interface CreateOptions {
  permanent: boolean;
  roomName?: string;
}

interface PermanentRoom {
  code: string;
  templateId: string;
  name: string;
  ownerName: string;
  createdAt: number;
}

interface Props {
  onCreate: (name: string, templateId: TemplateId, avatar: AvatarConfig, opts: CreateOptions) => void;
  onJoin:   (name: string, roomCode: string, avatar: AvatarConfig) => void;
}

type Tab = 'create' | 'join' | 'spaces';

const LoginScreen: React.FC<Props> = ({ onCreate, onJoin }) => {
  const [tab, setTab] = useState<Tab>('create');
  const [name, setName] = useState('');
  const [templateId, setTemplateId] = useState<TemplateId>('office');
  const [code, setCode] = useState('');
  const [permanent, setPermanent] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [avatar, setAvatar] = useState<AvatarConfig>(DEFAULT_AVATAR);
  const [step, setStep] = useState<'identity' | 'avatar'>('identity');
  const [permanentRooms, setPermanentRooms] = useState<PermanentRoom[]>([]);

  // Cargar espacios permanentes al abrir la pestaña
  useEffect(() => {
    if (tab !== 'spaces') return;
    fetch('/api/permanent-rooms')
      .then((r) => r.json())
      .then((rows) => Array.isArray(rows) && setPermanentRooms(rows))
      .catch(() => setPermanentRooms([]));
  }, [tab]);

  const canContinue =
    name.trim().length > 0 &&
    (tab === 'create'
      ? !!templateId
      : tab === 'join'
      ? code.trim().length === 6
      : false);

  if (step === 'avatar') {
    return (
      <div className="login-page">
        <div className="login-card wide">
          <AvatarCustomizer
            initial={avatar}
            onConfirm={(cfg) => {
              setAvatar(cfg);
              if (tab === 'create') {
                onCreate(name.trim(), templateId, cfg, {
                  permanent,
                  roomName: permanent ? (roomName.trim() || undefined) : undefined,
                });
              } else {
                onJoin(name.trim(), code.trim().toUpperCase(), cfg);
              }
            }}
            onCancel={() => setStep('identity')}
            title="Personaliza tu avatar"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card wide">
        <h1>🌍 Orbitra</h1>
        <p className="subtitle">Espacios virtuales con audio y video por proximidad</p>

        <div className="login-tabs">
          <button
            className={`login-tab ${tab === 'create' ? 'active' : ''}`}
            onClick={() => setTab('create')}
            type="button"
          >
            ✨ Crear sala
          </button>
          <button
            className={`login-tab ${tab === 'join' ? 'active' : ''}`}
            onClick={() => setTab('join')}
            type="button"
          >
            🔗 Unirme con código
          </button>
          <button
            className={`login-tab ${tab === 'spaces' ? 'active' : ''}`}
            onClick={() => setTab('spaces')}
            type="button"
          >
            🏛️ Espacios guardados
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canContinue) setStep('avatar');
          }}
        >
          <div className="form-group">
            <label htmlFor="playerName">Tu nombre</label>
            <input
              id="playerName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="¿Cómo te llamas?"
              maxLength={20}
              autoFocus
              required
            />
          </div>

          {tab === 'create' && (
            <>
              <label className="block-label">Elige el tipo de espacio</label>
              <div className="template-gallery">
                {TEMPLATE_LIST.map((t) => (
                  <button
                    type="button"
                    key={t.id}
                    className={`template-card ${templateId === t.id ? 'active' : ''}`}
                    onClick={() => setTemplateId(t.id)}
                  >
                    <div className="template-icon">{t.icon}</div>
                    <div className="template-name">{t.name}</div>
                    <div className="template-desc">{t.description}</div>
                  </button>
                ))}
              </div>

              <div className="form-group permanent-toggle">
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={permanent}
                    onChange={(e) => setPermanent(e.target.checked)}
                  />
                  <span>
                    <strong>🏛️ Hacer este un espacio permanente</strong>
                    <br />
                    <small>
                      El código quedará guardado y podrás volver luego con el mismo
                      contenido (notas, pizarra).
                    </small>
                  </span>
                </label>
              </div>

              {permanent && (
                <div className="form-group">
                  <label htmlFor="roomName">Nombre del espacio (opcional)</label>
                  <input
                    id="roomName"
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="Ej: Oficina del equipo Diseño"
                    maxLength={60}
                  />
                </div>
              )}
            </>
          )}

          {tab === 'join' && (
            <div className="form-group">
              <label htmlFor="roomCode">Código de sala</label>
              <input
                id="roomCode"
                type="text"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))
                }
                placeholder="ABC123"
                className="code-input"
                maxLength={6}
                required
              />
              <small className="hint-text">
                Pídele el código a quien creó la sala (6 caracteres).
              </small>
            </div>
          )}

          {tab === 'spaces' && (
            <div className="permanent-list">
              {permanentRooms.length === 0 ? (
                <p className="hint-text">
                  Aún no hay espacios guardados. Crea uno marcando “Hacer permanente”.
                </p>
              ) : (
                <ul>
                  {permanentRooms.map((r) => {
                    const isOwner =
                      !!name.trim() &&
                      r.ownerName.trim().toLowerCase() === name.trim().toLowerCase();
                    return (
                      <li key={r.code} className="permanent-item">
                        <div>
                          <div className="permanent-name">{r.name}</div>
                          <div className="permanent-meta">
                            {r.ownerName ? `Por ${r.ownerName} · ` : ''}
                            {r.templateId}
                          </div>
                        </div>
                        <div className="permanent-actions">
                          {isOwner && (
                            <button
                              type="button"
                              className="btn-danger"
                              title="Eliminar este espacio (solo el creador)"
                              onClick={async () => {
                                if (!window.confirm(
                                  `¿Eliminar el espacio "${r.name}" (${r.code})?\n` +
                                  'Se borrarán notas y pizarra. Esta acción no se puede deshacer.'
                                )) return;
                                try {
                                  const res = await fetch(
                                    `/api/permanent-rooms/${r.code}?ownerName=${encodeURIComponent(name.trim())}`,
                                    { method: 'DELETE' },
                                  );
                                  if (!res.ok) {
                                    const body = await res.json().catch(() => ({}));
                                    if (body.error === 'IN_USE') {
                                      alert('No se puede eliminar: hay personas dentro del espacio.');
                                    } else if (body.error === 'FORBIDDEN') {
                                      alert('Solo el creador puede eliminar este espacio.');
                                    } else {
                                      alert('No se pudo eliminar el espacio.');
                                    }
                                    return;
                                  }
                                  setPermanentRooms((prev) => prev.filter((x) => x.code !== r.code));
                                } catch {
                                  alert('Error de red al eliminar.');
                                }
                              }}
                            >
                              🗑
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn-secondary"
                            disabled={!name.trim()}
                            onClick={() => {
                              if (!name.trim()) return;
                              setCode(r.code);
                              setTab('join');
                              setStep('avatar');
                            }}
                          >
                            {r.code} →
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {tab !== 'spaces' && (
            <button type="submit" className="btn-primary big" disabled={!canContinue}>
              {tab === 'create' ? 'Crear espacio →' : 'Unirme →'}
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;
