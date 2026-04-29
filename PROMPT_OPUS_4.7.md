# 🎯 PROMPT PARA CLAUDE OPUS 4.7 - MEJORAS COMPLETAS ORBITRA

## Contexto del Proyecto
Tengo un clon básico funcional de Gather llamado "Orbitra" construido con:
- **Frontend**: React + TypeScript + Phaser.js
- **Backend**: Node.js (ESM) + Express + Socket.io
- **Estado actual**: Movimiento multijugador funcional con círculos simples como avatares, chat básico

## Objetivo
Necesito que transformes Orbitra de un prototipo básico a una aplicación completa similar a Gather con todas las características profesionales y visuales. El código ya existe en la estructura descrita en el README.md.

---

## 📋 REQUERIMIENTOS COMPLETOS

### 1. 🎨 SISTEMA DE GRÁFICOS Y VISUALES

#### Avatares de Jugadores
- [ ] Crear sprites de avatares pixelart con múltiples opciones:
  - Al menos 8 tipos de personajes diferentes (masculino/femenino/neutral)
  - 6 colores de piel
  - 10 estilos de cabello con diferentes colores
  - 8 tipos de ropa/outfits
  - Accesorios opcionales (gafas, sombreros, etc.)
  
- [ ] **Animaciones de avatares:**
  - Idle (parado mirando frente/espalda/lateral)
  - Walk en 4 direcciones (arriba, abajo, izquierda, derecha)
  - Smooth transitions entre animaciones
  - Frame rate: 8-12 fps para pixel art

- [ ] **Sistema de customización:**
  - Panel UI para seleccionar características del avatar
  - Preview en tiempo real
  - Guardar configuración del avatar en localStorage
  - Sincronizar apariencia con otros jugadores

#### Mapas y Entornos
- [ ] **Crear al menos 3 mapas completos:**
  
  **Mapa 1: Oficina Corporativa**
  - Recepción con escritorio
  - 3-4 salas de reuniones con mesas de conferencia
  - Área de descanso (sofás, coffee station)
  - Cubículos de trabajo individuales
  - Baños
  - Plantas decorativas, cuadros en paredes
  - Iluminación: luces de techo, ventanas con luz exterior
  
  **Mapa 2: Espacio Coworking Casual**
  - Área abierta con mesas compartidas
  - Cabinas telefónicas privadas
  - Lounge con sillones
  - Cocina completamente equipada
  - Terraza/balcón
  - Estilo moderno y colorido
  
  **Mapa 3: Auditorio/Evento**
  - Escenario con atril
  - Filas de asientos
  - Pantalla grande de presentación
  - Lobby de entrada
  - Áreas de networking
  - Stands/booths para exhibidores

- [ ] **Sistema de Tiles y Capas:**
  - Capa de suelo (floor tiles)
  - Capa de objetos base (mesas, sillas)
  - Capa de objetos superiores (techos, decoración alta)
  - Capa de colisiones
  - Capa de interacción (áreas clickeables)
  - Usar Tiled Map Editor format (.json)

- [ ] **Assets visuales del mapa:**
  - Texturas de suelo variadas (madera, alfombra, baldosas, césped)
  - Paredes con diferentes estilos
  - Puertas funcionales (abiertas/cerradas)
  - Ventanas con transparencia
  - Objetos 3D isométricos para profundidad
  - Sombras y luces para ambientación

#### Efectos Visuales
- [ ] Partículas y efectos:
  - Indicador de "hablando" (ondas alrededor del avatar cuando el mic está activo)
  - Efecto de spawn (fade in o partículas al aparecer)
  - Trail sutil al moverse rápido
  - Highlight al pasar sobre objetos interactivos
  - Emojis flotantes sobre la cabeza (reacciones rápidas)

- [ ] Iluminación y ambiente:
  - Sistema de lighting dinámico con Phaser
  - Áreas más oscuras/más claras
  - Luz que sigue al jugador local (spotlight opcional)
  - Día/noche toggle con cambios de iluminación

### 2. 🎤 SISTEMA WebRTC COMPLETO

#### Funcionalidad Core
- [ ] **Implementar WebRTCManager completo:**
  ```typescript
  class WebRTCManager {
    // Gestionar conexiones peer-to-peer
    // Activar/desactivar audio y video por proximidad
    // Manejo de múltiples conexiones simultáneas
    // Calidad adaptativa según ancho de banda
  }
  ```

