# 🤖 Cómo Usar los Prompts con Claude Opus 4.7

## Archivos Disponibles

1. **[PROMPT_OPUS_4.7.md](PROMPT_OPUS_4.7.md)** - Especificación exhaustiva
   - 14 secciones detalladas
   - +200 requerimientos específicos
   - Arquitectura completa
   - Prioridades de implementación
   - ~6000 palabras

2. **[PROMPT_CONCISO.md](PROMPT_CONCISO.md)** - Versión optimizada
   - Todos los requerimientos esenciales
   - Más directo y accionable
   - Mejor para límites de contexto
   - ~2000 palabras

## 📋 Pasos para Usar

### Opción A: Implementación Completa (Recomendada)

1. **Abrir conversación nueva** con Claude Opus 4.7
2. **Copiar todo el contenido** de [PROMPT_CONCISO.md](PROMPT_CONCISO.md)
3. **Pegar en el chat** como un solo mensaje
4. **Agregar contexto adicional** si es necesario:
   ```
   El proyecto actual está en: D:\odoo-projects\remote-desktop\seni_gather
   
   Estructura actual:
   - Backend funcional con Socket.io
   - Frontend con React + Phaser básico
   - Movimiento y chat ya funcionan
   
   Archivos principales a modificar:
   - client/src/game/GameScene.ts
   - client/src/services/SocketManager.ts
   - server/src/gameServer.ts
   ```

5. **Pedir implementación por fases:**
   ```
   Por favor, implementa FASE 1: WebRTC + Sprites + Mapa Detallado.
   
   Proporciona el código completo de todos los archivos a crear/modificar.
   ```

### Opción B: Por Secciones

Si prefieres implementar en partes:

1. **WebRTC Primero** (más crítico):
   ```
   Del PROMPT_CONCISO.md, implementa solo la sección 2: WebRTC COMPLETO.
   
   Necesito:
   - services/WebRTCManager.ts completo
   - services/AudioManager.ts completo
   - services/ProximityManager.ts completo
   - UI de controles (components/Video/)
   - Actualización de GameScene para integrar proximidad
   ```

2. **Luego Gráficos:**
   ```
   Ahora implementa la sección 1: GRÁFICOS PROFESIONALES.
   
   Incluyendo:
   - Sistema de sprites para avatares
   - Animaciones en 4 direcciones
   - Mapa "Oficina Corporativa" completo con tiles
   - Efectos visuales (hablando, spawn, highlight)
   ```

3. **Y así sucesivamente...**

### Opción C: Feature Específica

Si solo necesitas algo específico:

```
Del PROMPT_CONCISO.md, implementa solo:

- Pizarra colaborativa funcional
- Sistema de emotes con menú radial
- Minimap en esquina superior derecha

Proporciona código completo y archivos de configuración necesarios.
```

## 🎯 Consejos para Mejores Resultados

### 1. Sé Específico con lo que Necesitas
```
✅ BUENO:
"Implementa WebRTCManager.ts completo con audio por proximidad.
Debe usar simple-peer, manejar hasta 8 conexiones simultáneas,
y hacer fade in/out del volumen según distancia."

❌ MALO:
"Haz el WebRTC"
```

### 2. Pide Código Completo, No Ejemplos
```
✅ BUENO:
"Proporciona el código COMPLETO de WebRTCManager.ts,
incluyendo todas las importaciones, tipos, y métodos.
Debe ser copy-paste ready."

❌ MALO:
"Dame un ejemplo de WebRTC"
```

### 3. Menciona el Contexto Actual
```
✅ BUENO:
"El proyecto ya tiene SocketManager.ts funcionando.
WebRTCManager debe integrarse con él para recibir
eventos de movimiento de jugadores."

❌ MALO:
[Sin mencionar lo que ya existe]
```

### 4. Pide Assets o Guías
```
✅ BUENO:
"Además del código, proporciona:
- Dimensiones exactas de los sprites (32x48px)
- Estructura del spritesheet para animaciones
- Lista de tiles necesarios para el mapa
- O genera sprites básicos con código Canvas"

❌ MALO:
[Solo pedir código sin mencionar assets]
```

