export const COLORS = {
    primary: '#0EA5E9',    // Sky Blue (más claro y fresco)
    secondary: '#38BDF8',  // Sky Blue claro
    accent: '#7DD3FC',     // Sky Blue suave
    background: '#F8FAFC',
    surface: '#FFFFFF',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    text: '#0F172A',
    textSecondary: '#64748B',
    border: '#E2E8F0',
    white: '#FFFFFF',
};

export const ROLES = {
    PATIENT: 'patient',
    DOCTOR: 'doctor',
    SECRETARY: 'secretary',
    ADMIN: 'admin',
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
