export const COLORS = {
    primary: '#0D47A1',    // Azul Navy profundo (Profesional)
    secondary: '#1976D2',  // Azul médico
    accent: '#64B5F6',     // Azul cielo suave
    background: '#F8F9FA', // Blanco grisáceo muy limpio
    surface: '#FFFFFF',
    success: '#2E7D32',    // Verde esmeralda profesional
    warning: '#F9A825',
    error: '#C62828',
    text: '#121212',
    textSecondary: '#5F6368',
    border: '#E8EAED',
};

export const ROLES = {
    PATIENT: 'patient',
    DOCTOR: 'doctor',
    SECRETARY: 'secretary',
};

export const APPOINTMENT_STATUS = {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    CANCELLED: 'cancelled',
    COMPLETED: 'completed',
};

export const TREATMENT_TYPES = [
    'Limpieza dental',
    'Empaste/Obturación',
    'Extracción',
    'Endodoncia (conducto)',
    'Corona dental',
    'Puente dental',
    'Implante dental',
    'Ortodoncia',
    'Blanqueamiento',
    'Prótesis',
    'Otro',
];

export const TOOTH_CONDITIONS = {
    HEALTHY: 'healthy',
    CAVITY: 'cavity',
    FILLED: 'filled',
    MISSING: 'missing',
    CROWN: 'crown',
    ROOT_CANAL: 'root_canal',
    IMPLANT: 'implant',
};

export const PAYMENT_STATUS = {
    PENDING: 'pending',
    PARTIAL: 'partial',
    PAID: 'paid',
};