### 5. Solicita Tests y Documentación
```
✅ BUENO:
"Incluye también:
- Tests unitarios para la lógica de proximidad
- Comentarios JSDoc en funciones complejas
- README actualizado con nuevas features"

❌ MALO:
[Solo código sin documentación]
```

## 🔄 Flujo de Trabajo Recomendado

### Fase 1: Core Features (Semana 1-2)
```
Prompt:
"Del PROMPT_CONCISO.md, implementa las secciones 2, 3, y 4:
- WebRTC completo con audio/video por proximidad
- Sprites de avatares con animaciones
- Mapa detallado 'Oficina Corporativa'

Proporciona código completo, configuraciones de Phaser,
y guías para crear/obtener los assets necesarios."
```

### Fase 2: Objetos e Interacción (Semana 3)
```
Prompt:
"Ahora implementa objetos interactivos:
- Pizarra colaborativa con canvas compartido
- Objeto TV para compartir pantalla
- Puertas funcionales con teletransporte
- Sillas donde sentarse

Integra con el sistema WebRTC existente para que
la pizarra se vea en tiempo real para jugadores cercanos."
```

### Fase 3: UI/UX (Semana 4)
```
Prompt:
"Implementa la UI completa:
- Sidebar con lista de jugadores y estados
- Minimap funcional
- Sistema de emotes con menú radial
- Panel de configuración con tabs

Mantén el diseño moderno y responsive."
```

### Fase 4: Features Avanzadas (Semana 5+)
```
Prompt:
"Implementa features avanzadas:
- Editor de mapas visual
- Sistema de roles (Guest, Member, Admin)
- Dashboard de analytics
- Modo presentación

Incluye permisos y validaciones."
```

## 🐛 Resolución de Problemas

### Si el código no compila:
```
Prompt:
"El código de WebRTCManager.ts tiene errores:
[pega el error aquí]

Corrige el código asegurándote de:
1. Todas las importaciones estén correctas
2. Los tipos sean compatibles con TypeScript 5.1
3. Sea compatible con las versiones de las librerías en package.json"
```

### Si falta integración:
```
Prompt:
"WebRTCManager está implementado pero no se integra con GameScene.
¿Cómo debe GameScene usar WebRTCManager para activar audio
cuando dos jugadores están cerca?"
```

### Si necesitas optimización:
```
Prompt:
"El sistema actual tiene lag con 20+ jugadores.
Optimiza:
- Throttling de updates
- Object pooling
- Culling de objetos fuera de cámara
- Reducción de draw calls

Proporciona código optimizado."
```

## 📚 Recursos Adicionales

Después de implementar, consulta:
- [MEJORAS.md](MEJORAS.md) - Lista completa de mejoras posibles
- [SEGURIDAD.md](SEGURIDAD.md) - Consideraciones de seguridad
- [CONTRIBUTING.md](CONTRIBUTING.md) - Guías de contribución
- [INSTALACION.md](INSTALACION.md) - Instrucciones de instalación

## ✅ Checklist de Validación

Después de cada implementación, verifica:

- [ ] El código compila sin errores TypeScript
- [ ] No hay warnings en consola del navegador
- [ ] El servidor inicia correctamente
- [ ] La funcionalidad funciona según especificado
- [ ] Mantiene 60 FPS con múltiples jugadores
- [ ] Los assets se cargan correctamente
- [ ] La integración con código existente es limpia
- [ ] Hay comentarios en partes complejas
- [ ] El README está actualizado

## 💡 Tips Finales

1. **Implementa incrementalmente**: No intentes todo a la vez
2. **Prueba cada feature**: Antes de pasar a la siguiente
3. **Haz commits frecuentes**: Para poder revertir si algo falla
4. **Documenta cambios**: Actualiza README y comentarios
5. **Optimiza después**: Primero que funcione, luego optimiza
6. **Pide aclaraciones**: Si algo no está claro en el prompt

---

**¿Listo para empezar?** Copia [PROMPT_CONCISO.md](PROMPT_CONCISO.md) y pégalo en una nueva conversación con Claude Opus 4.7. ¡Buena suerte! 🚀
