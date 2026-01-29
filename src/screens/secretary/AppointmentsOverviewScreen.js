import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { Text, Card, Title, Paragraph, Badge, ActivityIndicator, Searchbar, Menu, Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { appointmentService } from '../../services/appointmentService';
import { COLORS, APPOINTMENT_STATUS } from '../../constants';
import { CustomButton } from '../../components/CustomButton';

export const AppointmentsOverviewScreen = ({ navigation }) => {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredAppointments, setFilteredAppointments] = useState([]);

    const loadAppointments = useCallback(async () => {
        try {
            const { data, error } = await appointmentService.getAllAppointments();
            if (error) throw error;
            setAppointments(data || []);
            setFilteredAppointments(data || []);
        } catch (error) {
            console.error('Error loading all appointments:', error);
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

    const onChangeSearch = query => {
        setSearchQuery(query);
        const filtered = appointments.filter(apt =>
            (apt.patient?.name || '').toLowerCase().includes(query.toLowerCase()) ||
            (apt.doctor?.name || '').toLowerCase().includes(query.toLowerCase())
        );
        setFilteredAppointments(filtered);
    };

    const handleCancel = (appointmentId) => {
        Alert.alert(
            'Cancelar Cita',
            '¿Estás seguro de que deseas cancelar esta cita? Esta acción no se puede deshacer.',
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Sí, Cancelar',
                    onPress: async () => {
                        try {
                            const user = (await supabase.auth.getUser()).data.user;
                            await appointmentService.cancelAppointment(appointmentId, user.id, 'Cancelado por secretaria');
                            loadAppointments();
                        } catch (error) {
                            Alert.alert('Error', 'No se pudo cancelar la cita.');
                        }
                    },
                    style: 'destructive'
                }
            ]
        );
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
        <Card style={styles.card}>
            <Card.Content>
                <View style={styles.cardHeader}>
                    <View>
                        <Title style={styles.patientName}>{item.patient?.name || 'Paciente'}</Title>
                        <Text style={styles.doctorName}>Dr. {item.doctor?.name || 'Doctor'}</Text>
                    </View>
                    <Badge style={[styles.badge, { backgroundColor: getStatusColor(item.status) }]}>
                        {String(item.status || 'pending')}
                    </Badge>
                </View>

                <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.infoText}>{new Date(item.date + 'T12:00:00').toLocaleDateString()}</Text>
                    <Ionicons name="time-outline" size={16} color={COLORS.primary} style={{ marginLeft: 15 }} />
                    <Text style={styles.infoText}>{(item.time || '').substring(0, 5)}</Text>
                </View>

                {item.reason && (
                    <View style={styles.infoRow}>
                        <Ionicons name="chatbubble-outline" size={16} color={COLORS.primary} />
                        <Text style={styles.infoText} numberOfLines={1}>{item.reason}</Text>
                    </View>
                )}
            </Card.Content>
            {item.status !== APPOINTMENT_STATUS.CANCELLED && item.status !== APPOINTMENT_STATUS.COMPLETED && (
                <Card.Actions>
                    {!item.confirmed && item.status === 'pending' && (
                        <CustomButton
                            title="Confirmar"
                            onPress={() => handleConfirm(item.id)}
                            style={[styles.actionButton, { backgroundColor: COLORS.success }]}
                        />
                    )}
                    <CustomButton
                        title="Reprogramar"
                        onPress={() => { }} // TODO: Implement reschedule modal or screen
                        variant="outline"
                        style={styles.actionButton}
                    />
                    <CustomButton
                        title="Cancelar"
                        onPress={() => handleCancel(item.id)}
                        variant="outline"
                        style={[styles.actionButton, { borderColor: COLORS.error }]}
                    />
                </Card.Actions>
            )}
        </Card>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Resumen de Citas</Text>
            </View>

            <Searchbar
                placeholder="Buscar por paciente o doctor..."
                onChangeText={onChangeSearch}
                value={searchQuery}
                style={styles.searchBar}
            />

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator animating={true} size="large" color={COLORS.primary} />
                </View>
            ) : (
                <FlatList
                    data={filteredAppointments}
                    renderItem={renderAppointmentItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No se encontraron citas.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
};

// Need supabase for canceling
import { supabase } from '../../../supabase.config';

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
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    searchBar: {
        margin: 15,
        elevation: 0,
        backgroundColor: COLORS.white,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    listContent: {
        padding: 15,
        paddingTop: 0,
    },
    card: {
        marginBottom: 15,
        borderRadius: 12,
        elevation: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    patientName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    doctorName: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    badge: {
        color: COLORS.white,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 5,
    },
    infoText: {
        marginLeft: 8,
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    actionButton: {
        height: 35,
        marginLeft: 8,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: COLORS.textSecondary,
        fontSize: 16,
    },
});
