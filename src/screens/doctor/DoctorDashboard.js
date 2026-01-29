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
import { COLORS } from '../../constants';

export const DoctorDashboard = ({ navigation }) => {
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
            const { data: appointmentsData } = await appointmentService.getDoctorAppointments(userData.id);
            setAppointments(appointmentsData || []);
        }
        setLoading(false);
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const handleConfirm = async (appointmentId) => {
        try {
            setLoading(true);
            const { error } = await appointmentService.confirmAppointment(appointmentId);
            if (error) throw error;
            Alert.alert('Éxito', 'Cita confirmada correctamente');
            await loadData();
        } catch (error) {
            console.error('Error confirming appointment:', error);
            Alert.alert('Error', 'No se pudo confirmar la cita');
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
                    },
                },
            ]
        );
    };

    const getTodayAppointments = () => {
        const d = new Date();
        const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return appointments.filter(apt => apt.date === today && apt.status !== 'cancelled')
            .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    };

    const getUpcomingAppointments = () => {
        const d = new Date();
        const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return appointments.filter(apt => apt.date > today && apt.status !== 'cancelled')
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(0, 5);
    };

    const todayAppointments = getTodayAppointments();
    const upcomingAppointments = getUpcomingAppointments();

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.greeting}>Bienvenido,</Text>
                        <Text style={styles.userName}>Dr. {user?.name}</Text>
                    </View>
                    <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                        <Ionicons name="log-out-outline" size={24} color={COLORS.error} />
                    </TouchableOpacity>
                </View>
                <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <View style={[styles.statIconContainer, { backgroundColor: COLORS.primary + '15' }]}>
                            <Ionicons name="calendar" size={24} color={COLORS.primary} />
                        </View>
                        <View>
                            <Text style={styles.statNumber}>{todayAppointments.length}</Text>
                            <Text style={styles.statLabel}>Citas Hoy</Text>
                        </View>
                    </View>
                    <View style={styles.statCard}>
                        <View style={[styles.statIconContainer, { backgroundColor: COLORS.secondary + '15' }]}>
                            <Ionicons name="time" size={24} color={COLORS.secondary} />
                        </View>
                        <View>
                            <Text style={styles.statNumber}>{upcomingAppointments.length}</Text>
                            <Text style={styles.statLabel}>Próximas</Text>
                        </View>
                    </View>
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
                        <Text style={styles.sectionTitle}>Citas de Hoy</Text>
                        {todayAppointments.length > 0 && <Badge style={styles.countBadge}>{todayAppointments.length}</Badge>}
                    </View>

                    {todayAppointments.length === 0 ? (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconContainer}>
                                <Ionicons name="calendar-outline" size={48} color={COLORS.border} />
                            </View>
                            <Text style={styles.emptyText}>No tienes citas para hoy</Text>
                        </View>
                    ) : (
                        todayAppointments.map((appointment) => (
                            <View key={appointment.id} style={styles.appointmentOuterContainer}>
                                <View style={[
                                    styles.appointmentCard,
                                    { borderLeftColor: appointment.status === 'confirmed' ? COLORS.success : COLORS.warning }
                                ]}>
                                    <View style={styles.appointmentMain}>
                                        <View style={styles.appointmentTime}>
                                            <Text style={styles.timeText}>{appointment.time}</Text>
                                            <Text style={styles.durationText}>{appointment.duration} min</Text>
                                        </View>

                                        <View style={styles.appointmentInfo}>
                                            <Text style={styles.patientName}>{appointment.patient?.name}</Text>
                                            <Text style={styles.reasonText} numberOfLines={1}>{appointment.reason}</Text>

                                            {(appointment.patient?.allergies && appointment.patient.allergies !== 'Ninguna') ||
                                                (appointment.patient?.medications && appointment.patient.medications !== 'Ninguno') ? (
                                                <View style={styles.alertTags}>
                                                    {appointment.patient?.allergies && appointment.patient.allergies !== 'Ninguna' && (
                                                        <View style={[styles.tag, styles.errorTag]}>
                                                            <Ionicons name="alert-circle" size={12} color={COLORS.error} />
                                                            <Text style={styles.tagText}>Alergia</Text>
                                                        </View>
                                                    )}
                                                    {appointment.patient?.medications && appointment.patient.medications !== 'Ninguno' && (
                                                        <View style={[styles.tag, styles.warningTag]}>
                                                            <Ionicons name="medical" size={12} color={COLORS.warning} />
                                                            <Text style={styles.tagText}>Medicación</Text>
                                                        </View>
                                                    )}
                                                </View>
                                            ) : null}
                                        </View>

                                        {appointment.patient?.phone && (
                                            <WhatsAppButton
                                                phoneNumber={appointment.patient.phone}
                                                message={`Hola ${appointment.patient.name}, soy el Dr. ${user?.name}. Me comunico con usted sobre su cita de hoy a las ${appointment.time}.`}
                                                variant="icon-only"
                                            />
                                        )}
                                    </View>

                                    <View style={styles.dashboardActionRow}>
                                        {appointment.status === 'pending' && (
                                            <CustomButton
                                                title="Confirmar"
                                                onPress={() => handleConfirm(appointment.id)}
                                                variant="outline"
                                                style={[styles.dashboardActionBtn, { borderColor: COLORS.success }]}
                                                textStyle={{ color: COLORS.success }}
                                            />
                                        )}
                                        <CustomButton
                                            title="Atender Paciente"
                                            onPress={() => navigation.navigate('PatientDetail', {
                                                patientId: appointment.patient_id,
                                                appointmentId: appointment.id
                                            })}
                                            style={styles.dashboardActionBtn}
                                        />
                                    </View>
                                </View>
                            </View>
                        ))
                    )}
                </View>

                {upcomingAppointments.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Próximas Citas</Text>
                        {upcomingAppointments.map((appointment) => (
                            <TouchableOpacity
                                key={appointment.id}
                                style={styles.upcomingCard}
                                onPress={() => navigation.navigate('PatientDetail', { patientId: appointment.patient_id })}
                            >
                                <View style={styles.upcomingDate}>
                                    <Text style={styles.upcomingDay}>
                                        {new Date(appointment.date).toLocaleDateString('es-ES', { day: 'numeric' })}
                                    </Text>
                                    <Text style={styles.upcomingMonth}>
                                        {new Date(appointment.date).toLocaleDateString('es-ES', { month: 'short' }).toUpperCase()}
                                    </Text>
                                </View>
                                <View style={styles.upcomingInfo}>
                                    <Text style={styles.upcomingName}>{appointment.patient?.name}</Text>
                                    <View style={styles.upcomingDetails}>
                                        <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
                                        <Text style={styles.upcomingTime}>{appointment.time}</Text>
                                        <View style={styles.separator} />
                                        <Text style={styles.upcomingReason} numberOfLines={1}>{appointment.reason}</Text>
                                    </View>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color={COLORS.border} />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                <View style={styles.quickActions}>
                    <CustomButton
                        title="Ver Todos los Pacientes"
                        onPress={() => navigation.navigate('DoctorPatients')}
                        variant="outline"
                        style={styles.quickActionBtn}
                        icon="people-outline"
                    />
                    <CustomButton
                        title="Gestionar Calendario"
                        onPress={() => navigation.navigate('ManageAvailability')}
                        style={styles.quickActionBtn}
                        icon="calendar-outline"
                    />
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
        paddingHorizontal: 20,
        paddingBottom: 25,
        backgroundColor: COLORS.surface,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        elevation: 10,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        zIndex: 10,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 25,
    },
    greeting: {
        fontSize: 14,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    userName: {
        fontSize: 22,
        fontWeight: '800',
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
    statsContainer: {
        flexDirection: 'row',
        gap: 15,
    },
    statCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        padding: 15,
        borderRadius: 20,
        gap: 12,
    },
    statIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.text,
    },
    statLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontWeight: '500',
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
        marginBottom: 15,
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
        marginBottom: 15,
    },
    appointmentCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 24,
        padding: 0,
        borderLeftWidth: 6,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        overflow: 'hidden',
    },
    appointmentMain: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'center',
        gap: 15,
    },
    appointmentTime: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingRight: 15,
        borderRightWidth: 1,
        borderRightColor: COLORS.border,
        minWidth: 70,
    },
    timeText: {
        fontSize: 16,
        fontWeight: '800',
        color: COLORS.primary,
    },
    durationText: {
        fontSize: 11,
        color: COLORS.textSecondary,
        fontWeight: '500',
        marginTop: 2,
    },
    appointmentInfo: {
        flex: 1,
    },
    patientName: {
        fontSize: 17,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 4,
    },
    reasonText: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginBottom: 8,
    },
    alertTags: {
        flexDirection: 'row',
        gap: 8,
    },
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    errorTag: {
        backgroundColor: COLORS.error + '15',
    },
    warningTag: {
        backgroundColor: COLORS.warning + '15',
    },
    tagText: {
        fontSize: 10,
        fontWeight: '700',
        color: COLORS.text,
    },
    dashboardActionRow: {
        flexDirection: 'row',
        backgroundColor: COLORS.background,
        padding: 12,
        gap: 10,
    },
    dashboardActionBtn: {
        flex: 1,
        height: 44,
        borderRadius: 12,
    },
    upcomingCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        padding: 15,
        marginBottom: 10,
        gap: 15,
    },
    upcomingDate: {
        width: 50,
        height: 55,
        backgroundColor: COLORS.primary + '10',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    upcomingDay: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.primary,
    },
    upcomingMonth: {
        fontSize: 10,
        fontWeight: '700',
        color: COLORS.primary,
    },
    upcomingInfo: {
        flex: 1,
    },
    upcomingName: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 4,
    },
    upcomingDetails: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    upcomingTime: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    separator: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.border,
    },
    upcomingReason: {
        fontSize: 12,
        color: COLORS.textSecondary,
        flex: 1,
    },
    quickActions: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 12,
        marginBottom: 20,
    },
    quickActionBtn: {
        flex: 1,
        borderRadius: 16,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        backgroundColor: COLORS.surface,
        borderRadius: 24,
        borderStyle: 'dashed',
        borderWidth: 2,
        borderColor: COLORS.border,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    emptyText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    footerSpacer: {
        height: 40,
    },
});
