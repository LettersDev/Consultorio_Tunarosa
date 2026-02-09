import { supabase } from '../../supabase.config';
import { notificationService } from './notificationService';

export const appointmentService = {
    // Get available time slots for a specific date and doctor
    async getAvailableSlots(doctorId, date) {
        if (doctorId === 'undefined') {
            console.error('getAvailableSlots: doctorId is the string "undefined"');
            return { data: null, error: new Error('Invalid doctorId') };
        }
        try {
            const { data, error } = await supabase
                .from('availability')
                .select('id, time_slot, duration, is_available')
                .eq('doctor_id', doctorId)
                .eq('date', date)
                .eq('is_available', true)
                .order('time_slot', { ascending: true });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    },

    // Book an appointment
    async bookAppointment(appointmentData) {
        try {
            const { data, error } = await supabase
                .from('appointments')
                .insert([appointmentData])
                .select()
                .single();

            if (error) throw error;

            // Mark the time slot as unavailable
            await supabase
                .from('availability')
                .update({ is_available: false })
                .eq('doctor_id', appointmentData.doctor_id)
                .eq('date', appointmentData.date)
                .eq('time_slot', appointmentData.time);

            // Schedule notification reminder
            await notificationService.scheduleAppointmentReminder(data);

            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    },

    // Reschedule an appointment
    async rescheduleAppointment(appointmentId, newDate, newTime, changedBy, reason = '') {
        try {
            // Get current appointment
            const { data: currentAppointment, error: fetchError } = await supabase
                .from('appointments')
                .select('*')
                .eq('id', appointmentId)
                .single();

            if (fetchError) throw fetchError;

            // Update appointment
            const { data, error } = await supabase
                .from('appointments')
                .update({
                    date: newDate,
                    time: newTime,
                    status: 'pending',
                    confirmed: false,
                })
                .eq('id', appointmentId)
                .select()
                .single();

            if (error) throw error;

            // Log the change
            await supabase.from('appointment_changes').insert([
                {
                    appointment_id: appointmentId,
                    changed_by: changedBy,
                    change_type: 'rescheduled',
                    old_date: currentAppointment.date,
                    old_time: currentAppointment.time,
                    new_date: newDate,
                    new_time: newTime,
                    reason,
                },
            ]);

            // Mark old slot as available
            await supabase
                .from('availability')
                .update({ is_available: true })
                .eq('doctor_id', currentAppointment.doctor_id)
                .eq('date', currentAppointment.date)
                .eq('time_slot', currentAppointment.time);

            // Mark new slot as unavailable
            await supabase
                .from('availability')
                .update({ is_available: false })
                .eq('doctor_id', currentAppointment.doctor_id)
                .eq('date', newDate)
                .eq('time_slot', newTime);

            // Send notification to patient
            console.log(`[AppointmentService] Notificando reagendamiento al paciente: ${data.patient_id}`);
            await notificationService.sendRescheduleNotification(data, currentAppointment);

            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    },

    // Cancel an appointment
    async cancelAppointment(appointmentId, changedBy, reason) {
        try {
            // Get current appointment
            const { data: currentAppointment, error: fetchError } = await supabase
                .from('appointments')
                .select('*')
                .eq('id', appointmentId)
                .maybeSingle();

            if (fetchError) throw fetchError;
            if (!currentAppointment) {
                throw new Error('Cita no encontrada');
            }

            // Update appointment status - don't use .select().single() due to RLS
            const { error } = await supabase
                .from('appointments')
                .update({ status: 'cancelled' })
                .eq('id', appointmentId);

            if (error) throw error;

            // Log the change
            await supabase.from('appointment_changes').insert([
                {
                    appointment_id: appointmentId,
                    changed_by: changedBy,
                    change_type: 'cancelled',
                    old_date: currentAppointment.date,
                    old_time: currentAppointment.time,
                    reason,
                },
            ]);

            // Mark slot as available again
            await supabase
                .from('availability')
                .update({ is_available: true })
                .eq('doctor_id', currentAppointment.doctor_id)
                .eq('date', currentAppointment.date)
                .eq('time_slot', currentAppointment.time);

            // Send cancellation notification
            console.log(`[AppointmentService] Notificando cancelación al paciente: ${currentAppointment.patient_id}`);
            await notificationService.sendCancellationNotification({
                ...currentAppointment,
                status: 'cancelled'
            }, reason);

            return { data: { id: appointmentId, status: 'cancelled' }, error: null };
        } catch (error) {
            console.error('Error cancelling appointment:', error);
            return { data: null, error };
        }
    },

    // Get appointments for a patient
    async getPatientAppointments(patientId) {
        if (patientId === 'undefined' || !patientId) {
            console.error('getPatientAppointments: patientId is invalid:', patientId);
            return { data: [], error: null };
        }
        try {
            const { data, error } = await supabase
                .from('appointments')
                .select(`
          *,
          doctor:users!appointments_doctor_id_fkey(name, phone)
        `)
                .eq('patient_id', patientId)
                .order('date', { ascending: true });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    },

    // Get appointments for a doctor
    async getDoctorAppointments(doctorId) {
        try {
            console.log('Fetching appointments for doctor:', doctorId);
            const { data, error } = await supabase
                .from('appointments')
                .select(`
                    id, date, time, duration, status, reason, confirmed, patient_id,
                    patient:users!appointments_patient_id_fkey(id, name, phone, allergies, medications)
                `)
                .eq('doctor_id', doctorId)
                .order('date', { ascending: true });

            if (error) {
                console.error('Error fetching doctor appointments:', error);
                return { data: null, error };
            }

            return { data, error: null };
        } catch (error) {
            console.error('Exception in getDoctorAppointments:', error);
            return { data: null, error };
        }
    },

    // Get all appointments (for secretary)
    async getAllAppointments() {
        try {
            const { data, error } = await supabase
                .from('appointments')
                .select(`
          *,
          patient:users!appointments_patient_id_fkey(name, phone),
          doctor:users!appointments_doctor_id_fkey(name)
        `)
                .order('date', { ascending: true });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    },

    // Confirm appointment
    async confirmAppointment(appointmentId) {
        try {
            console.log('Confirming appointment with ID:', appointmentId);

            const { data, error } = await supabase
                .from('appointments')
                .update({ confirmed: true, status: 'confirmed' })
                .eq('id', appointmentId)
                .select()
                .single();

            if (error) throw error;

            // Send notification to patient
            await notificationService.createNotification(
                data.patient_id,
                '✅ Cita Confirmada',
                `Tu cita del ${data.date} a las ${data.time} ha sido confirmada por el doctor.`
            );

            return { data, error: null };
        } catch (error) {
            console.error('Error confirming appointment:', error);
            return { data: null, error };
        }
    },

    // Update appointment status
    async updateAppointmentStatus(appointmentId, status) {
        try {
            const { error } = await supabase
                .from('appointments')
                .update({ status })
                .eq('id', appointmentId);

            if (error) throw error;
            return { success: true, error: null };
        } catch (error) {
            console.error('Error updating appointment status:', error);
            return { success: false, error };
        }
    },
};
