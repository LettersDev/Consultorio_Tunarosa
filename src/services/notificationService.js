import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '../../supabase.config';

// Configuración básica para recibir notificaciones
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

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
                data: { someData: 'goes here' },
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

            return { data: internalNotif, error: null };
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
    }
};
