import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { Text, Card, Title, Paragraph, Badge, ActivityIndicator, FAB } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { appointmentService } from '../../services/appointmentService';
import { authService } from '../../services/authService';
import { COLORS, APPOINTMENT_STATUS } from '../../constants';
import { CustomButton } from '../../components/CustomButton';
import { WhatsAppButton } from '../../components/WhatsAppButton';

export const DoctorScheduleScreen = ({ navigation }) => {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [doctor, setDoctor] = useState(null);

    const loadAppointments = useCallback(async () => {
        try {
            const { data: user } = await authService.getCurrentUser();
            console.log('DoctorSchedule: Current user id:', user?.id);
            if (user && user.id) {
                setDoctor(user);
                const { data, error } = await appointmentService.getDoctorAppointments(user.id);
                if (error) throw error;
                setAppointments(data || []);
            }
        } catch (error) {
            console.error('Error loading doctor appointments:', error);
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

    const handleConfirm = async (appointmentId) => {
        try {
            setLoading(true);
            const { error } = await appointmentService.confirmAppointment(appointmentId);
            if (error) throw error;
            Alert.alert('Éxito', 'Cita confirmada correctamente');
            loadAppointments();
        } catch (error) {
            console.error('Error confirming appointment:', error);
            Alert.alert('Error', 'No se pudo confirmar la cita');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case APPOINTMENT_STATUS.PENDING: return COLORS.warning;
            case APPOINTMENT_STATUS.CONFIRMED: return COLORS.success;
            case APPOINTMENT_STATUS.COMPLETED: return COLORS.primary;
            case APPOINTMENT_STATUS.CANCELLED: return COLORS.error;
            default: return COLORS.textSecondary;
        }
    };

    const renderAppointmentItem = ({ item }) => (
        <Card style={styles.card} onPress={() => navigation.navigate('PatientDetail', { patientId: item.patient_id })}>
            <Card.Content>
                <View>
                    <Title style={styles.patientName}>{item.patient?.name || 'Paciente'}</Title>
                    <Badge style={[styles.badge, { backgroundColor: getStatusColor(item.status) }]}>
                        {String(item.status || 'pending').toUpperCase()}
                    </Badge>
                </View>

                <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
                    <Paragraph style={styles.infoText}>
                        {new Date(item.date).toLocaleDateString()}
                    </Paragraph>
                    <Ionicons name="time-outline" size={18} color={COLORS.primary} style={{ marginLeft: 15 }} />
                    <Paragraph style={styles.infoText}>{(item.time || '').substring(0, 5)}</Paragraph>
                </View>

                {item.reason && (
                    <View style={styles.infoRow}>
                        <Ionicons name="document-text-outline" size={18} color={COLORS.primary} />
                        <Paragraph style={styles.infoText} numberOfLines={1}>{item.reason}</Paragraph>
                    </View>
                )}
            </Card.Content>
            <Card.Actions>
                {!item.confirmed && item.status === 'pending' && (
                    <CustomButton
                        title="Confirmar"
                        onPress={() => handleConfirm(item.id)}
                        style={[styles.actionButton, { backgroundColor: COLORS.success }]}
                    />
                )}
                <WhatsAppButton
                    phoneNumber={item.patient?.phone}
                    userName={item.patient?.name}
                    variant="icon-only"
                />
                <CustomButton
                    title="Atender"
                    onPress={() => navigation.navigate('PatientDetail', { patientId: item.patient_id, appointmentId: item.id })}
                    style={styles.actionButton}
                />
            </Card.Actions>
        </Card>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Mi Agenda</Text>
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator animating={true} size="large" color={COLORS.primary} />
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
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="calendar-outline" size={80} color={COLORS.textSecondary} />
                            <Text style={styles.emptyText}>No hay citas programadas.</Text>
                            <CustomButton
                                title="Gestionar mi Disponibilidad"
                                onPress={() => navigation.navigate('ManageAvailability')}
                                style={{ marginTop: 20 }}
                            />
                        </View>
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
    patientName: {
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
        marginTop: 5,
    },
    infoText: {
        marginLeft: 8,
        color: COLORS.textSecondary,
    },
    actionButton: {
        marginLeft: 10,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        marginTop: 50,
    },
    emptyText: {
        fontSize: 18,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginTop: 20,
    },
});
