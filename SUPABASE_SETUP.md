# Configuración de Supabase para App Consultorio Dental

## Paso 1: Crear Proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Crea una cuenta o inicia sesión
3. Crea un nuevo proyecto
4. Guarda las credenciales:
   - **Project URL**: `https://[tu-proyecto].supabase.co`
   - **Anon Key**: La clave pública (anon/public)

## Paso 2: Actualizar Configuración

Edita el archivo `supabase.config.js` y reemplaza:

```javascript
const SUPABASE_URL = 'TU_URL_AQUI';
const SUPABASE_ANON_KEY = 'TU_ANON_KEY_AQUI';
```

## Paso 3: Crear Tablas en Supabase

Ve al SQL Editor en Supabase y ejecuta el siguiente script:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER,
  birth_date DATE,
  phone TEXT,
  email TEXT UNIQUE NOT NULL,
  allergies TEXT,
  medications TEXT,
  role TEXT CHECK (role IN ('patient', 'doctor', 'secretary')),
  push_token TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Appointments table
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  duration INTEGER DEFAULT 30 CHECK (duration IN (30, 45)),
  reason TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')) DEFAULT 'pending',
  confirmed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Availability table
CREATE TABLE availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time_slot TIME NOT NULL,
  duration INTEGER DEFAULT 30 CHECK (duration IN (30, 45)),
  is_available BOOLEAN DEFAULT TRUE,
  UNIQUE(doctor_id, date, time_slot)
);

-- Treatments table
CREATE TABLE treatments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  treatment_type TEXT NOT NULL,
  affected_teeth TEXT[],
  notes TEXT,
  cost DECIMAL(10,2),
  payment_status TEXT CHECK (payment_status IN ('pending', 'partial', 'paid')) DEFAULT 'pending',
  treatment_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Dental chart/odontogram
CREATE TABLE dental_chart (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tooth_number INTEGER NOT NULL CHECK (tooth_number BETWEEN 1 AND 32),
  condition TEXT,
  notes TEXT,
  last_updated TIMESTAMP DEFAULT NOW(),
  UNIQUE(patient_id, tooth_number)
);

-- Prescriptions table
CREATE TABLE prescriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  medication_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  duration TEXT NOT NULL,
  instructions TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  treatment_id UUID REFERENCES treatments(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT,
  payment_date TIMESTAMP DEFAULT NOW(),
  notes TEXT
);

-- Appointment changes history
CREATE TABLE appointment_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  change_type TEXT CHECK (change_type IN ('rescheduled', 'cancelled')),
  old_date DATE,
  old_time TIME,
  new_date DATE,
  new_time TIME,
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_date ON appointments(date);
CREATE INDEX idx_availability_doctor_date ON availability(doctor_id, date);
CREATE INDEX idx_treatments_patient ON treatments(patient_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_dental_chart_patient ON dental_chart(patient_id);
```

## Paso 4: Configurar Row Level Security (RLS)

Ejecuta estos comandos para habilitar RLS y configurar el acceso seguro:

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE dental_chart ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- users: Staff can see everyone, patients only themselves
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Staff can view all users" ON users FOR SELECT 
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('doctor', 'secretary', 'admin')));
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Anyone can insert user on signup" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage all users" ON users FOR ALL 
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- appointments: Comprehensive access for staff
CREATE POLICY "Patients view own appointments" ON appointments FOR SELECT USING (patient_id = auth.uid());
CREATE POLICY "Staff can manage all appointments" ON appointments FOR ALL 
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('doctor', 'secretary', 'admin')));
CREATE POLICY "Patients can create appointments" ON appointments FOR INSERT WITH CHECK (patient_id = auth.uid());

-- availability: Public view, Staff manage
CREATE POLICY "Everyone can view availability" ON availability FOR SELECT USING (true);
CREATE POLICY "Staff can manage availability" ON availability FOR ALL 
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('secretary', 'admin')));

-- clinical data: Patients view own, Doctors manage
CREATE POLICY "Patients view own clinical data" ON treatments FOR SELECT USING (patient_id = auth.uid());
CREATE POLICY "Staff view clinical data" ON treatments FOR SELECT 
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('doctor', 'secretary', 'admin')));
CREATE POLICY "Doctors/Admins manage treatments" ON treatments FOR ALL 
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('doctor', 'admin')));

-- dental_chart:
CREATE POLICY "Patients view own chart" ON dental_chart FOR SELECT USING (patient_id = auth.uid());
CREATE POLICY "Doctors/Admin manage charts" ON dental_chart FOR ALL 
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('doctor', 'admin')));

-- prescriptions:
CREATE POLICY "Patients view own prescriptions" ON prescriptions FOR SELECT USING (patient_id = auth.uid());
CREATE POLICY "Doctors/Admin manage prescriptions" ON prescriptions FOR ALL 
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('doctor', 'admin')));

-- notifications:
CREATE POLICY "Users view own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Staff can notify patients" ON notifications FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('doctor', 'secretary', 'admin')));
CREATE POLICY "Users mark own as read" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- appointment_changes:
CREATE POLICY "Staff can view all changes" ON appointment_changes FOR SELECT 
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('doctor', 'secretary', 'admin')));
CREATE POLICY "Staff can log changes" ON appointment_changes FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('doctor', 'secretary', 'admin')));
```

## Paso 5: Crear Cuentas de Doctor y Secretaria

Como admin, ejecuta este script para crear cuentas de doctor/secretaria:

```sql
-- Primero crea el usuario en Authentication (desde el panel de Supabase)
-- Luego ejecuta esto con el UUID del usuario creado:

INSERT INTO users (id, name, email, phone, role, allergies, medications)
VALUES 
  ('UUID_DEL_DOCTOR', 'Dr. Juan Pérez', 'doctor@clinica.com', '8091234567', 'doctor', NULL, NULL),
  ('UUID_DE_SECRETARIA', 'María González', 'secretaria@clinica.com', '8097654321', 'secretary', NULL, NULL);
```

## Paso 6: Probar la Aplicación

1. Asegúrate de que las dependencias estén instaladas:
   ```bash
   npm install
   ```

2. Inicia la aplicación:
   ```bash
   npm start
   ```

3. Escanea el código QR con Expo Go en tu teléfono

## Notas Importantes

- **Seguridad**: Nunca compartas tu `SUPABASE_ANON_KEY` públicamente
- **Testing**: Prueba primero con datos de prueba
- **Backups**: Supabase hace backups automáticos, pero considera exportar datos importantes
- **Límites**: El tier gratuito tiene límites de almacenamiento y requests

## Solución de Problemas

### Error de conexión a Supabase
- Verifica que la URL y la clave sean correctas
- Revisa que el proyecto de Supabase esté activo

### Errores de RLS
- Asegúrate de que las políticas estén habilitadas
- Verifica que el usuario tenga el rol correcto

### Problemas con notificaciones
- En desarrollo, usa Expo Go
- Para producción, necesitarás configurar FCM/APNs