- [ ] **Sistema de Proximidad:**
  - Radio de 150 píxeles (configurable)
  - Activación gradual de volumen (fade in/out según distancia)
  - Máximo 8 conexiones simultáneas por performance
  - Indicador visual del rango de audio (círculo alrededor del jugador)
  - Priorizar conexiones más cercanas si hay más de 8 personas cerca

#### UI de Audio/Video
- [ ] **Controles en pantalla:**
  - Botón toggle micrófono (mute/unmute)
  - Botón toggle cámara (on/off)
  - Botón toggle parlantes/auriculares
  - Indicador de nivel de audio (VU meter)
  - Selección de dispositivos (mic/cámara/speakers)
  - Estado visible: "Mic ON 🎤" / "Mic OFF 🔇"

- [ ] **Videos de otros jugadores:**
  - Miniaturas de video flotantes cerca de cada avatar
  - Tamaño: 120x90px por defecto
  - Click para expandir a 320x240px
  - Seguir al avatar al moverse
  - Frame redondeado con borde de color del jugador
  - Nombre del jugador debajo del video

- [ ] **Configuración avanzada:**
  - Test de micrófono antes de entrar
  - Supresión de ruido (noise cancellation)
  - Supresión de eco
  - Auto-ajuste de volumen
  - Modo "push to talk" opcional

#### Optimización y Calidad
- [ ] Usar simple-peer o mediasoup
- [ ] ICE servers configurados (STUN/TURN)
- [ ] Fallback a audio-only si video tiene problemas
- [ ] Monitoreo de latencia y calidad de conexión
- [ ] Reconexión automática si se cae la conexión

### 3. 🎯 OBJETOS INTERACTIVOS

#### Tipos de Objetos
- [ ] **Pizarras Colaborativas:**
  - Canvas compartido en tiempo real
  - Herramientas: lápiz, marcador, borrador, formas
  - Colores múltiples
  - Guardar y cargar dibujos
  - Exportar como imagen

- [ ] **Compartir Pantalla / Presentaciones:**
  - Objeto "TV/Pantalla" en el mapa
  - Click para compartir tu pantalla
  - Todos los jugadores cercanos ven la misma pantalla
  - Controles: play/pause si es video
  - Soportar URLs de YouTube, Vimeo, imágenes, PDFs

- [ ] **Puertas y Teletransporte:**
  - Puertas que llevan a otras salas/mapas
  - Efecto de transición (fade out/in)
  - Confirmación antes de teletransportar
  - Spawn point definido en el destino

- [ ] **Sillas y Zonas Sentables:**
  - Click en silla para sentarse
  - Avatar cambia a sprite sentado
  - No puede moverse mientras está sentado
  - Click de nuevo para levantarse

- [ ] **Notas Adhesivas (Sticky Notes):**
  - Placeable en el mapa por los usuarios
  - Color personalizable
  - Texto editable
  - Visibles para todos
  - Delete por el creador o admins

- [ ] **Private Rooms / Burbujas:**
  - Áreas delimitadas visualmente
  - Solo quienes entren pueden verse/oírse entre sí
  - Perfecto para reuniones privadas
  - Indicador de "ocupado" si hay gente dentro

### 4. 🎮 MEJORAS DE GAMEPLAY

#### Sistema de Movimiento
- [ ] Pathfinding inteligente (A* algorithm)
- [ ] Click-to-move además de WASD
- [ ] Evitar colisiones suaves (no quedarse pegado)
- [ ] Animación de caminar más fluida
- [ ] Speed boost temporal (correr con Shift)
- [ ] Follow player (seguir a otro jugador automáticamente)

#### Minimap
- [ ] Minimap en esquina superior derecha
- [ ] Mostrar posición de todos los jugadores
- [ ] Click en minimap para ver esa zona
- [ ] Indicar objetos interactivos importantes
- [ ] Toggle show/hide con tecla M

#### Sistema de Emotes
- [ ] Menú radial de emojis/emotes
- [ ] Atajos de teclado (1-9 para emotes frecuentes)
- [ ] Emote aparece sobre la cabeza por 2-3 segundos
- [ ] Al menos 20 emojis diferentes
- [ ] Animaciones especiales (bailar, saludar, aplaudir)

