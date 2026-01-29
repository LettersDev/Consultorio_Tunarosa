import { supabase } from '../../supabase.config';
import { notificationService } from './notificationService';

export const appointmentService = {
    // Get available time slots for a specific date and doctor
    async getAvailableSlots(doctorId, date) {
        try {
            const { data, error } = await supabase
                .from('availability')
                .select('*')
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
                .select('*')
                .eq('doctor_id', doctorId)
                .order('date', { ascending: true });

            if (error) {
                console.error('Error fetching doctor appointments:', error);
                throw error;
            }

            console.log('Raw appointments fetched:', data?.length || 0);

            // Fetch patient data separately to avoid RLS issues
            if (data && data.length > 0) {
                const patientIds = [...new Set(data.map(apt => apt.patient_id))];
                console.log('Fetching patient data for IDs:', patientIds);

                const { data: patients, error: patientsError } = await supabase
                    .from('users')
                    .select('id, name, phone, allergies, medications')
                    .in('id', patientIds);

                if (patientsError) {
                    console.error('Error fetching patients:', patientsError);
                } else {
                    console.log('Patients fetched:', patients?.length || 0);
                    // Map patient data to appointments
                    const enrichedData = data.map(apt => ({
                        ...apt,
                        patient: patients?.find(p => p.id === apt.patient_id) || null
                    }));
                    console.log('Sample enriched appointment:', enrichedData[0]);
                    return { data: enrichedData, error: null };
                }
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

            const { error } = await supabase
                .from('appointments')
                .update({ confirmed: true, status: 'confirmed' })
                .eq('id', appointmentId);

            console.log('Update completed, error:', error);

            if (error) throw error;

            // Update was successful, return a simple confirmation
            return { data: { id: appointmentId }, error: null };
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
