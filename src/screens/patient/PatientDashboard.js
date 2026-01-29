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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../../services/authService';
import { appointmentService } from '../../services/appointmentService';
import { WhatsAppButton } from '../../components/WhatsAppButton';
import { CustomButton } from '../../components/CustomButton';
import { COLORS, APPOINTMENT_STATUS } from '../../constants';

export const PatientDashboard = ({ navigation }) => {
    const [user, setUser] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const { data: userData } = await authService.getCurrentUser();
        if (userData) {
            setUser(userData);
            const { data: appointmentsData } = await appointmentService.getPatientAppointments(userData.id);
            setAppointments(appointmentsData || []);
        }
        setLoading(false);
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
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

    const getUpcomingAppointments = () => {
        const now = new Date();
        return appointments.filter(apt => {
            const aptDate = new Date(apt.date);
            return aptDate >= now && apt.status !== 'cancelled';
        }).sort((a, b) => new Date(a.date) - new Date(b.date));
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

    const upcomingAppointments = getUpcomingAppointments();

    if (loading) {
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
                    <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                        <Ionicons name="log-out-outline" size={24} color={COLORS.error} />
                    </TouchableOpacity>
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
                                                {new Date(appointment.date).toLocaleDateString('es-ES', { day: 'numeric' })}
                                            </Text>
                                            <Text style={styles.dateMonth}>
                                                {new Date(appointment.date).toLocaleDateString('es-ES', { month: 'short' }).toUpperCase()}
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
        borderRadius: 28,
        padding: 0,
        borderLeftWidth: 8,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 15,
        overflow: 'hidden',
    },
    appointmentMain: {
        flexDirection: 'row',
        padding: 20,
        alignItems: 'center',
        gap: 20,
    },
    appointmentDateWidget: {
        width: 60,
        height: 65,
        backgroundColor: COLORS.background,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    dateDay: {
        fontSize: 22,
        fontWeight: '900',
        color: COLORS.primary,
    },
    dateMonth: {
        fontSize: 11,
        fontWeight: '800',
        color: COLORS.textSecondary,
    },
    appointmentInfo: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
        gap: 8,
    },
    doctorName: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
        flex: 1,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6,
    },
    timeText: {
        fontSize: 14,
        color: COLORS.text,
        fontWeight: '600',
    },
    reasonText: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    cardActions: {
        flexDirection: 'row',
        backgroundColor: COLORS.background,
        padding: 12,
        gap: 10,
    },
    cardActionBtn: {
        flex: 1,
        height: 44,
        borderRadius: 14,
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
