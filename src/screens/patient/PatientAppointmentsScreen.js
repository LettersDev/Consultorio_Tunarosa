import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { Text, Card, Title, Paragraph, Badge, useTheme, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { appointmentService } from '../../services/appointmentService';
import { authService } from '../../services/authService';
import { COLORS, APPOINTMENT_STATUS } from '../../constants';
import { CustomButton } from '../../components/CustomButton';

export const PatientAppointmentsScreen = ({ navigation, user }) => {
    const theme = useTheme();
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadAppointments = useCallback(async () => {
        try {
            const currentUserId = user?.id;
            if (currentUserId) {
                const { data, error } = await appointmentService.getPatientAppointments(currentUserId);
                if (error) throw error;
                // Sort by date and time
                const sorted = (data || []).sort((a, b) => b.date.localeCompare(a.date) || (b.time || '').localeCompare(a.time || ''));
                setAppointments(sorted);
            }
        } catch (error) {
            console.error('Error loading appointments:', error);
            Alert.alert('Error', 'No se pudieron cargar las citas.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadAppointments();
    }, [loadAppointments]);

    const onRefresh = () => {
        setRefreshing(true);
        loadAppointments();
    };

    const getStatusColor = (status) => {
        switch (status) {
            case APPOINTMENT_STATUS.PENDING: return COLORS.warning;
            case APPOINTMENT_STATUS.CONFIRMED: return COLORS.success;
            case APPOINTMENT_STATUS.COMPLETED: return COLORS.primary;
            case APPOINTMENT_STATUS.CANCELLED: return COLORS.error;
            case APPOINTMENT_STATUS.RESCHEDULED: return COLORS.secondary;
            default: return COLORS.textSecondary;
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case APPOINTMENT_STATUS.PENDING: return 'Pendiente';
            case APPOINTMENT_STATUS.CONFIRMED: return 'Confirmada';
            case APPOINTMENT_STATUS.COMPLETED: return 'Completada';
            case APPOINTMENT_STATUS.CANCELLED: return 'Cancelada';
            case APPOINTMENT_STATUS.RESCHEDULED: return 'Reprogramada';
            default: return status;
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
                            const { data: currentUser } = await authService.getCurrentUser();
                            const { error } = await appointmentService.cancelAppointment(
                                appointmentId,
                                currentUser?.id || 'patient',
                                'Cancelada por el paciente'
                            );
                            if (error) throw error;
                            Alert.alert('Éxito', 'Cita cancelada correctamente');
                            loadAppointments();
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

    const renderAppointmentItem = ({ item }) => (
        <Card style={styles.card}>
            <Card.Content>
                <View style={styles.cardHeader}>
                    <Title style={styles.doctorName}>Dr. {item.doctor?.name || 'Desconocido'}</Title>
                    <Badge style={[styles.badge, { backgroundColor: getStatusColor(item.status) }]}>
                        {getStatusLabel(item.status)}
                    </Badge>
                </View>

                <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
                    <Paragraph style={styles.infoText}>
                        {new Date(item.date + 'T12:00:00').toLocaleDateString('es-ES', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </Paragraph>
                </View>

                <View style={styles.infoRow}>
                    <Ionicons name="time-outline" size={18} color={COLORS.primary} />
                    <Paragraph style={styles.infoText}>{(item.time || '').substring(0, 5)}</Paragraph>
                </View>

                {item.reason && (
                    <View style={styles.infoRow}>
                        <Ionicons name="chatbubble-outline" size={18} color={COLORS.primary} />
                        <Paragraph style={styles.infoText}>{item.reason}</Paragraph>
                    </View>
                )}
            </Card.Content>
            {item.status !== APPOINTMENT_STATUS.CANCELLED && item.status !== APPOINTMENT_STATUS.COMPLETED && (
                <Card.Actions>
                    <CustomButton
                        title="Cancelar"
                        onPress={() => handleCancel(item.id)}
                        variant="outline"
                        style={[styles.actionButton, { borderColor: COLORS.error }]}
                        textStyle={{ color: COLORS.error }}
                    />
                </Card.Actions>
            )}
        </Card>
    );

    if (loading && appointments.length === 0) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Mis Citas</Text>
            </View>

            {appointments.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="calendar-outline" size={80} color={COLORS.textSecondary} />
                    <Text style={styles.emptyText}>No tienes citas programadas.</Text>
                    <CustomButton
                        title="Agendar Cita"
                        onPress={() => navigation.navigate('BookAppointment')}
                        style={styles.bookButton}
                    />
                </View>
            ) : (
                <FlatList
                    data={appointments}
                    renderItem={renderAppointmentItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                />
            )}
        </View>
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
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        paddingTop: 60,
        backgroundColor: COLORS.white,
    },
    backButton: {
        marginRight: 15,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    listContent: {
        padding: 15,
    },
    card: {
        marginBottom: 15,
        borderRadius: 12,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    doctorName: {
        fontSize: 18,
        color: COLORS.text,
    },
    badge: {
        color: COLORS.white,
        paddingHorizontal: 10,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    infoText: {
        marginLeft: 10,
        color: COLORS.textSecondary,
    },
    actionButton: {
        marginTop: 5,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: 18,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginTop: 20,
        marginBottom: 30,
    },
    bookButton: {
        width: '100%',
    },
});
