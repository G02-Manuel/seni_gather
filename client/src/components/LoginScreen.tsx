import React, { useState } from 'react';
import { AvatarConfig, DEFAULT_AVATAR } from '../types';
import { TEMPLATE_LIST, TemplateId } from '../game/utils/MapDefinitions';
import AvatarCustomizer from './Avatar/AvatarCustomizer';

interface Props {
  onCreate: (name: string, templateId: TemplateId, avatar: AvatarConfig) => void;
  onJoin:   (name: string, roomCode: string, avatar: AvatarConfig) => void;
}

type Tab = 'create' | 'join';

const LoginScreen: React.FC<Props> = ({ onCreate, onJoin }) => {
  const [tab, setTab] = useState<Tab>('create');
  const [name, setName] = useState('');
  const [templateId, setTemplateId] = useState<TemplateId>('office');
  const [code, setCode] = useState('');
  const [avatar, setAvatar] = useState<AvatarConfig>(DEFAULT_AVATAR);
  const [step, setStep] = useState<'identity' | 'avatar'>('identity');

  const canContinue =
    name.trim().length > 0 &&
    (tab === 'create' ? !!templateId : code.trim().length === 6);

  if (step === 'avatar') {
    return (
      <div className="login-page">
        <div className="login-card wide">
          <AvatarCustomizer
            initial={avatar}
            onConfirm={(cfg) => {
              setAvatar(cfg);
              if (tab === 'create') onCreate(name.trim(), templateId, cfg);
              else                   onJoin(name.trim(), code.trim().toUpperCase(), cfg);
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

          <button type="submit" className="btn-primary big" disabled={!canContinue}>
            {tab === 'create' ? 'Crear espacio →' : 'Unirme →'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;
