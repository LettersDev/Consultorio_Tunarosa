import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../supabase.config';
import { authService } from '../../services/authService';
import { appointmentService } from '../../services/appointmentService';
import { WhatsAppButton } from '../../components/WhatsAppButton';
import { CustomButton } from '../../components/CustomButton';
import { notificationService } from '../../services/notificationService';
import { COLORS, APPOINTMENT_STATUS } from '../../constants';

export const PatientDashboard = ({ navigation, user: initialUser, registerPush }) => {
    const [user, setUser] = useState(initialUser);
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        loadData();
        if (user?.id) {
            // notificationService.registerForPushNotifications(user.id); // Handled in App.js

            // Suscribirse a nuevas notificaciones en tiempo real
            const notifSub = supabase
                .channel(`notifs-${user.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${user.id}`,
                    },
                    () => {
                        notificationService.getUnreadCount(user.id).then(res => {
                            setUnreadCount(res.count || 0);
                        });
                    }
                )
                .subscribe();

            // Suscribirse a cambios en citas en tiempo real
            const appointmentSub = supabase
                .channel(`patient-apts-${user.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*', // Escuchar todo: INSERT, UPDATE, DELETE
                        schema: 'public',
                        table: 'appointments',
                        filter: `patient_id=eq.${user.id}`,
                    },
                    () => {

                        loadData();
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(notifSub);
                supabase.removeChannel(appointmentSub);
            };
        }
    }, [user?.id]);

    const loadData = async () => {
        try {
            setLoading(true);

            let currentUserId = user?.id || initialUser?.id;

            if (!currentUserId) {
                const { data: userData } = await authService.getCurrentUser();
                if (userData) {
                    setUser(userData);
                    currentUserId = userData.id;
                }
            } else if (!user && initialUser) {
                setUser(initialUser);
            }

            if (currentUserId) {
                const [appointmentsRes, notificationsRes] = await Promise.all([
                    appointmentService.getPatientAppointments(currentUserId),
                    notificationService.getUnreadCount(currentUserId)
                ]);
                setAppointments(appointmentsRes.data || []);
                setUnreadCount(notificationsRes.count || 0);
            }
        } catch (error) {
            console.error('Error loading patient dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            'Cerrar Sesión',
            '¿Está seguro que desea cerrar sesión?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Sí, cerrar sesión',
                    onPress: async () => {
                        await authService.signOut();
                        // Navigation will be handled by App component
                    },
                },
            ]
        );
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'confirmed':
                return COLORS.success;
            case 'pending':
                return COLORS.warning;
            case 'cancelled':
                return COLORS.error;
            default:
                return COLORS.textSecondary;
        }
    };

    const handleCancel = async (appointmentId) => {
        Alert.alert(
            'Cancelar Cita',
            '¿Está seguro que desea cancelar esta cita?',
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Sí, cancelar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            const { error } = await appointmentService.cancelAppointment(
                                appointmentId,
                                'patient',
                                'Cancelada por el paciente'
                            );
                            if (error) throw error;
                            Alert.alert('Éxito', 'Cita cancelada correctamente');
                            await loadData();
                        } catch (error) {
                            console.error('Error cancelling appointment:', error);
                            Alert.alert('Error', 'No se pudo cancelar la cita');
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'confirmed':
                return 'Confirmada';
            case 'pending':
                return 'Pendiente';
            case 'cancelled':
                return 'Cancelada';
            case 'completed':
                return 'Completada';
            default:
                return status;
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const upcomingAppointments = React.useMemo(() => {
        const d = new Date();
        const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return appointments.filter(apt => {
            return apt.date >= today && apt.status !== 'cancelled' && apt.status !== 'completed';
        }).sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));
    }, [appointments]);

    if (loading && !user && appointments.length === 0) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator animating={true} size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.greeting}>Hola,</Text>
                        <Text style={styles.userName}>{user?.name}</Text>
                    </View>

                    <View style={styles.headerRight}>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('Notifications')}
                            style={styles.notificationButton}
                        >
                            <Ionicons name="notifications-outline" size={26} color={COLORS.primary} />
                            {unreadCount > 0 && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                            <Ionicons name="log-out-outline" size={24} color={COLORS.error} />
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={styles.welcomeBanner}>
                    <Text style={styles.bannerText}>¿Cómo podemos ayudarte hoy?</Text>
                </View>
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
                }
            >
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Tus Próximas Citas</Text>
                        {upcomingAppointments.length > 0 && <Badge style={styles.countBadge}>{upcomingAppointments.length}</Badge>}
                    </View>

                    {upcomingAppointments.length === 0 ? (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconContainer}>
                                <Ionicons name="calendar-outline" size={48} color={COLORS.border} />
                            </View>
                            <Text style={styles.emptyText}>No tienes citas programadas</Text>
                            <CustomButton
                                title="Agendar ahora"
                                onPress={() => navigation.navigate('BookAppointment')}
                                variant="outline"
                                style={styles.emptyActionBtn}
                            />
                        </View>
                    ) : (
                        upcomingAppointments.map((appointment) => (
                            <View key={appointment.id} style={styles.appointmentOuterContainer}>
                                <View style={[
                                    styles.appointmentCard,
                                    { borderLeftColor: getStatusColor(appointment.status) }
                                ]}>
                                    <View style={styles.appointmentMain}>
                                        <View style={styles.appointmentDateWidget}>
                                            <Text style={styles.dateDay}>
                                                {appointment.date.split('-')[2]}
                                            </Text>
                                            <Text style={styles.dateMonth}>
                                                {new Date(appointment.date + 'T12:00:00').toLocaleDateString('es-ES', { month: 'short' }).toUpperCase()}
                                            </Text>
                                        </View>

                                        <View style={styles.appointmentInfo}>
                                            <View style={styles.nameRow}>
                                                <Text style={styles.doctorName}>Dr. {appointment.doctor?.name}</Text>
                                                <View style={[
                                                    styles.statusBadge,
                                                    { backgroundColor: getStatusColor(appointment.status) + '15' }
                                                ]}>
                                                    <Text style={[styles.statusText, { color: getStatusColor(appointment.status) }]}>
                                                        {getStatusText(appointment.status)}
                                                    </Text>
                                                </View>
                                            </View>

                                            <View style={styles.timeRow}>
                                                <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
                                                <Text style={styles.timeText}>{appointment.time}</Text>
                                            </View>

                                            <Text style={styles.reasonText} numberOfLines={1}>{appointment.reason}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.cardActions}>
                                        {appointment.doctor?.phone && (
                                            <WhatsAppButton
                                                phoneNumber={appointment.doctor.phone}
                                                message={`Hola Dr. ${appointment.doctor.name}, tengo una consulta sobre mi cita del ${new Date(appointment.date).toLocaleDateString()} a las ${appointment.time}.`}
                                                variant="outline"
                                                title="Contactar Dr."
                                                style={styles.cardActionBtn}
                                            />
                                        )}
                                        {(appointment.status === APPOINTMENT_STATUS.PENDING || appointment.status === APPOINTMENT_STATUS.CONFIRMED) && (
                                            <CustomButton
                                                title="Cancelar"
                                                onPress={() => handleCancel(appointment.id)}
                                                variant="outline"
                                                style={[styles.cardActionBtn, { borderColor: COLORS.error + '40' }]}
                                                textStyle={{ color: COLORS.error }}
                                            />
                                        )}
                                    </View>
                                </View>
                            </View>
                        ))
                    )}
                </View>

                <View style={styles.mainActions}>
                    <CustomButton
                        title="Agendar Nueva Cita"
                        onPress={() => navigation.navigate('BookAppointment')}
                        style={styles.bookBtn}
                        icon="add-circle"
                    />
                    <View style={styles.secondaryActions}>
                        <CustomButton
                            title="Mi Perfil"
                            onPress={() => navigation.navigate('PatientProfile')}
                            variant="outline"
                            style={styles.secondaryBtn}
                            icon="person-outline"
                        />
                        <CustomButton
                            title="Historial"
                            onPress={() => navigation.navigate('PatientAppointments')}
                            variant="outline"
                            style={styles.secondaryBtn}
                            icon="list-outline"
                        />
                    </View>
                </View>
                <View style={styles.footerSpacer} />
            </ScrollView>
        </View>
    );
};

// Re-import missing components for the new design
import { Badge } from 'react-native-paper';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 25,
        paddingBottom: 25,
        backgroundColor: COLORS.surface,
        borderBottomLeftRadius: 35,
        borderBottomRightRadius: 35,
        elevation: 12,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.12,
        shadowRadius: 25,
        zIndex: 10,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    notificationButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.primary + '10',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: 2,
        right: 2,
        backgroundColor: COLORS.error,
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
        borderWidth: 2,
        borderColor: COLORS.surface,
    },
    badgeText: {
        color: COLORS.white,
        fontSize: 10,
        fontWeight: '900',
    },
    greeting: {
        fontSize: 16,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    userName: {
        fontSize: 24,
        fontWeight: '900',
        color: COLORS.primary,
    },
    logoutButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.error + '10',
        justifyContent: 'center',
        alignItems: 'center',
    },
    welcomeBanner: {
        backgroundColor: COLORS.primary + '10',
        padding: 15,
        borderRadius: 20,
    },
    bannerText: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: '600',
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 20,
    },
    section: {
        paddingHorizontal: 20,
        marginBottom: 25,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
    },
    countBadge: {
        backgroundColor: COLORS.primary,
        color: COLORS.white,
    },
    appointmentOuterContainer: {
        marginBottom: 20,
    },
    appointmentCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 24,
        padding: 0,
        borderLeftWidth: 0,
        elevation: 8,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.border + '50',
    },
    appointmentMain: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'center',
        gap: 16,
    },
    appointmentDateWidget: {
        width: 65,
        height: 70,
        backgroundColor: COLORS.primary + '08',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.primary + '20',
    },
    dateDay: {
        fontSize: 24,
        fontWeight: '900',
        color: COLORS.primary,
    },
    dateMonth: {
        fontSize: 12,
        fontWeight: '800',
        color: COLORS.secondary,
        textTransform: 'uppercase',
    },
    appointmentInfo: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
        gap: 8,
    },
    doctorName: {
        fontSize: 17,
        fontWeight: '800',
        color: COLORS.text,
        flex: 1,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    timeText: {
        fontSize: 15,
        color: COLORS.text,
        fontWeight: '700',
    },
    reasonText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        fontStyle: 'italic',
    },
    cardActions: {
        flexDirection: 'row',
        backgroundColor: COLORS.background + '50',
        padding: 12,
        gap: 10,
        borderTopWidth: 1,
        borderColor: COLORS.border + '30',
    },
    cardActionBtn: {
        flex: 1,
        height: 48,
        borderRadius: 16,
    },
    mainActions: {
        paddingHorizontal: 20,
        gap: 15,
        marginBottom: 30,
    },
    bookBtn: {
        borderRadius: 20,
        height: 56,
    },
    secondaryActions: {
        flexDirection: 'row',
        gap: 12,
    },
    secondaryBtn: {
        flex: 1,
        borderRadius: 16,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 45,
        backgroundColor: COLORS.surface,
        borderRadius: 30,
        borderStyle: 'dashed',
        borderWidth: 2,
        borderColor: COLORS.border,
    },
    emptyIconContainer: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyText: {
        fontSize: 15,
        color: COLORS.textSecondary,
        fontWeight: '600',
        marginBottom: 20,
    },
    emptyActionBtn: {
        minWidth: 160,
    },
    footerSpacer: {
        height: 40,
    },
});