### 5. 💬 SISTEMA DE CHAT MEJORADO

- [ ] **Chat de texto enriquecido:**
  - Markdown básico (bold, italic, links)
  - Emojis inline
  - Mentions (@usuario)
  - Timestamps
  - Diferentes canales (#general, #random, etc.)

- [ ] **Features adicionales:**
  - Historial scrollable (últimos 100 mensajes)
  - Notificaciones de nuevos mensajes
  - Typing indicator ("Juan está escribiendo...")
  - Chat privado (DM) entre usuarios
  - Comandos slash (/help, /clear, /away)

### 6. 🎛️ UI/UX PROFESIONAL

#### HUD (Heads-Up Display)
- [ ] **Barra superior:**
  - Logo de Orbitra
  - Nombre de la sala actual
  - Contador de jugadores online
  - Ping/latencia
  - Botón de configuración

- [ ] **Barra lateral derecha:**
  - Lista de jugadores en la sala
    - Avatar pequeño
    - Nombre
    - Estado (activo, ausente, ocupado)
    - Indicador si está hablando
  - Botones de acción por jugador:
    - Enviar DM
    - Silenciar
    - Seguir en el mapa

- [ ] **Barra inferior:**
  - Controles de audio/video
  - Botón de emotes
  - Botón de ajustes rápidos
  - Indicador de FPS

#### Menú de Configuración
- [ ] **Pestaña Audio/Video:**
  - Selección de dispositivos
  - Control de volumen maestro
  - Toggle efectos de sonido
  - Test de micrófono con gráfico de onda

- [ ] **Pestaña Apariencia:**
  - Customización de avatar
  - Theme (claro/oscuro)
  - Tamaño de UI (100%, 125%, 150%)
  - Mostrar/ocultar elementos del HUD

- [ ] **Pestaña Controles:**
  - Key bindings customizables
  - Sensibilidad del mouse
  - Invertir ejes
  - Habilitar click-to-move

- [ ] **Pestaña Avanzado:**
  - Calidad de gráficos (low/medium/high)
  - Límite de FPS
  - Habilitar/deshabilitar partículas
  - Debug mode

#### Pantalla de Bienvenida
- [ ] Splash screen con logo animado
- [ ] Tutorial interactivo para nuevos usuarios
- [ ] Tooltips contextuales la primera vez
- [ ] "¿Primera vez? Haz el tour" button

### 7. 🏗️ EDITOR DE MAPAS

#### Funcionalidad Básica
- [ ] Modo editor activable por admins
- [ ] Grid visible para colocación precisa
- [ ] Biblioteca de objetos draggable:
  - Furniture (mesas, sillas, sofás)
  - Decoración (plantas, cuadros, lámparas)
  - Tecnología (TVs, computadoras, proyectores)
  - Arquitectura (paredes, puertas, ventanas)

- [ ] Herramientas:
  - Colocar objeto
  - Mover objeto
  - Rotar objeto (90° increments)
  - Eliminar objeto
  - Copiar/pegar
  - Undo/redo (últimas 20 acciones)

#### Features Avanzadas
- [ ] Capas separadas (floor, objects, ceiling)
- [ ] Definir áreas de colisión customizadas
- [ ] Colocar spawn points
- [ ] Crear zonas privadas
- [ ] Exportar/importar mapas (JSON format)
- [ ] Preview antes de publicar cambios

### 8. 🔐 SISTEMA DE ROLES Y PERMISOS

- [ ] **Roles:**
  - Guest (solo ver)
  - Member (participar)
  - Moderator (kick, mute, gestionar objetos)
  - Admin (editar mapa, gestionar roles)
  - Owner (control total)

- [ ] **Acciones por rol:**
  - Crear objetos interactivos
  - Modificar mapa
  - Kickear usuarios
  - Mutar usuarios
  - Cambiar configuración de sala

### 9. 📊 DASHBOARD Y ANALÍTICAS

- [ ] Panel web separado para administradores
- [ ] Estadísticas en tiempo real:
  - Usuarios activos ahora
  - Picos de actividad (gráfico)
  - Tiempo promedio de sesión
  - Salas más populares
  - Heatmap de zonas más visitadas del mapa

- [ ] Gestión:
  - Lista de todos los usuarios
  - Historial de sesiones
  - Logs de eventos importantes
  - Exportar datos

### 10. ⚡ OPTIMIZACIÓN Y PERFORMANCE

- [ ] **Optimizaciones de Red:**
  - Interpolación de movimiento para compensar lag
  - Predicción del lado del cliente
  - Throttling de updates (enviar posición cada 50ms, no cada frame)
  - Compresión de mensajes Socket.io

- [ ] **Optimizaciones Gráficas:**
  - Culling de objetos fuera de cámara
  - LOD (Level of Detail) para objetos lejanos
  - Sprite atlases para reducir draw calls
  - Object pooling para jugadores remotos
  - Lazy loading de assets pesados

- [ ] **Optimizaciones WebRTC:**
  - Limitar conexiones simultáneas
  - Reducir bitrate si hay lag
  - Desactivar video si no está en pantalla
  - Priorizar audio sobre video

### 11. 🎵 AUDIO Y SONIDO

- [ ] **Sound Effects:**
  - Pasos al caminar (diferentes según superficie)
  - Notificación al recibir mensaje
  - Sonido al entrar/salir jugadores
  - Click al interactuar con objetos
  - Sonido ambiente de oficina (opcional, bajo volumen)

- [ ] **Música de Fondo:**
  - Playlist customizable
  - Control de volumen separado
  - Solo para el usuario, no sincronizado

### 12. 📱 RESPONSIVE Y MOBILE

- [ ] **Adaptación Mobile:**
  - Controles táctiles:
    - Joystick virtual para movimiento
    - Botones táctiles para emotes/chat
  - UI redimensionada para pantallas pequeñas
  - Optimización de performance para móviles
  - PWA (Progressive Web App) installable

### 13. 🔗 INTEGRACIONES

- [ ] **Slack Integration:**
  - Notificar en Slack cuando alguien entra a la oficina
  - Sincronizar estado de Slack con estado en Orbitra
  - Invitar desde Slack con link directo

- [ ] **Calendar Integration:**
  - Integrar con Google Calendar o Outlook
  - Crear reuniones programadas
  - Notificar 5 minutos antes
  - Teletransportar automáticamente a sala de reunión

- [ ] **Webhooks:**
  - Enviar eventos a URLs externas
  - Eventos: user_joined, user_left, room_created, etc.

### 14. 🐛 EXTRAS IMPORTANTES

- [ ] **Sistema de Notificaciones:**
  - Browser notifications cuando alguien te menciona
  - Badge count de mensajes no leídos
  - Sonido personalizable

- [ ] **Modo Presentación:**
  - Spotlight mode: todos ven la cámara del presentador en grande
  - Atención forzada: todos miran al presentador
  - Bloquear chat durante presentación (opcional)

- [ ] **Grabación de Sesiones:**
  - Grabar audio/video de reuniones
  - Consentimiento obligatorio de todos los participantes
  - Exportar a MP4

- [ ] **Accesibilidad:**
  - Subtítulos en tiempo real (Speech-to-Text)
  - Narrator mode para lectores de pantalla
  - High contrast mode
  - Keyboard navigation completo

---

## 🎨 ASSETS Y RECURSOS NECESARIOS

### Sprites y Gráficos
- Avatares: 32x32px o 48x48px pixel art
- Tiles del mapa: 32x32px
- Objetos: tamaños variados pero múltiplos de 32
- UI elements: vectores o PNG en alta resolución

### Fuentes
- Font para UI: Inter, Roboto, o similar (moderna y legible)
- Font para chat: monospace opcional para código

### Librerías Adicionales Recomendadas
```json
{
  "simple-peer": "^9.11.1",  // WebRTC
  "mediasoup-client": "^3.6.0",  // Alternative for WebRTC
  "fabric": "^5.3.0",  // Canvas para pizarras
  "emoji-mart": "^5.5.0",  // Picker de emojis
  "react-beautiful-dnd": "^13.1.1",  // Drag and drop UI
  "framer-motion": "^10.16.0",  // Animaciones UI
  "zustand": "^4.4.0",  // State management
  "howler": "^2.2.3",  // Audio library
  "@tensorflow/tfjs": "^4.11.0"  // Para noise cancellation
}
```

---

## 📐 ARQUITECTURA SUGERIDA

### Frontend
```
client/src/
├── components/
│   ├── Game/
│   │   ├── GameScene.ts (actual)
│   │   ├── LoadingScene.ts (nuevo)
│   │   ├── MenuScene.ts (nuevo)
│   │   └── UIOverlay.tsx (nuevo)
│   ├── Avatar/
│   │   ├── AvatarCustomizer.tsx
│   │   └── AvatarPreview.tsx
│   ├── Chat/
│   │   ├── ChatWindow.tsx
│   │   ├── ChatMessage.tsx
│   │   └── EmojiPicker.tsx
│   ├── Video/
│   │   ├── VideoGrid.tsx
│   │   ├── VideoTile.tsx
│   │   └── Controls.tsx
│   └── UI/
│       ├── Sidebar.tsx
│       ├── TopBar.tsx
│       ├── Settings.tsx
│       └── Minimap.tsx
├── services/
│   ├── WebRTCManager.ts (nuevo)
│   ├── AudioManager.ts (nuevo)
│   └── SocketManager.ts (mejorar)
├── game/
│   ├── entities/
│   │   ├── Player.ts
│   │   └── InteractiveObject.ts
│   ├── managers/
│   │   ├── MapManager.ts
│   │   ├── PlayerManager.ts
│   │   └── ProximityManager.ts
│   └── utils/
│       ├── AssetLoader.ts
│       └── Pathfinding.ts
└── assets/
    ├── sprites/
    ├── maps/
    ├── audio/
    └── ui/
```

### Backend
```
server/src/
├── managers/
│   ├── RoomManager.ts
│   ├── WebRTCSignaling.ts
│   └── PermissionManager.ts
├── models/
│   ├── User.ts
│   ├── Room.ts
│   └── Message.ts
├── routes/
│   ├── api.ts
│   └── admin.ts
└── utils/
    ├── validators.ts
    └── logger.ts
```

---

## 🎯 PRIORIDAD DE IMPLEMENTACIÓN

### Sprint 1 (Semana 1-2): Core Visual
1. Sistema de sprites para avatares
2. Animaciones de caminar en 4 direcciones
3. Mapa "Oficina Corporativa" completo
4. Assets visuales mejorados

### Sprint 2 (Semana 3-4): WebRTC
1. WebRTCManager completo
2. Audio por proximidad
3. UI de controles de audio/video
4. Video tiles flotantes

### Sprint 3 (Semana 5-6): Objetos Interactivos
1. Pizarra colaborativa
2. Compartir pantalla
3. Puertas y teletransporte
4. Private rooms

### Sprint 4 (Semana 7-8): UI/UX
1. Sidebar con lista de jugadores
2. Chat mejorado con canales
3. Sistema de emotes
4. Minimap

### Sprint 5 (Semana 9-10): Features Avanzadas
1. Editor de mapas
2. Sistema de roles
3. Customización de avatares
4. Dashboard de analytics

---

## 📝 NOTAS FINALES

- **Mantener** la arquitectura actual (React + Phaser + Socket.io)
- **Código limpio:** TypeScript estricto, comentarios en español o inglés
- **Tests:** Al menos tests unitarios para lógica crítica (WebRTC, proximidad)
- **Documentación:** Actualizar README con cada nueva feature
- **Performance first:** No sacrificar FPS por efectos visuales
- **Mobile-friendly:** Pensar en responsive desde el inicio
- **Accesibilidad:** WCAG 2.1 AA mínimo

---

## ✅ ENTREGABLES ESPERADOS

Por favor, implementa TODOS estos requerimientos de forma incremental, priorizando:
1. Funcionalidad sobre estética (pero ambas son importantes)
2. Performance y optimización
3. Código mantenible y escalable
4. Experiencia de usuario fluida

Genera TODO el código necesario, incluyendo:
- Componentes React nuevos
- Clases TypeScript para managers
- Configuraciones de Phaser
- Assets de ejemplo o guías para crearlos
- Archivos de configuración necesarios
- Scripts de utilidad

**IMPORTANTE:** No des solo ejemplos o snippets. Necesito implementaciones completas y funcionales que pueda integrar directamente en el proyecto actual.
