# PROMPT CONCISO PARA CLAUDE OPUS 4.7

Tengo un clon funcional básico de Gather llamado "Orbitra" (React + Phaser + Socket.io + Node.js). Actualmente tiene movimiento multijugador con círculos simples como avatares y chat básico.

## 🎯 TRANSFORMAR A PRODUCTO PROFESIONAL COMPLETO

Necesito que implementes TODAS estas características para que se parezca a Gather:

### 1. GRÁFICOS PROFESIONALES
- **Avatares**: Sprites pixelart 32x48px con animaciones de caminar en 4 direcciones (idle, walk up/down/left/right)
- **Customización**: Sistema de cambio de color de piel, cabello, ropa (al menos 50 combinaciones)
- **Mapas completos**: 3 mapas detallados (Oficina, Coworking, Auditorio) con tiles de 32x32px, capas de suelo/objetos/decoración
- **Efectos visuales**: Indicador de "hablando" (ondas), partículas al spawn, highlight en objetos interactivos
- **Iluminación**: Sistema de lighting con áreas claras/oscuras

### 2. WebRTC COMPLETO (PRIORIDAD MÁXIMA)
```typescript
// Implementar WebRTCManager.ts desde cero
class WebRTCManager {
  // Audio/video por proximidad (150px radius)
  // Fade in/out de volumen según distancia
  // Máximo 8 conexiones simultáneas
  // Calidad adaptativa
}
```
- **UI Controles**: Botones mute/unmute mic, on/off cámara, selección de dispositivos
- **Video tiles**: Miniaturas 120x90px flotantes cerca de cada avatar
- **Configuración**: Test de mic, noise cancellation, push-to-talk mode

### 3. OBJETOS INTERACTIVOS
- **Pizarra colaborativa**: Canvas compartido con herramientas de dibujo
- **Compartir pantalla**: Objeto TV donde se proyecta tu pantalla o YouTube
- **Puertas**: Teletransporte entre salas con efecto de transición
- **Sillas**: Click para sentarse, avatar cambia a sprite sentado
- **Sticky notes**: Notas placables en el mapa visibles para todos
- **Private rooms**: Áreas delimitadas donde solo los que entran se ven/oyen

### 4. UI/UX PROFESIONAL
- **HUD completo**:
  - Top bar: logo, nombre sala, contador jugadores
  - Sidebar derecha: lista jugadores con avatars, estados, indicador hablando
  - Bottom bar: controles audio/video, emotes, settings
- **Minimap**: Esquina superior derecha con posiciones de todos
- **Chat mejorado**: Markdown, emojis, mentions, timestamps, canales
- **Sistema emotes**: Menú radial con 20+ emojis, atajos teclado
- **Configuración**: Panel con tabs (Audio/Video, Apariencia, Controles, Avanzado)

### 5. GAMEPLAY MEJORADO
- **Movimiento**: Click-to-move + WASD, pathfinding A*, animaciones fluidas
- **Proximidad visual**: Círculo que muestra el rango de audio alrededor del jugador
- **Colisiones**: Sistema robusto con objetos del mapa
- **Estados**: Online, Away, Busy, Do Not Disturb

### 6. EDITOR DE MAPAS
- Modo editor activable por admins
- Biblioteca de objetos draggable (muebles, decoración, tech)
- Herramientas: colocar, mover, rotar, eliminar, undo/redo
- Definir spawn points, zonas privadas, áreas de colisión
- Exportar/importar mapas JSON

### 7. AUDIO Y SONIDO
- SFX: pasos al caminar, notificaciones, interacciones
- Música de fondo opcional con control de volumen
- Spatial audio (más fuerte si estás más cerca)

### 8. OPTIMIZACIONES
- Interpolación de movimiento para compensar lag
- Culling de objetos fuera de cámara
- Sprite atlases para reducir draw calls
- Object pooling
- Throttling de updates (50ms)

### 9. EXTRAS IMPORTANTES
- Sistema de roles (Guest, Member, Moderator, Admin)
- Dashboard web con analytics
- Notificaciones browser
- Modo presentación (spotlight)
- Grabación de sesiones
- Integraciones (Slack, Calendar)

---

## 📦 ASSETS NECESARIOS

Genera o proporciona guías para crear:
- **Sprites de avatares**: 8 tipos x 6 colores piel x 10 cabellos x 8 outfits
- **Animaciones**: Spritesheets con frames de walk/idle en 4 direcciones
- **Tiles de mapa**: Suelo, paredes, puertas, ventanas, muebles
- **Objetos**: Mesas, sillas, sofás, plantas, cuadros, TVs, computadoras
- **UI elements**: Botones, iconos, fondos

---

## 🏗️ ARQUITECTURA NUEVA

Mantén la estructura actual pero agrega:

```
client/src/
├── components/
│   ├── Avatar/ (AvatarCustomizer, AvatarPreview)
│   ├── Chat/ (ChatWindow, EmojiPicker)
│   ├── Video/ (VideoGrid, VideoTile, Controls)
│   └── UI/ (Sidebar, TopBar, Settings, Minimap)
├── services/
│   ├── WebRTCManager.ts ⭐ NUEVO
│   ├── AudioManager.ts ⭐ NUEVO
│   └── ProximityManager.ts ⭐ NUEVO
├── game/
│   ├── entities/ (Player, InteractiveObject)
│   ├── managers/ (MapManager, PlayerManager)
│   └── utils/ (AssetLoader, Pathfinding)
└── assets/ (sprites, maps, audio, ui)

server/src/
├── managers/
│   ├── WebRTCSignaling.ts ⭐ NUEVO
│   └── PermissionManager.ts ⭐ NUEVO
└── routes/ (admin.ts para dashboard)
```

---

## ✅ ENTREGABLES

Implementa TODO esto proporcionando:
1. **Código completo** de todos los archivos nuevos y modificados
2. **Assets de ejemplo** o generadores de sprites básicos
3. **Configuraciones** de Phaser actualizadas (scenes, loaders)
4. **Librerías adicionales** necesarias (simple-peer, fabric, etc.)
5. **Documentación** actualizada paso a paso

**Prioridad de implementación:**
1. ⭐ WebRTC completo (audio/video por proximidad) - CRÍTICO
2. 🎨 Sprites y animaciones de avatares
3. 🗺️ Mapa detallado con tiles profesionales
4. 🎯 Objetos interactivos (pizarra, pantalla, puertas)
5. 💬 UI/UX completa (sidebar, minimap, chat mejorado)
6. 🎮 Editor de mapas
7. 📊 Dashboard y analytics

---

## 🚀 RESULTADO ESPERADO

Al finalizar, Orbitra debe:
- ✅ Verse profesional como Gather
- ✅ Tener audio/video funcional por proximidad
- ✅ Permitir reuniones naturales como en persona
- ✅ Ser customizable y escalable
- ✅ Mantener 60 FPS con 50+ jugadores
- ✅ Funcionar en Chrome, Firefox, Safari
- ✅ Ser responsive (desktop prioritario, mobile básico)

**IMPORTANTE**: No des solo ejemplos. Necesito implementaciones COMPLETAS y FUNCIONALES que pueda copiar directamente al proyecto.

Empieza con WebRTC + sprites animados + mapa detallado, y luego continúa con el resto.
