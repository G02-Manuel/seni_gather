# 🎯 Guía de Instalación - Orbitra

## Prerrequisitos

Asegúrate de tener instalado:
- **Node.js** 18+ ([Descargar aquí](https://nodejs.org/))
- **npm** (viene con Node.js)
- **Git** ([Descargar aquí](https://git-scm.com/))

## 🚀 Instalación Rápida

### 1. Clonar el repositorio
```bash
git clone https://github.com/TU_USUARIO/seni_gather.git
cd seni_gather
```

### 2. Instalar dependencias
```bash
# Desde la raíz del proyecto
npm install

# Instalar dependencias de servidor
cd server
npm install

# Instalar dependencias de cliente
cd ../client
npm install
```

### 3. Configurar variables de entorno

**En el servidor:**
```bash
cd server
cp .env.example .env
```

Edita el archivo `.env` si necesitas cambiar configuraciones (por defecto funciona en localhost).

### 4. Iniciar el proyecto

**Opción A: Iniciar todo junto (Recomendado)**
```bash
# Desde la raíz del proyecto
npm run dev
```

Esto iniciará simultáneamente:
- ✅ Backend en `http://localhost:3001`
- ✅ Frontend en `http://localhost:3000`

**Opción B: Iniciar por separado**

Terminal 1 - Backend:
```bash
cd server
npm run dev
```

Terminal 2 - Frontend:
```bash
cd client
npm start
```

## 🎮 Probar Orbitra

1. Abre tu navegador en `http://localhost:3000`
2. Ingresa tu nombre
3. Selecciona una sala
4. ¡Empieza a explorar!

**Para probar multijugador:**
- Abre varias pestañas o ventanas del navegador
- Ingresa con diferentes nombres
- Verás los avatares de otros jugadores moviéndose en tiempo real

## 🛠️ Scripts Disponibles

### Raíz del proyecto
- `npm run dev` - Inicia cliente y servidor simultáneamente
- `npm run dev:server` - Solo servidor (requiere tsx)
- `npm run dev:client` - Solo cliente
- `npm run build` - Construye para producción
- `npm install-all` - Instala todas las dependencias

### Servidor (`/server`)
- `npm run dev` - Modo desarrollo con hot-reload (usa tsx + nodemon)
- `npm run build` - Compila TypeScript
- `npm start` - Inicia servidor en producción

**Nota:** El servidor usa módulos ESM (`"type": "module"`)

### Cliente (`/client`)
- `npm start` - Modo desarrollo
- `npm run build` - Build para producción
- `npm test` - Ejecuta tests

## 🔧 Solución de Problemas

### Error: "Cannot find module"
```bash
# Reinstalar dependencias
rm -rf node_modules
npm install
```

### Puerto 3000 o 3001 ya en uso
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID [PID] /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

### Error de conexión Socket.io
Verifica que:
1. El servidor esté corriendo en puerto 3001
2. No haya firewall bloqueando la conexión
3. La URL del servidor en `client/src/services/SocketManager.ts` sea correcta

## 📦 Estructura del Proyecto

```
orbitra/
├── client/              # Frontend React + Phaser
│   ├── public/          # Assets públicos
│   └── src/
│       ├── components/  # Componentes React
│       ├── game/        # Lógica de Phaser
│       └── services/    # Socket.io, WebRTC
├── server/              # Backend Node.js
│   └── src/
│       ├── index.ts     # Entrada del servidor
│       └── gameServer.ts # Lógica del juego
└── shared/              # Tipos TypeScript compartidos
```

## 🌐 Deploy en Producción

### Backend (Heroku, Railway, etc.)
```bash
cd server
npm run build
# Configurar variables de entorno
# Deploy según plataforma
```

### Frontend (Vercel, Netlify)
```bash
cd client
npm run build
# Deploy la carpeta /build
```

**Importante:** Actualiza la URL del servidor en `SocketManager.ts` a tu dominio de producción.

## 📚 Próximos Pasos

1. Lee [MEJORAS.md](MEJORAS.md) para ver qué features implementar
2. Personaliza los mapas en `client/src/game/GameScene.ts`
3. Añade tus propios sprites y assets
4. Implementa WebRTC para audio/video (ver `MEJORAS.md`)

## 💬 Soporte

¿Problemas? Abre un issue en GitHub o contacta al equipo de desarrollo.

## 📄 Licencia

MIT - Ver [LICENSE](LICENSE) para más detalles.
