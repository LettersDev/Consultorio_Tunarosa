import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../supabase.config';
import { appointmentService } from '../../services/appointmentService';
import { authService } from '../../services/authService';
import { CustomButton } from '../../components/CustomButton';
import { CustomInput } from '../../components/CustomInput';
import { COLORS } from '../../constants';

export const BookAppointmentScreen = ({ navigation }) => {
    const [doctors, setDoctors] = useState([]);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [availableSlots, setAvailableSlots] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(true);
    const [booking, setBooking] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (selectedDoctor && date) {
            fetchAvailableSlots();
        }
    }, [selectedDoctor, date]);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            // Parallel fetching
            const [userResult, doctorsResult] = await Promise.all([
                authService.getCurrentUser(),
                supabase.from('users').select('id, name').eq('role', 'doctor')
            ]);

            if (userResult.data) setCurrentUser(userResult.data);
            if (doctorsResult.data) {
                setDoctors(doctorsResult.data);
                if (doctorsResult.data.length > 0) {
                    setSelectedDoctor(doctorsResult.data[0]);
                }
            }
        } catch (error) {
            console.error('Error fetching initial data:', error);
            Alert.alert('Error', 'No se pudieron cargar los datos iniciales.');
        } finally {
            setLoading(false);
        }
    };

    const fetchAvailableSlots = async () => {
        if (!selectedDoctor) return;
        try {
            const d = new Date(date);
            const formattedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const { data, error } = await appointmentService.getAvailableSlots(selectedDoctor.id, formattedDate);

            if (error) throw error;
            setAvailableSlots(data || []);
            setSelectedSlot(null);
        } catch (error) {
            console.error('Error fetching slots:', error);
            Alert.alert('Error', 'No se pudieron cargar los horarios disponibles.');
        }
    };

    const handleDateChange = (selectedDate) => {
        if (selectedDate) {
            setDate(selectedDate);
            setCurrentMonth(selectedDate);
        }
    };

    const changeMonth = (delta) => {
        const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1);
        setCurrentMonth(newMonth);
    };

    const monthDays = React.useMemo(() => {
        const days = [];
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }
        return days;
    }, [currentMonth]);

    const handleBook = async () => {
        if (!selectedSlot) {
            Alert.alert('Error', 'Por favor seleccione un horario.');
            return;
        }
        if (!reason.trim()) {
            Alert.alert('Error', 'Por favor ingrese el motivo de la consulta.');
            return;
        }

        try {
            setBooking(true);
            const d = new Date(date);
            const formattedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const appointmentData = {
                patient_id: currentUser.id,
                doctor_id: selectedDoctor.id,
                date: formattedDate,
                time: selectedSlot.time_slot,
                duration: selectedSlot.duration || 30,
                reason: reason.trim(),
                status: 'pending',
                confirmed: false,
            };

            const { data, error } = await appointmentService.bookAppointment(appointmentData);

            if (error) throw error;

            Alert.alert(
                '¡Éxito!',
                'Su cita ha sido agendada con éxito. La secretaria confirmará su cita pronto.',
                [{ text: 'Ver mis citas', onPress: () => navigation.navigate('Dashboard') }]
            );
        } catch (error) {
            console.error('Error booking appointment:', error);
            Alert.alert('Error', 'No se pudo agendar la cita. Intente de nuevo.');
        } finally {
            setBooking(false);
        }
    };

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
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>Agendar Cita</Text>
                    </View>
                    <View style={{ width: 44 }} />
                </View>
                <View style={styles.headerSubtitle}>
                    <Ionicons name="calendar-outline" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.headerSubtitleText}>Seleccione su horario preferido</Text>
                </View>
            </View>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <View style={styles.section}>
                    <Text style={styles.sectionTitleLabel}>1. Especialista</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.doctorScroll}>
                        {doctors.map((doctor) => (
                            <TouchableOpacity
                                key={doctor.id}
                                style={[
                                    styles.doctorCard,
                                    selectedDoctor?.id === doctor.id && styles.selectedDoctorCard,
                                ]}
                                onPress={() => setSelectedDoctor(doctor)}
                            >
                                <View style={[
                                    styles.doctorAvatarBox,
                                    selectedDoctor?.id === doctor.id && { backgroundColor: COLORS.white + '30' }
                                ]}>
                                    <Ionicons
                                        name="person"
                                        size={24}
                                        color={selectedDoctor?.id === doctor.id ? COLORS.white : COLORS.primary}
                                    />
                                </View>
                                <Text style={[
                                    styles.doctorName,
                                    selectedDoctor?.id === doctor.id && styles.selectedDoctorName,
                                ]}>
                                    {doctor.name}
                                </Text>
                                <Text style={[
                                    styles.doctorRole,
                                    selectedDoctor?.id === doctor.id && { color: COLORS.white + '80' }
                                ]}>
                                    Odontólogo
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <View style={styles.section}>
                    <View style={styles.monthSelectorRow}>
                        <Text style={styles.sectionTitleLabel}>2. Fecha de Consulta</Text>
                        <View style={styles.monthControls}>
                            <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthBtn}>
                                <Ionicons name="chevron-back" size={18} color={COLORS.primary} />
                            </TouchableOpacity>
                            <Text style={styles.monthLabel}>
                                {currentMonth.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
                            </Text>
                            <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthBtn}>
                                <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
                        {monthDays.map((d, index) => {
                            const isSelected = d.toDateString() === date.toDateString();
                            const isPast = d < new Date().setHours(0, 0, 0, 0);

                            return (
                                <TouchableOpacity
                                    key={index}
                                    disabled={isPast}
                                    style={[
                                        styles.dayCard,
                                        isSelected && styles.selectedDayCard,
                                        isPast && styles.pastDayCard
                                    ]}
                                    onPress={() => handleDateChange(d)}
                                >
                                    <Text style={[
                                        styles.dayName,
                                        isSelected && styles.selectedDayText,
                                    ]}>
                                        {d.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase()}
                                    </Text>
                                    <Text style={[
                                        styles.dayNumber,
                                        isSelected && styles.selectedDayText,
                                    ]}>
                                        {d.getDate()}
                                    </Text>
                                    {isSelected && <View style={styles.indicator} />}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitleLabel}>3. Horarios Disponibles</Text>
                    {availableSlots.length === 0 ? (
                        <View style={styles.emptySlotsBox}>
                            <Ionicons name="time-outline" size={30} color={COLORS.border} />
                            <Text style={styles.emptyText}>No hay horarios para este día</Text>
                        </View>
                    ) : (
                        <View style={styles.slotGrid}>
                            {availableSlots.map((slot) => (
                                <TouchableOpacity
                                    key={slot.id}
                                    style={[
                                        styles.slotCard,
                                        selectedSlot?.id === slot.id && styles.selectedSlotCard,
                                    ]}
                                    onPress={() => setSelectedSlot(slot)}
                                >
                                    <Text style={[
                                        styles.slotText,
                                        selectedSlot?.id === slot.id && styles.selectedSlotText,
                                    ]}>
                                        {slot.time_slot.substring(0, 5)}
                                    </Text>
                                    <Text style={[
                                        styles.durationText,
                                        selectedSlot?.id === slot.id && { color: COLORS.white + '90' },
                                    ]}>
                                        {slot.duration} min
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitleLabel}>4. Motivo de Consulta</Text>
                    <View style={styles.reasonCard}>
                        <CustomInput
                            placeholder="Describa brevemente el motivo..."
                            value={reason}
                            onChangeText={setReason}
                            multiline
                            numberOfLines={3}
                            style={styles.reasonInput}
                        />
                    </View>
                </View>

                <View style={styles.actionSection}>
                    <CustomButton
                        title="Confirmar y Agendar"
                        onPress={handleBook}
                        loading={booking}
                        disabled={!selectedSlot || !reason.trim()}
                        style={styles.bookBtn}
                        icon="checkmark-circle-outline"
                    />
                </View>
                <View style={styles.footerSpacer} />
            </ScrollView>
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
        backgroundColor: COLORS.background,
    },
    header: {
        paddingTop: 60,
        backgroundColor: COLORS.surface,
        borderBottomLeftRadius: 35,
        borderBottomRightRadius: 35,
        elevation: 10,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        zIndex: 10,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        marginBottom: 10,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.primary,
    },
    headerSubtitle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 25,
        gap: 6,
    },
    headerSubtitleText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 25,
    },
    section: {
        marginBottom: 30,
    },
    sectionTitleLabel: {
        fontSize: 16,
        fontWeight: '800',
        color: COLORS.text,
        marginLeft: 20,
        marginBottom: 15,
    },
    doctorScroll: {
        paddingLeft: 20,
    },
    doctorCard: {
        backgroundColor: COLORS.surface,
        width: 130,
        padding: 15,
        borderRadius: 20,
        marginRight: 15,
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    selectedDoctorCard: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    doctorAvatarBox: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: COLORS.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    doctorName: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.text,
        textAlign: 'center',
        marginBottom: 2,
    },
    selectedDoctorName: {
        color: COLORS.white,
    },
    doctorRole: {
        fontSize: 11,
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    monthSelectorRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingRight: 20,
        marginBottom: 15,
    },
    monthControls: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    monthBtn: {
        padding: 4,
    },
    monthLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.primary,
        marginHorizontal: 8,
        minWidth: 70,
        textAlign: 'center',
    },
    dateScroll: {
        paddingLeft: 20,
    },
    dayCard: {
        backgroundColor: COLORS.surface,
        width: 65,
        height: 90,
        borderRadius: 20,
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    selectedDayCard: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    dayName: {
        fontSize: 10,
        fontWeight: '800',
        color: COLORS.textSecondary,
        marginBottom: 5,
    },
    dayNumber: {
        fontSize: 20,
        fontWeight: '900',
        color: COLORS.text,
    },
    indicator: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.white,
        marginTop: 6,
    },
    selectedDayText: {
        color: COLORS.white,
    },
    pastDayCard: {
        opacity: 0.3,
        backgroundColor: COLORS.border + '30',
    },
    slotGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 20,
        gap: 12,
    },
    slotCard: {
        backgroundColor: COLORS.surface,
        width: '30%',
        paddingVertical: 12,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: COLORS.border,
    },
    selectedSlotCard: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
        elevation: 5,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    slotText: {
        fontSize: 15,
        fontWeight: '800',
        color: COLORS.text,
    },
    selectedSlotText: {
        color: COLORS.white,
    },
    durationText: {
        fontSize: 11,
        color: COLORS.textSecondary,
        marginTop: 2,
        fontWeight: '600',
    },
    emptySlotsBox: {
        marginHorizontal: 20,
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        padding: 30,
        alignItems: 'center',
        borderStyle: 'dashed',
        borderWidth: 2,
        borderColor: COLORS.border,
    },
    emptyText: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 8,
        fontWeight: '500',
    },
    reasonCard: {
        marginHorizontal: 20,
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        padding: 5,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    reasonInput: {
        borderWidth: 0,
        backgroundColor: 'transparent',
    },
    actionSection: {
        paddingHorizontal: 20,
        marginTop: 10,
    },
    bookBtn: {
        height: 58,
        borderRadius: 18,
    },
    footerSpacer: {
        height: 60,
    },
});
