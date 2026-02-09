import { Linking } from 'react-native';

export const whatsappService = {
    // Format phone number for WhatsApp (remove special characters and add country code)
    formatPhoneNumber(phone) {
        if (!phone) return '';
        // Remove all non-numeric characters
        let cleaned = phone.replace(/\D/g, '');
        // If it doesn't start with country code, add Venezuela's +58
        if (!cleaned.startsWith('58')) {
            cleaned = '58' + cleaned;
        }
        return cleaned;
    },

    // Open WhatsApp with pre-filled message
    async openWhatsApp(phoneNumber, message = '') {
        try {
            const formattedPhone = this.formatPhoneNumber(phoneNumber);
            const encodedMessage = encodeURIComponent(message);
            const url = `whatsapp://send?phone=${formattedPhone}&text=${encodedMessage}`;

            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) {
                await Linking.openURL(url);
                return { success: true };
            } else {
                // Fallback to web WhatsApp
                const webUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
                await Linking.openURL(webUrl);
                return { success: true };
            }
        } catch (error) {
            console.error('Error opening WhatsApp:', error);
            return { success: false, error };
        }
    },

    // Generate message for appointment consultation
    getAppointmentMessage(patientName, appointmentDate, appointmentTime) {
        return `Hola, soy ${patientName}. Tengo una consulta sobre mi cita programada para el ${appointmentDate} a las ${appointmentTime}.`;
    },

    // Generate message for general consultation
    getGeneralConsultationMessage(patientName) {
        return `Hola Doctor, soy ${patientName}. Quisiera hacer una consulta.`;
    },

    // Generate message from doctor to patient
    getDoctorToPatientMessage(doctorName, patientName) {
        return `Hola ${patientName}, soy el Dr. ${doctorName}. Me comunico con usted para...`;
    },

    // Generate message for appointment confirmation
    getConfirmationMessage(patientName, appointmentDate, appointmentTime) {
        return `Hola ${patientName}, le recordamos su cita odontológica el ${appointmentDate} a las ${appointmentTime}. Por favor confirme su asistencia.`;
    },

    // Generate message for appointment reschedule notification
    getRescheduleMessage(patientName, oldDate, oldTime, newDate, newTime) {
        return `Hola ${patientName}, su cita del ${oldDate} a las ${oldTime} ha sido reprogramada para el ${newDate} a las ${newTime}.`;
    },

    // Generate message for appointment cancellation
    getCancellationMessage(patientName, appointmentDate, appointmentTime, reason) {
        return `Hola ${patientName}, lamentamos informarle que su cita del ${appointmentDate} a las ${appointmentTime} ha sido cancelada. Motivo: ${reason}. Por favor contacte con nosotros para reagendar.`;
    },
};
