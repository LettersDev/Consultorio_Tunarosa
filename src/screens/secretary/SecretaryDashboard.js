import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../../services/authService';
import { appointmentService } from '../../services/appointmentService';
import { CustomButton } from '../../components/CustomButton';
import { COLORS } from '../../constants';

export const SecretaryDashboard = ({ navigation }) => {
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
            const { data: appointmentsData } = await appointmentService.getAllAppointments();
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
        const today = new Date().toISOString().split('T')[0];
        return appointments.filter(apt => apt.date === today);
    };

    const getPendingConfirmations = () => {
        return appointments.filter(apt => !apt.confirmed && apt.status === 'pending');
    };

    const getStats = () => {
        const today = getTodayAppointments();
        const pending = getPendingConfirmations();
        const cancelled = appointments.filter(apt => apt.status === 'cancelled');

        return {
            today: today.length,
            pending: pending.length,
            cancelled: cancelled.length,
            total: appointments.length,
        };
    };

    const stats = getStats();
    const todayAppointments = getTodayAppointments();

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
                        <Text style={styles.greeting}>Panel de Control,</Text>
                        <Text style={styles.userName}>{user?.name}</Text>
                    </View>
                    <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                        <Ionicons name="log-out-outline" size={24} color={COLORS.error} />
                    </TouchableOpacity>
                </View>
                <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <View style={[styles.statIconContainer, { backgroundColor: COLORS.primary + '15' }]}>
                            <Ionicons name="calendar" size={20} color={COLORS.primary} />
                        </View>
                        <View>
                            <Text style={styles.statNumber}>{stats.today}</Text>
                            <Text style={styles.statLabel}>Hoy</Text>
                        </View>
                    </View>
                    <View style={styles.statCard}>
                        <View style={[styles.statIconContainer, { backgroundColor: COLORS.warning + '15' }]}>
                            <Ionicons name="time" size={20} color={COLORS.warning} />
                        </View>
                        <View>
                            <Text style={styles.statNumber}>{stats.pending}</Text>
                            <Text style={styles.statLabel}>Pend.</Text>
                        </View>
                    </View>
                    <View style={styles.statCard}>
                        <View style={[styles.statIconContainer, { backgroundColor: COLORS.error + '15' }]}>
                            <Ionicons name="close-circle" size={20} color={COLORS.error} />
                        </View>
                        <View>
                            <Text style={styles.statNumber}>{stats.cancelled}</Text>
                            <Text style={styles.statLabel}>Canc.</Text>
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
                        <Text style={styles.sectionTitle}>Agenda del Día</Text>
                        {todayAppointments.length > 0 && <Badge style={styles.countBadge}>{todayAppointments.length}</Badge>}
                    </View>

                    {todayAppointments.length === 0 ? (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconContainer}>
                                <Ionicons name="calendar-outline" size={48} color={COLORS.border} />
                            </View>
                            <Text style={styles.emptyText}>No hay citas registradas hoy</Text>
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
                                            <View style={[
                                                styles.miniBadge,
                                                { backgroundColor: appointment.status === 'confirmed' ? COLORS.success + '15' : COLORS.warning + '15' }
                                            ]}>
                                                <Text style={[
                                                    styles.miniBadgeText,
                                                    { color: appointment.status === 'confirmed' ? COLORS.success : COLORS.warning }
                                                ]}>
                                                    {appointment.status === 'confirmed' ? 'CONF' : 'PEND'}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={styles.appointmentInfo}>
                                            <Text style={styles.patientName}>{appointment.patient?.name}</Text>
                                            <View style={styles.infoRowSmall}>
                                                <Ionicons name="medical-outline" size={14} color={COLORS.textSecondary} />
                                                <Text style={styles.doctorName}>Dr. {appointment.doctor?.name}</Text>
                                            </View>
                                            <Text style={styles.reasonText} numberOfLines={1}>{appointment.reason}</Text>
                                        </View>

                                        <Ionicons name="chevron-forward" size={20} color={COLORS.border} />
                                    </View>

                                    {appointment.status === 'pending' && (
                                        <View style={styles.dashboardActionRow}>
                                            <CustomButton
                                                title="Confirmar Cita"
                                                onPress={() => handleConfirm(appointment.id)}
                                                style={styles.dashboardActionBtn}
                                                icon="checkmark"
                                            />
                                        </View>
                                    )}
                                </View>
                            </View>
                        ))
                    )}
                </View>

                <View style={styles.quickActions}>
                    <CustomButton
                        title="Nueva Cita"
                        onPress={() => navigation.navigate('AppointmentsOverview')}
                        style={styles.quickActionBtn}
                        icon="add-circle-outline"
                    />
                    <CustomButton
                        title="Ver Todas las Citas"
                        onPress={() => navigation.navigate('AppointmentsOverview')}
                        variant="outline"
                        style={styles.quickActionBtn}
                        icon="list-outline"
                    />
                </View>
                <View style={styles.footerSpacer} />
            </ScrollView>
        </View>
    );
};

// Re-import missing components for the new design
import { Badge, ActivityIndicator } from 'react-native-paper';

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
        gap: 12,
    },
    statCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        padding: 12,
        borderRadius: 18,
        gap: 8,
    },
    statIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
    },
    statLabel: {
        fontSize: 11,
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
    miniBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        marginTop: 4,
    },
    miniBadgeText: {
        fontSize: 8,
        fontWeight: '800',
    },
    appointmentInfo: {
        flex: 1,
    },
    patientName: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 2,
    },
    infoRowSmall: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4,
    },
    doctorName: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    reasonText: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    dashboardActionRow: {
        flexDirection: 'row',
        backgroundColor: COLORS.background,
        padding: 10,
        gap: 10,
    },
    dashboardActionBtn: {
        flex: 1,
        height: 40,
        borderRadius: 12,
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
