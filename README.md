# Orbitra 🌍

Plataforma de espacios virtuales 2D con audio/video por proximidad, similar a Gather.

## 🚀 Características Actuales

- ✅ Movimiento fluido de avatares en mapas 2D (WASD o flechas)
- ✅ Sistema de salas/espacios múltiples
- ✅ Sincronización multijugador en tiempo real
- ✅ Chat de texto con historial
- ✅ Visualización de otros jugadores
- ✅ Grid visible y objetos decorativos básicos
- 🔄 Audio/Video por proximidad (infraestructura lista, implementación pendiente)
- 🔄 Objetos interactivos (próximamente)
- 🔄 Editor de mapas (próximamente)

## 🎯 Próximas Mejoras

**📖 Guías para Implementación Completa:**

1. **[PROMPT_OPUS_4.7.md](PROMPT_OPUS_4.7.md)** - Especificación exhaustiva (14 secciones, 200+ requerimientos)
2. **[PROMPT_CONCISO.md](PROMPT_CONCISO.md)** - Versión optimizada para Claude Opus 4.7
3. **[COMO_USAR_PROMPTS.md](COMO_USAR_PROMPTS.md)** - Instrucciones de uso paso a paso

Estos archivos contienen prompts detallados para transformar Orbitra en un producto profesional completo similar a Gather, incluyendo:
- 🎨 Sprites con animaciones profesionales
- 🎤 WebRTC completo (audio/video por proximidad)
- 🗺️ Mapas detallados con tiles
- 🎯 Objetos interactivos (pizarras, pantallas, puertas)
- 💬 UI/UX completa
- 📊 Dashboard y analytics
- Y mucho más...

## 🏗️ Arquitectura

- **Frontend**: React + TypeScript + Phaser.js
- **Backend**: Node.js (ESM) + Express + Socket.io
- **WebRTC**: Simple-peer para comunicaciones P2P
- **Base de datos**: MongoDB (opcional para persistencia)

## 📦 Estructura del Proyecto

```
orbitra/
├── client/          # Frontend React + Phaser
│   └── src/
│       └── types.ts # Tipos TypeScript compartidos
├── server/          # Backend Node.js (ESM)
│   └── src/
│       └── types.ts # Tipos TypeScript compartidos
└── shared/          # [Deprecado] Ahora copiado en cada proyecto
```

## 🛠️ Instalación

### Prerrequisitos
- Node.js 18+
- npm o yarn

### Backend
```bash
cd server
npm install
npm run dev
```

### Frontend
```bash
cd client
npm install
npm start
```

## 🎮 Uso

1. Inicia el servidor backend (puerto 3001)
2. Inicia el cliente frontend (puerto 3000)
3. Abre http://localhost:3000 en tu navegador
4. Ingresa tu nombre y únete a un espacio

## 🗺️ Roadmap

### v0.1 - MVP (Actual) ✅
- [x] Estructura base del proyecto
- [x] Renderizado de mapa básico
- [x] Movimiento de avatar con WASD
- [x] Sincronización multijugador en tiempo real
- [x] Chat de texto funcional
- [x] Sistema de salas múltiples

### v0.2 - Profesionalización 🚧
**Para implementar estas mejoras, usa los prompts detallados:**
- 📄 [PROMPT_OPUS_4.7.md](PROMPT_OPUS_4.7.md) - Especificación completa (14 secciones)
- 📄 [PROMPT_CONCISO.md](PROMPT_CONCISO.md) - Versión resumida para IA

**Incluye:**
- [ ] Sprites de avatares con animaciones profesionales
- [ ] Audio/Video por proximidad (WebRTC completo)
- [ ] Mapas detallados (Oficina, Coworking, Auditorio)
- [ ] Objetos interactivos (pizarra, pantalla, puertas)
- [ ] UI/UX completa (sidebar, minimap, emotes)
- [ ] Sistema de customización de avatares

### v0.3 - Avanzado
- [ ] Editor de mapas visual
- [ ] Sistema de roles y permisos
- [ ] Dashboard de analíticas
- [ ] Integraciones (Slack, Calendar)
- [ ] Grabación de sesiones
- [ ] Mobile responsive

## � Seguridad

- **Backend:** ✅ 0 vulnerabilidades
- **Frontend:** ⚠️ 28 vulnerabilidades en dev dependencies (no afectan producción)

Ver [SEGURIDAD.md](SEGURIDAD.md) para análisis completo y recomendaciones.

## �📝 Licencia

MIT
