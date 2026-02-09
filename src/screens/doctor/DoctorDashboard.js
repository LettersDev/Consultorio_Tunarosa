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
    Modal,
    Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from 'react-native-paper';
import { authService } from '../../services/authService';
import { appointmentService } from '../../services/appointmentService';
import { WhatsAppButton } from '../../components/WhatsAppButton';
import { CustomButton } from '../../components/CustomButton';
import { supabase } from '../../../supabase.config';
import { COLORS } from '../../constants';

export const DoctorDashboard = ({ navigation, user: initialUser, registerPush }) => {
    const [user, setUser] = useState(initialUser);
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [rescheduleModal, setRescheduleModal] = useState({ visible: false, appointmentId: null });
    const [newDate, setNewDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (user?.id) {
            // Suscribirse a cambios en citas en tiempo real para este doctor
            const subscription = supabase
                .channel(`doctor-apts-${user.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*', // INSERT, UPDATE, DELETE
                        schema: 'public',
                        table: 'appointments',
                        filter: `doctor_id=eq.${user.id}`,
                    },
                    () => {

                        loadData(true); // Carga silenciosa para cambios en tiempo real
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(subscription);
            };
        }
    }, [user?.id]);

    const loadData = async (silent = false) => {
        try {
            if (!silent) setLoading(true);

            // Reutilizar el usuario si ya lo tenemos para ser más rápidos
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
                const { data: appointmentsData } = await appointmentService.getDoctorAppointments(currentUserId);
                setAppointments(appointmentsData || []);
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const handleConfirm = async (appointmentId) => {
        try {
            setLoading(true);
            const { error } = await appointmentService.confirmAppointment(appointmentId);
            if (error) throw error;
            Alert.alert('Éxito', 'Cita confirmada correctamente');
            await loadData(true); // Recarga silenciosa tras acción
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

    const handleCancel = async (appointmentId) => {
        Alert.alert(
            'Cancelar Cita',
            '¿Está seguro que desea cancelar esta cita? Se notificará al paciente.',
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Sí, cancelar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            const { error } = await appointmentService.cancelAppointment(appointmentId, user.id, 'Cancelada por el doctor');
                            if (error) throw error;
                            Alert.alert('Cita Cancelada', 'Se ha notificado al paciente.');
                            await loadData(true); // Recarga silenciosa
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

    const openRescheduleModal = (appointmentId) => {
        setNewDate(new Date());
        setRescheduleModal({ visible: true, appointmentId });
    };

    const confirmReschedule = async () => {
        try {
            setLoading(true);
            const dateStr = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-${String(newDate.getDate()).padStart(2, '0')}`;
            // Find the appointment to get its current time
            const apt = appointments.find(a => a.id === rescheduleModal.appointmentId);
            const { error } = await appointmentService.rescheduleAppointment(
                rescheduleModal.appointmentId,
                dateStr,
                apt?.time || '09:00',
                user.id,
                'Reagendada por el doctor'
            );
            if (error) throw error;
            setRescheduleModal({ visible: false, appointmentId: null });
            Alert.alert('Éxito', 'Cita reagendada. Se ha notificado al paciente.');
            await loadData(true); // Recarga silenciosa
        } catch (error) {
            console.error('Error rescheduling:', error);
            Alert.alert('Error', 'No se pudo reagendar la cita');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const todayAppointments = React.useMemo(() => {
        const d = new Date();
        const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return appointments.filter(apt => apt.date === today && apt.status !== 'cancelled' && apt.status !== 'completed')
            .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    }, [appointments]);

    const upcomingAppointments = React.useMemo(() => {
        const d = new Date();
        const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return appointments.filter(apt => apt.date > today && apt.status !== 'cancelled' && apt.status !== 'completed')
            .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
            .slice(0, 5);
    }, [appointments]);

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
                                                textStyle={[styles.dashboardActionText, { color: COLORS.success }]}
                                            />
                                        )}
                                        <CustomButton
                                            title="Atender"
                                            onPress={() => navigation.navigate('PatientDetail', {
                                                patientId: appointment.patient_id,
                                                appointmentId: appointment.id
                                            })}
                                            style={styles.dashboardActionBtn}
                                            textStyle={styles.dashboardActionText}
                                        />
                                        <CustomButton
                                            title="Reagendar"
                                            onPress={() => openRescheduleModal(appointment.id)}
                                            variant="outline"
                                            style={[styles.dashboardActionBtn, { borderColor: COLORS.warning }]}
                                            textStyle={[styles.dashboardActionText, { color: COLORS.warning }]}
                                        />
                                        <CustomButton
                                            title="Cancelar"
                                            onPress={() => handleCancel(appointment.id)}
                                            variant="outline"
                                            style={[styles.dashboardActionBtn, { borderColor: COLORS.error }]}
                                            textStyle={[styles.dashboardActionText, { color: COLORS.error }]}
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
                            <View key={appointment.id} style={styles.upcomingCard}>
                                <TouchableOpacity
                                    style={styles.upcomingCardContent}
                                    onPress={() => navigation.navigate('PatientDetail', { patientId: appointment.patient_id })}
                                >
                                    <View style={styles.upcomingDate}>
                                        <Text style={styles.upcomingDay}>
                                            {appointment.date.split('-')[2]}
                                        </Text>
                                        <Text style={styles.upcomingMonth}>
                                            {new Date(appointment.date + 'T12:00:00').toLocaleDateString('es-ES', { month: 'short' }).toUpperCase()}
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
                                </TouchableOpacity>
                                <View style={styles.upcomingActions}>
                                    <TouchableOpacity
                                        style={styles.upcomingActionBtn}
                                        onPress={() => openRescheduleModal(appointment.id)}
                                    >
                                        <Ionicons name="calendar-outline" size={18} color={COLORS.warning} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.upcomingActionBtn}
                                        onPress={() => handleCancel(appointment.id)}
                                    >
                                        <Ionicons name="close-circle-outline" size={18} color={COLORS.error} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                <View style={styles.quickActions}>
                    <CustomButton
                        title="Ver Pacientes"
                        onPress={() => navigation.navigate('DoctorPatients')}
                        variant="outline"
                        style={styles.quickActionBtn}
                        icon="people-outline"
                    />
                    <CustomButton
                        title="Calendario"
                        onPress={() => navigation.navigate('ManageAvailability')}
                        style={styles.quickActionBtn}
                        icon="calendar-outline"
                    />
                    {/* El botón de anuncios en su propia fila dentro del wrap */}
                    <View style={{ width: '100%', marginTop: 5 }}>
                        <CustomButton
                            title="Anuncios"
                            onPress={() => navigation.navigate('Shared_Broadcast')}
                            style={styles.fullWidthBtn}
                            variant="secondary"
                            icon="megaphone-outline"
                        />
                    </View>
                </View>
                <View style={styles.footerSpacer} />
            </ScrollView>

            {/* Reschedule Modal */}
            <Modal
                visible={rescheduleModal.visible}
                transparent
                animationType="slide"
                onRequestClose={() => setRescheduleModal({ visible: false, appointmentId: null })}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Reagendar Cita</Text>
                        <Text style={styles.modalSubtitle}>Seleccione la nueva fecha:</Text>

                        <TouchableOpacity
                            style={styles.datePickerButton}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Ionicons name="calendar" size={20} color={COLORS.primary} />
                            <Text style={styles.datePickerText}>
                                {newDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </Text>
                        </TouchableOpacity>

                        {showDatePicker && (
                            <DateTimePicker
                                value={newDate}
                                mode="date"
                                display="default"
                                minimumDate={new Date()}
                                onChange={(event, selectedDate) => {
                                    setShowDatePicker(false);
                                    if (selectedDate) setNewDate(selectedDate);
                                }}
                            />
                        )}

                        <View style={styles.modalActions}>
                            <CustomButton
                                title="Cancelar"
                                onPress={() => setRescheduleModal({ visible: false, appointmentId: null })}
                                variant="outline"
                                style={{ flex: 1, marginRight: 10 }}
                            />
                            <CustomButton
                                title="Confirmar"
                                onPress={confirmReschedule}
                                loading={loading}
                                style={{ flex: 1 }}
                            />
                        </View>
                    </View>
                </View>
            </Modal>
        </View >
    );
};

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
        borderLeftWidth: 0,
        elevation: 6,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.border + '50',
    },
    appointmentMain: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'center',
        gap: 12,
    },
    appointmentTime: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingRight: 12,
        borderRightWidth: 1.5,
        borderRightColor: COLORS.border + '80',
        minWidth: 75,
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
        flexWrap: 'wrap',
        backgroundColor: COLORS.background,
        padding: 10,
        gap: 8,
    },
    dashboardActionBtn: {
        flex: 1,
        minWidth: '45%',
        height: 38,
        borderRadius: 10,
    },
    dashboardActionText: {
        fontSize: 12,
        fontWeight: '700',
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
    upcomingCardContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    upcomingActions: {
        flexDirection: 'row',
        gap: 8,
        marginLeft: 10,
    },
    upcomingActionBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    quickActions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 20,
        gap: 12,
        marginBottom: 20,
        justifyContent: 'space-between',
    },
    quickActionBtn: {
        flex: 1,
        minWidth: '45%',
        borderRadius: 16,
    },
    fullWidthBtn: {
        width: '100%',
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: COLORS.surface,
        borderRadius: 25,
        padding: 25,
        width: '100%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: COLORS.primary,
        marginBottom: 8,
        textAlign: 'center',
    },
    modalSubtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 20,
        textAlign: 'center',
    },
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        padding: 15,
        borderRadius: 15,
        gap: 10,
        marginBottom: 20,
    },
    datePickerText: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.text,
        textTransform: 'capitalize',
    },
    modalActions: {
        flexDirection: 'row',
        marginTop: 10,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 8,
        alignSelf: 'flex-start',
    },
    statusText: {
        fontSize: 10,
        fontWeight: '800',
    }
});
