# 🦷 App Consultorio Dental

Aplicación móvil completa para gestión de consultorio dental desarrollada con React Native y Expo.

## 📱 Características

### Para Pacientes
- ✅ Registro con datos médicos (alergias, medicamentos)
- ✅ Agendar citas con doctores
- ✅ Ver historial de citas y tratamientos
- ✅ Contactar al doctor por WhatsApp
- ✅ Recibir recordatorios de citas
- ✅ Ver prescripciones y odontograma

### Para Doctores
- ✅ Ver agenda del día
- ✅ Acceso a información de pacientes
- ✅ Alertas de alergias y medicamentos
- ✅ Registrar tratamientos
- ✅ Crear prescripciones digitales
- ✅ Gestionar odontograma
- ✅ Contactar pacientes por WhatsApp

### Para Secretaria
- ✅ Gestionar disponibilidad de doctores
- ✅ Ver todas las citas
- ✅ Reprogramar y cancelar citas
- ✅ Confirmar citas
- ✅ Estadísticas del consultorio
- ✅ Gestión de pagos

## 🚀 Inicio Rápido

### Prerrequisitos
- Node.js 14+
- npm o yarn
- Expo Go app en tu teléfono
- Cuenta de Supabase (gratis)

### Instalación

1. **Clonar o navegar al proyecto**
   ```bash
   cd App_Consultorio
   ```

2. **Instalar dependencias** (si no están instaladas)
   ```bash
   npm install
   ```

3. **Configurar Supabase**
   - Sigue las instrucciones en `SUPABASE_SETUP.md`
   - Actualiza `supabase.config.js` con tus credenciales

4. **Iniciar la aplicación**
   ```bash
   npm start
   ```

5. **Escanear QR**
   - Abre Expo Go en tu teléfono
   - Escanea el código QR

## 🛠️ Tecnologías

- **React Native** - Framework móvil
- **Expo** - Desarrollo y build
- **Supabase** - Backend (PostgreSQL + Auth)
- **React Navigation** - Navegación
- **WhatsApp** - Comunicación
- **Expo Notifications** - Notificaciones

## 📂 Estructura del Proyecto

```
App_Consultorio/
├── App.js                 # Punto de entrada
├── supabase.config.js     # Configuración de Supabase
├── src/
│   ├── screens/          # Pantallas
│   │   ├── auth/        # Login, Registro
│   │   ├── patient/     # Dashboards y funciones de paciente
│   │   ├── doctor/      # Dashboards y funciones de doctor
│   │   ├── secretary/   # Dashboards y funciones de secretaria
│   │   └── shared/      # Pantallas compartidas
│   ├── components/       # Componentes reutilizables
│   ├── navigation/       # Configuración de navegación
│   ├── services/         # Servicios (API, Auth, etc.)
│   ├── utils/           # Utilidades
│   └── constants/       # Constantes (colores, tipos, etc.)
├── SUPABASE_SETUP.md    # Guía de configuración de BD
└── package.json
```

## 🔐 Roles de Usuario

### Paciente
- Se registra desde la app
- Puede agendar citas
- Ve su historial médico

### Doctor
- Creado por admin en Supabase
- Gestiona pacientes y tratamientos
- Accede a información médica completa

### Secretaria
- Creada por admin en Supabase
- Gestiona disponibilidad y citas
- Administra el consultorio

## 📋 Configuración Inicial

### 1. Crear Proyecto Supabase
1. Ve a [supabase.com](https://supabase.com)
2. Crea un nuevo proyecto
3. Copia la URL y la Anon Key

### 2. Configurar Base de Datos
Ejecuta el script SQL en `SUPABASE_SETUP.md` en el SQL Editor de Supabase

### 3. Actualizar Credenciales
Edita `supabase.config.js`:
```javascript
const SUPABASE_URL = 'tu-url-aqui';
const SUPABASE_ANON_KEY = 'tu-key-aqui';
```

### 4. Crear Usuarios Admin
Crea doctor y secretaria desde el panel de Supabase Auth

## 🎨 Características Destacadas

### WhatsApp Integration
- Comunicación directa sin costos adicionales
- Mensajes pre-llenados con contexto
- Funciona inmediatamente

### Notificaciones Inteligentes
- Recordatorios 24h antes
- Notificaciones de cambios
- Confirmaciones de citas

### Odontograma Digital
- 32 dientes
- Historial de tratamientos
- Visualización de condiciones

### Gestión de Citas Avanzada
- Reprogramación con historial
- Cancelación con motivo
- Tracking completo de cambios

## 📱 Comandos Disponibles

```bash
# Iniciar en desarrollo
npm start

# Iniciar en Android
npm run android

# Iniciar en iOS
npm run ios

# Iniciar en web
npm run web
```

## 🔧 Solución de Problemas

### La app no conecta con Supabase
- Verifica que la URL y Key sean correctas
- Asegúrate de que el proyecto Supabase esté activo

### Errores de permisos
- Revisa las políticas RLS en Supabase
- Verifica que el usuario tenga el rol correcto

### Notificaciones no funcionan
- En desarrollo, las notificaciones locales funcionan
- Para producción, configura FCM/APNs

## 📄 Licencia

Este proyecto es privado y confidencial.

## 👨‍💻 Desarrollo

Desarrollado con ❤️ para consultorios dentales modernos.

---

**Nota**: Esta es la versión base de la aplicación. Algunas pantallas adicionales están pendientes de implementación. Ver `walkthrough.md` para detalles del progreso.
