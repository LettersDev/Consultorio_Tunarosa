import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '../../supabase.config';

// Configuración de categorías de notificación interactiva
const CONFIRM_ACTION = 'CONFIRM_APPOINTMENT';
const CANCEL_ACTION = 'CANCEL_APPOINTMENT';
const APPOINTMENT_CATEGORY = 'appointment-confirmation';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

// Definir las categorías globales
Notifications.setNotificationCategoryAsync(APPOINTMENT_CATEGORY, [
    {
        identifier: CONFIRM_ACTION,
        buttonTitle: '✅ Sí, asistiré',
        options: { isDestructive: false },
    },
    {
        identifier: CANCEL_ACTION,
        buttonTitle: '❌ No podré asistir',
        options: { isDestructive: true },
    },
]);

export const notificationService = {
    // Solicitar permisos y obtener token del dispositivo
    async registerForPushNotifications(userId) {
        try {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                console.log('Permiso de notificaciones denegado');
                return null;
            }

            // Expo requiere el projectId para obtener el token de push
            const projectId = Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId;

            if (!projectId) {
                console.log('[NotificationService] Notificaciones Push externas desactivadas: Falta projectId (EAS no configurado)');
                // No lanzamos error, solo retornamos null para que la app siga funcionando
                return null;
            }

            const token = (await Notifications.getExpoPushTokenAsync({
                projectId: projectId
            })).data;
            console.log('Push Token obtenido:', token);

            // Guardar token en la base de datos
            if (userId) {
                const { error: updateError } = await supabase
                    .from('users')
                    .update({ push_token: token })
                    .eq('id', userId);

                if (updateError) {
                    console.error('[NotificationService] Error guardando token en DB:', updateError);
                }
            }

            if (Platform.OS === 'android') {
                Notifications.setNotificationChannelAsync('default', {
                    name: 'default',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#1E3A8A',
                });
            }

            return token;
        } catch (error) {
            console.error('Error en registerForPushNotifications:', error);
            return null;
        }
    },

    // Enviar notificación Push (Externa) vía Expo API
    async sendExternalNotification(pushToken, title, body) {
        if (!pushToken) return;

        try {
            const message = {
                to: pushToken,
                sound: 'default',
                title: title,
                body: body,
                priority: 'high', // WhatsApp style (Heads-up)
                channelId: 'default',
                data: { title, body },
            };

            await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Accept-encoding': 'gzip, deflate',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(message),
            });
        } catch (error) {
            console.error('Error enviando notificación externa:', error);
        }
    },

    // Crear notificación interna y externa
    async createNotification(userId, title, message) {
        try {
            console.log(`[NotificationService] Intentando crear notificación para: ${userId}`);

            // 1. Crear registro interno
            const { error } = await supabase
                .from('notifications')
                .insert([{ user_id: userId, title, message, read: false }]);

            if (error) {
                console.error('[NotificationService] Error al insertar en DB:', error);
                throw error;
            }

            console.log('[NotificationService] Registro interno creado con éxito');

            // 2. Buscar push_token
            const { data: user } = await supabase
                .from('users')
                .select('push_token')
                .eq('id', userId)
                .single();

            if (user?.push_token) {
                console.log('[NotificationService] Enviando alerta externa a token:', user.push_token);
                await this.sendExternalNotification(user.push_token, title, message);
            } else {
                console.log('[NotificationService] El usuario no tiene push_token registrado.');
            }

            return { success: true, error: null };
        } catch (error) {
            console.error('[NotificationService] Fallo crítico:', error);
            return { data: null, error };
        }
    },

    // Get notifications for a user
    async getUserNotifications(userId) {
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Error fetching notifications:', error);
            return { data: null, error };
        }
    },

    // Mark notification as read
    async markAsRead(notificationId) {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('id', notificationId);

            if (error) throw error;
            return { error: null };
        } catch (error) {
            console.error('Error marking notification as read:', error);
            return { error };
        }
    },

    // Get unread count
    async getUnreadCount(userId) {
        try {
            const { count, error } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('read', false);

            if (error) throw error;
            return { count, error: null };
        } catch (error) {
            console.error('Error getting unread count:', error);
            return { count: 0, error };
        }
    },

    // Helper to send reschedule notification
    async sendRescheduleNotification(newAppointment, oldAppointment) {
        if (!newAppointment || !oldAppointment) return { success: false };
        const title = '📅 Cita Reprogramada';
        const message = `Tu cita del ${oldAppointment.date} ha sido movida al ${newAppointment.date} a las ${newAppointment.time}.`;
        return this.createNotification(newAppointment.patient_id, title, message);
    },

    // Helper to send cancellation notification
    async sendCancellationNotification(appointment, reason) {
        if (!appointment) return { success: false };
        const title = '❌ Cita Cancelada';
        const message = `Tu cita del ${appointment.date} a las ${appointment.time} ha sido cancelada. Motivo: ${reason || 'No especificado'}`;
        return this.createNotification(appointment.patient_id, title, message);
    },

    // Schedule a reminder for a new appointment
    async scheduleAppointmentReminder(appointment) {
        if (!appointment) return { success: false };
        const title = '✅ Cita Confirmada';
        const message = `Tu cita ha sido programada para el ${appointment.date} a las ${appointment.time}. ¡Te esperamos!`;
        return this.createNotification(appointment.patient_id, title, message);
    },

    // Sync local reminders for the device (1 hour before, interactive)
    async syncLocalReminders(appointments) {
        try {
            await Notifications.cancelAllScheduledNotificationsAsync();
            const now = new Date();

            for (const apt of appointments) {
                // Solo citas confirmadas o pendientes que sean hoy o en el futuro
                if (apt.status === 'cancelled' || apt.status === 'completed') continue;

                const aptDateTime = new Date(`${apt.date}T${apt.time}:00`);
                const reminderTime = new Date(aptDateTime.getTime() - 60 * 60 * 1000);

                if (reminderTime > new Date(now.getTime() + 60 * 1000)) {
                    console.log(`[NotificationService] Programando confirmación interactiva para cita ${apt.id} el ${reminderTime}`);

                    await Notifications.scheduleNotificationAsync({
                        content: {
                            title: '📅 Confirmación de Asistencia',
                            body: `Hola ${apt.patient?.name || ''}, ¿podrás asistir a tu cita de las ${apt.time} hoy?`,
                            sound: 'default',
                            categoryIdentifier: APPOINTMENT_CATEGORY,
                            data: { appointmentId: apt.id, type: 'confirmation-request' },
                        },
                        trigger: reminderTime,
                    });
                }
            }
            return { success: true };
        } catch (error) {
            console.error('[NotificationService] Error sincronizando recordatorios:', error);
            return { success: false, error };
        }
    },

    // Initialize notification response listener
    initNotificationHandlers(onStatusUpdate) {
        return Notifications.addNotificationResponseReceivedListener(async (response) => {
            const { actionIdentifier, notification } = response;
            const { appointmentId } = notification.request.content.data;

            if (!appointmentId) return;

            console.log(`[NotificationService] Respuesta recibida: ${actionIdentifier} para cita ${appointmentId}`);

            try {
                if (actionIdentifier === CONFIRM_ACTION) {
                    await supabase
                        .from('appointments')
                        .update({ status: 'confirmed', confirmed: true })
                        .eq('id', appointmentId);

                    // Notificar al personal
                    this.notifyStaffAboutConfirmation(appointmentId);

                    // Alerta interna para feedback visual
                    Alert.alert('✅ Confirmado', 'Tu asistencia ha sido registrada. ¡Gracias!');
                }
                else if (actionIdentifier === CANCEL_ACTION) {
                    // Notificar antes de cancelar para tener los datos
                    await this.notifyStaffAboutCancellation(appointmentId);

                    await supabase
                        .from('appointments')
                        .update({ status: 'cancelled' })
                        .eq('id', appointmentId);

                    Alert.alert('❌ Cancelado', 'Entendido. La cita ha sido cancelada.');
                }

                if (onStatusUpdate) onStatusUpdate();
            } catch (error) {
                console.error('[NotificationService] Error procesando respuesta:', error);
            }
        });
    },

    // Notificar al Doctor y Secretaria sobre una cancelación del paciente
    async notifyStaffAboutCancellation(appointmentId) {
        try {
            const { data: apt, error: aptError } = await supabase
                .from('appointments')
                .select('*, patient:users!appointments_patient_id_fkey(name)')
                .eq('id', appointmentId)
                .single();

            if (aptError || !apt) return;

            const title = '⚠️ Cita Cancelada';
            const message = `El paciente ${apt.patient?.name || 'Desconocido'} canceló su cita de las ${apt.time}.`;

            const { data: staff, error: staffError } = await supabase
                .from('users')
                .select('id')
                .or(`id.eq.${apt.doctor_id},role.eq.secretary,role.eq.admin`);

            if (staffError || !staff) return;

            const notifications = staff.map(s => this.createNotification(s.id, title, message));
            await Promise.all(notifications);
        } catch (error) {
            console.error('[NotificationService] Error notificando cancelación:', error);
        }
    },

    // Notificar al Doctor y Secretaria sobre una confirmación del paciente
    async notifyStaffAboutConfirmation(appointmentId) {
        try {
            const { data: apt, error: aptError } = await supabase
                .from('appointments')
                .select('*, patient:users!appointments_patient_id_fkey(name)')
                .eq('id', appointmentId)
                .single();

            if (aptError || !apt) return;

            const title = '✅ Cita Confirmada';
            const message = `El paciente ${apt.patient?.name || 'Desconocido'} confirmó su asistencia para las ${apt.time}.`;

            const { data: staff, error: staffError } = await supabase
                .from('users')
                .select('id')
                .or(`id.eq.${apt.doctor_id},role.eq.secretary,role.eq.admin`);

            if (staffError || !staff) return;

            const notifications = staff.map(s => this.createNotification(s.id, title, message));
            await Promise.all(notifications);
        } catch (error) {
            console.error('[NotificationService] Error notificando confirmación:', error);
        }
    },

    // Enviar notificación a TODOS los pacientes (Difusión)
    async sendBroadcastNotification(title, message) {
        try {
            console.log('[NotificationService] Iniciando difusión masiva...');

            // 1. Obtener todos los pacientes con push_token
            const { data: patients, error: patientsError } = await supabase
                .from('users')
                .select('id, push_token')
                .eq('role', 'patient');

            if (patientsError) throw patientsError;
            if (!patients || patients.length === 0) {
                return { success: false, message: 'No hay pacientes registrados.' };
            }

            // 2. Filtrar tokens válidos
            const pushTokens = patients
                .filter(p => p.push_token)
                .map(p => p.push_token);

            // 3. Crear registros internos para cada paciente (para que lo vean en su app)
            const internalNotifications = patients.map(p => ({
                user_id: p.id,
                title: title,
                message: message,
                read: false
            }));

            const { error: insertError } = await supabase
                .from('notifications')
                .insert(internalNotifications);

            if (insertError) {
                console.error('[NotificationService] Error al insertar notificaciones internas en difusión:', insertError);
            }

            // 4. Enviar Push masivos vía Expo (en lotes si son muchos, pero aquí lo haremos directo)
            if (pushTokens.length > 0) {
                // Expo permite enviar arreglos de mensajes
                const messages = pushTokens.map(token => ({
                    to: token,
                    sound: 'default',
                    title: title,
                    body: message,
                }));

                // Enviamos a la API de Expo
                await fetch('https://exp.host/--/api/v2/push/send', {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'Accept-encoding': 'gzip, deflate',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(messages),
                });
            }

            console.log(`[NotificationService] Difusión completada para ${patients.length} pacientes.`);
            return { success: true, count: patients.length };
        } catch (error) {
            console.error('[NotificationService] Error en difusión:', error);
            return { success: false, error };
        }
    }
};
