# 🎨 Guía de Contribución - Orbitra

## 🤝 Cómo Contribuir

¡Gracias por tu interés en contribuir a Orbitra! Este proyecto es open source y todas las contribuciones son bienvenidas.

## 📋 Tipos de Contribuciones

- 🐛 **Bug fixes**: Corregir errores
- ✨ **Features**: Nuevas funcionalidades
- 📝 **Documentación**: Mejorar docs
- 🎨 **Assets**: Sprites, sonidos, mapas
- ⚡ **Performance**: Optimizaciones
- 🧪 **Tests**: Añadir cobertura

## 🚀 Proceso de Contribución

### 1. Fork y Clone
```bash
# Fork el repositorio en GitHub
# Luego clona tu fork
git clone https://github.com/TU_USUARIO/seni_gather.git
cd seni_gather
```

### 2. Crear una rama
```bash
git checkout -b feature/nombre-descriptivo
# o
git checkout -b fix/descripcion-del-bug
```

### 3. Hacer cambios
- Escribe código limpio y comentado
- Sigue las convenciones del proyecto
- Añade tests si es posible

### 4. Commit
```bash
git add .
git commit -m "feat: descripción clara del cambio"
```

**Convención de commits:**
- `feat:` Nueva funcionalidad
- `fix:` Corrección de bug
- `docs:` Cambios en documentación
- `style:` Formato de código
- `refactor:` Refactorización
- `test:` Añadir tests
- `chore:` Mantenimiento

### 5. Push y Pull Request
```bash
git push origin feature/nombre-descriptivo
```

Luego crea un Pull Request en GitHub con:
- Descripción clara del cambio
- Screenshots si aplica
- Referencias a issues relacionados

## 🎯 Áreas que Necesitan Ayuda

### Prioridad Alta
- [ ] Implementar WebRTC Manager completo
- [ ] Crear más sprites de avatares
- [ ] Diseñar mapas adicionales
- [ ] Mejorar UI/UX del chat
- [ ] Optimizar renderizado Phaser

### Prioridad Media
- [ ] Editor de mapas visual
- [ ] Sistema de autenticación
- [ ] Objetos interactivos (pizarra, pantalla)
- [ ] Tests unitarios
- [ ] Documentación de API

### Buenas Primeras Contribuciones
- [ ] Añadir más objetos decorativos
- [ ] Mejorar CSS y animaciones
- [ ] Traducir a otros idiomas
- [ ] Corregir typos en docs
- [ ] Añadir tooltips de ayuda

## 💻 Guías de Estilo

### TypeScript
- Usa tipos explícitos siempre que sea posible
- Evita `any`
- Prefiere interfaces sobre types para objetos
- Nombres en camelCase para variables/funciones
- PascalCase para clases/componentes

### React
- Componentes funcionales con hooks
- Props tipadas con interfaces
- Un componente por archivo
- Nombres descriptivos

### Backend
- Funciones puras cuando sea posible
- Validar inputs del cliente
- Manejar errores apropiadamente
- Logging claro

## 🧪 Testing

```bash
# Frontend
cd client
npm test

# Backend
cd server
npm test
```

**Añade tests para:**
- Nuevas funcionalidades
- Bug fixes complejos
- Lógica crítica

## 📝 Documentación

Al añadir features:
1. Actualiza README.md si es necesario
2. Añade JSDoc a funciones complejas
3. Actualiza MEJORAS.md si completaste alguna tarea
4. Documenta APIs nuevas

## 🐛 Reportar Bugs

Abre un issue con:
- **Título claro**: "Bug: El chat no envía mensajes"
- **Descripción**: Qué esperabas vs qué pasó
- **Pasos para reproducir**
- **Screenshots** si aplica
- **Entorno**: OS, navegador, versión de Node

## 💡 Sugerir Features

Abre un issue con:
- **Título**: "Feature: Añadir editor de mapas"
- **Problema que resuelve**
- **Propuesta de solución**
- **Mockups** si tienes

## 📊 Revisión de Código

Los PRs serán revisados considerando:
- ✅ Funcionalidad correcta
- ✅ Código limpio y legible
- ✅ Sin bugs introducidos
- ✅ Performance adecuado
- ✅ Tests incluidos
- ✅ Documentación actualizada

## 🏆 Reconocimientos

Todos los contribuidores serán añadidos al README.

## ❓ Preguntas

¿Dudas? Abre una discusión en GitHub o contacta al equipo.

## 📄 Licencia

Al contribuir, aceptas que tu código se distribuya bajo la licencia MIT del proyecto.
