import { supabase } from '../../supabase.config';

export const treatmentService = {
    // Add a new treatment record
    async addTreatment(treatmentData) {
        try {
            const { data, error } = await supabase
                .from('treatments')
                .insert([treatmentData])
                .select()
                .single();

            if (error) throw error;

            // Update dental chart if teeth are affected
            if (treatmentData.affected_teeth && treatmentData.affected_teeth.length > 0) {
                await this.updateDentalChart(
                    treatmentData.patient_id,
                    treatmentData.affected_teeth,
                    treatmentData.treatment_type
                );
            }

            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    },

    // Get treatments for a patient
    async getPatientTreatments(patientId) {
        if (patientId === 'undefined' || !patientId) {
            console.error('getPatientTreatments: patientId is invalid:', patientId);
            return { data: [], error: null };
        }
        try {
            const { data, error } = await supabase
                .from('treatments')
                .select(`
          id, treatment_type, treatment_date, notes, affected_teeth, cost, payment_status,
          doctor:users!treatments_doctor_id_fkey(name)
        `)
                .eq('patient_id', patientId)
                .order('treatment_date', { ascending: false });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    },

    // Update dental chart
    async updateDentalChart(patientId, toothNumbers, condition) {
        try {
            const updates = toothNumbers.map(toothNumber => ({
                patient_id: patientId,
                tooth_number: parseInt(toothNumber),
                condition: this.mapTreatmentToCondition(condition),
                last_updated: new Date().toISOString(),
            }));

            const { data, error } = await supabase
                .from('dental_chart')
                .upsert(updates, { onConflict: 'patient_id,tooth_number' });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    },

    // Get dental chart for a patient
    async getDentalChart(patientId) {
        try {
            const { data, error } = await supabase
                .from('dental_chart')
                .select('*')
                .eq('patient_id', patientId)
                .order('tooth_number', { ascending: true });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    },

    // Map treatment type to tooth condition
    mapTreatmentToCondition(treatmentType) {
        const mapping = {
            'Empaste/Obturación': 'filled',
            'Extracción': 'missing',
            'Corona dental': 'crown',
            'Endodoncia (conducto)': 'root_canal',
            'Implante dental': 'implant',
        };
        return mapping[treatmentType] || 'healthy';
    },

    // Add prescription
    async addPrescription(prescriptionData) {
        try {
            const { data, error } = await supabase
                .from('prescriptions')
                .insert([prescriptionData])
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    },

    // Get prescriptions for a patient
    async getPatientPrescriptions(patientId) {
        try {
            const { data, error } = await supabase
                .from('prescriptions')
                .select(`
          *,
          doctor:users!prescriptions_doctor_id_fkey(name)
        `)
                .eq('patient_id', patientId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    },

    // Add payment
    async addPayment(paymentData) {
        try {
            const { data, error } = await supabase
                .from('payments')
                .insert([paymentData])
                .select()
                .single();

            if (error) throw error;

            // Update treatment payment status
            if (paymentData.treatment_id) {
                await this.updateTreatmentPaymentStatus(paymentData.treatment_id);
            }

            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    },

    // Update treatment payment status
    async updateTreatmentPaymentStatus(treatmentId) {
        try {
            // Get treatment cost
            const { data: treatment } = await supabase
                .from('treatments')
                .select('cost')
                .eq('id', treatmentId)
                .single();

            // Get total payments
            const { data: payments } = await supabase
                .from('payments')
                .select('amount')
                .eq('treatment_id', treatmentId);

            const totalPaid = payments?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;
            const cost = parseFloat(treatment?.cost || 0);

            let paymentStatus = 'pending';
            if (totalPaid >= cost) {
                paymentStatus = 'paid';
            } else if (totalPaid > 0) {
                paymentStatus = 'partial';
            }

            await supabase
                .from('treatments')
                .update({ payment_status: paymentStatus })
                .eq('id', treatmentId);

            return { success: true };
        } catch (error) {
            return { success: false, error };
        }
    },

    // Get payments for a patient
    async getPatientPayments(patientId) {
        if (patientId === 'undefined' || !patientId) {
            console.error('getPatientPayments: patientId is invalid:', patientId);
            return { data: [], error: null };
        }
        try {
            const { data, error } = await supabase
                .from('payments')
                .select(`
          id, amount, payment_date, payment_method, notes,
          treatment:treatments(treatment_type, treatment_date)
        `)
                .eq('patient_id', patientId)
                .order('payment_date', { ascending: false });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    },
};
