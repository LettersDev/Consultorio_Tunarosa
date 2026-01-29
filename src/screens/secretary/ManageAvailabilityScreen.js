import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, FlatList } from 'react-native';
import { Text, Title, Card, Divider, ActivityIndicator, List, Badge } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
// import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../../../supabase.config';
import { appointmentService } from '../../services/appointmentService';
import { COLORS } from '../../constants';
import { CustomButton } from '../../components/CustomButton';
import { authService } from '../../services/authService';

export const ManageAvailabilityScreen = ({ navigation }) => {
    const [doctors, setDoctors] = useState([]);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [user, setUser] = useState(null);
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [timeSlots, setTimeSlots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [monthAvailability, setMonthAvailability] = useState([]);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('18:00');

    useEffect(() => {
        fetchDoctors();
    }, []);

    useEffect(() => {
        if (selectedDoctor) {
            fetchMonthAvailability();
            fetchAvailability();
        }
    }, [selectedDoctor, date]);

    useEffect(() => {
        if (selectedDoctor) {
            fetchMonthAvailability();
        }
    }, [currentMonth]);

    const fetchDoctors = async () => {
        try {
            setLoading(true);
            const [{ data: doctorsData, error }, { data: userData }] = await Promise.all([
                supabase.from('users').select('id, name').eq('role', 'doctor'),
                authService.getCurrentUser()
            ]);

            if (error) throw error;
            setDoctors(doctorsData || []);
            setUser(userData);

            if (userData && userData.role === 'doctor') {
                const currentDoc = (doctorsData || []).find(d => d.id === userData.id);
                if (currentDoc) setSelectedDoctor(currentDoc);
                else if (doctorsData?.length > 0) setSelectedDoctor(doctorsData[0]);
            } else if (doctorsData?.length > 0) {
                setSelectedDoctor(doctorsData[0]);
            }
        } catch (error) {
            console.error('Error fetching initial data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAvailability = async () => {
        try {
            const formattedDate = date.getFullYear() + '-' +
                String(date.getMonth() + 1).padStart(2, '0') + '-' +
                String(date.getDate()).padStart(2, '0');

            const { data, error } = await supabase
                .from('availability')
                .select('*')
                .eq('doctor_id', selectedDoctor.id)
                .eq('date', formattedDate);

            if (error) throw error;

            if (data.length === 0) {
                const defaultSlots = generateDefaultSlots();
                setTimeSlots(defaultSlots);
            } else {
                setTimeSlots(data);
            }
        } catch (error) {
            console.error('Error fetching availability:', error);
        }
    };

    const fetchMonthAvailability = async () => {
        try {
            const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
            const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

            const startStr = startOfMonth.toISOString().split('T')[0];
            const endStr = endOfMonth.toISOString().split('T')[0];

            const { data, error } = await supabase
                .from('availability')
                .select('date')
                .eq('doctor_id', selectedDoctor.id)
                .eq('is_available', true)
                .gte('date', startStr)
                .lte('date', endStr);

            if (error) throw error;

            const uniqueDates = [...new Set(data.map(item => item.date))];
            setMonthAvailability(uniqueDates);
        } catch (error) {
            console.error('Error fetching month availability:', error);
        }
    };

    const generateDefaultSlots = () => {
        const slots = [];
        const startHour = 9; // 9 AM
        const endHour = 18; // 6 PM
        const interval = 30; // 30 min

        for (let hour = startHour; hour < endHour; hour++) {
            for (let min = 0; min < 60; min += interval) {
                const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:00`;
                slots.push({
                    doctor_id: selectedDoctor.id,
                    date: date.getFullYear() + '-' +
                        String(date.getMonth() + 1).padStart(2, '0') + '-' +
                        String(date.getDate()).padStart(2, '0'),
                    time_slot: timeStr,
                    is_available: true,
                    is_new: true
                });
            }
        }
        return slots;
    };

    const applyRange = () => {
        const slots = [];
        const [startH, startM] = startTime.split(':').map(Number);
        const [endH, endM] = endTime.split(':').map(Number);

        const dateStr = date.getFullYear() + '-' +
            String(date.getMonth() + 1).padStart(2, '0') + '-' +
            String(date.getDate()).padStart(2, '0');

        let currentH = startH;
        let currentM = startM;

        while (currentH < endH || (currentH === endH && currentM < endM)) {
            const timeStr = `${String(currentH).padStart(2, '0')}:${String(currentM).padStart(2, '0')}:00`;
            slots.push({
                doctor_id: selectedDoctor.id,
                date: dateStr,
                time_slot: timeStr,
                is_available: true
            });

            currentM += 30;
            if (currentM >= 60) {
                currentH += 1;
                currentM = 0;
            }
        }
        setTimeSlots(slots);
    };

    const clearDay = () => {
        setTimeSlots([]);
    };

    const toggleSlot = (index) => {
        const newSlots = [...timeSlots];
        newSlots[index].is_available = !newSlots[index].is_available;
        setTimeSlots(newSlots);
    };

    const saveAvailability = async () => {
        try {
            setSaving(true);
            const { error } = await supabase
                .from('availability')
                .upsert(timeSlots.map(slot => ({
                    doctor_id: slot.doctor_id,
                    date: slot.date,
                    time_slot: slot.time_slot,
                    is_available: slot.is_available
                })), { onConflict: 'doctor_id,date,time_slot' });

            if (error) throw error;
            Alert.alert('Éxito', 'Disponibilidad actualizada correctamente.');
            fetchMonthAvailability();
            fetchAvailability();
        } catch (error) {
            console.error('Error saving availability:', error);
            Alert.alert('Error', 'No se pudo guardar la disponibilidad.');
        } finally {
            setSaving(false);
        }
    };

    const changeMonth = (delta) => {
        const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1);
        setCurrentMonth(newMonth);
    };

    const renderCalendar = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const days = [];
        // Empty slots for days of previous month
        for (let i = 0; i < firstDay; i++) {
            days.push(<View key={`empty-${i}`} style={styles.calendarDayEmpty} />);
        }

        // Actual days
        for (let i = 1; i <= daysInMonth; i++) {
            const d = new Date(year, month, i);
            const dateStr = d.getFullYear() + '-' +
                String(d.getMonth() + 1).padStart(2, '0') + '-' +
                String(d.getDate()).padStart(2, '0');

            const isSelected = date.toDateString() === d.toDateString();
            const hasAvailability = monthAvailability.includes(dateStr);

            days.push(
                <TouchableOpacity
                    key={i}
                    style={[
                        styles.calendarDay,
                        isSelected && styles.calendarDaySelected,
                        hasAvailability && !isSelected && styles.calendarDayHasData
                    ]}
                    onPress={() => setDate(d)}
                >
                    <Text style={[
                        styles.calendarDayText,
                        isSelected && styles.calendarDayTextSelected,
                        hasAvailability && !isSelected && styles.calendarDayTextHasData
                    ]}>{i}</Text>
                    {hasAvailability && <View style={styles.availabilityDot} />}
                </TouchableOpacity>
            );
        }
        return days;
    };

    const setPreset = (type) => {
        let start, end;
        if (type === 'morning') {
            start = '09:00';
            end = '13:00';
        } else if (type === 'afternoon') {
            start = '14:00';
            end = '18:00';
        } else {
            start = '09:00';
            end = '18:00';
        }
        setStartTime(start);
        setEndTime(end);

        // Auto-apply after setting preset
        const slots = [];
        const [startH, startM] = start.split(':').map(Number);
        const [endH, endM] = end.split(':').map(Number);
        const dateStr = date.getFullYear() + '-' +
            String(date.getMonth() + 1).padStart(2, '0') + '-' +
            String(date.getDate()).padStart(2, '0');

        let currentH = startH;
        let currentM = startM;
        while (currentH < endH || (currentH === endH && currentM < endM)) {
            const timeStr = `${String(currentH).padStart(2, '0')}:${String(currentM).padStart(2, '0')}:00`;
            slots.push({
                doctor_id: selectedDoctor.id,
                date: dateStr,
                time_slot: timeStr,
                is_available: true
            });
            currentM += 30;
            if (currentM >= 60) { currentH += 1; currentM = 0; }
        }
        setTimeSlots(slots);
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
                        <Text style={styles.headerTitle}>Gestión de Agenda</Text>
                    </View>
                    <View style={{ width: 44 }} />
                </View>
                <View style={styles.headerSubtitle}>
                    <Ionicons name="calendar" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.headerSubtitleText}>Configura la disponibilidad del consultorio</Text>
                </View>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {user?.role === 'secretary' && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitleLabel}>Seleccionar Especialista</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.doctorScroll}>
                            {doctors.map(doc => (
                                <TouchableOpacity
                                    key={doc.id}
                                    style={[
                                        styles.doctorCard,
                                        selectedDoctor?.id === doc.id && styles.selectedDoctorCard
                                    ]}
                                    onPress={() => setSelectedDoctor(doc)}
                                >
                                    <View style={[
                                        styles.doctorAvatarBox,
                                        selectedDoctor?.id === doc.id && { backgroundColor: COLORS.white + '30' }
                                    ]}>
                                        <Ionicons name="person" size={20} color={selectedDoctor?.id === doc.id ? COLORS.white : COLORS.primary} />
                                    </View>
                                    <View>
                                        <Text style={[styles.doctorName, selectedDoctor?.id === doc.id && styles.selectedDoctorName]}>{doc.name}</Text>
                                        <Text style={[styles.doctorRole, selectedDoctor?.id === doc.id && { color: COLORS.white + '80' }]}>Odontólogo</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                <View style={styles.section}>
                    <View style={styles.calendarCard}>
                        <View style={styles.calendarHeader}>
                            <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navBtn}>
                                <Ionicons name="chevron-back" size={20} color={COLORS.primary} />
                            </TouchableOpacity>
                            <Text style={styles.monthTitle}>
                                {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                            </Text>
                            <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navBtn}>
                                <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.weekDays}>
                            {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map((day, idx) => (
                                <Text key={`day-header-${idx}`} style={styles.weekDayText}>{day}</Text>
                            ))}
                        </View>

                        <View style={styles.calendarGrid}>
                            {renderCalendar()}
                        </View>

                        <View style={styles.legend}>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
                                <Text style={styles.legendText}>Hoy/Sel</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: COLORS.primary + '15' }]} />
                                <Text style={styles.legendText}>Con Agenda</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitleLabel}>Configuración de la Jornada</Text>
                    <View style={styles.actionPanel}>
                        <Text style={styles.panelSubTitle}>Acciones Rápidas</Text>
                        <View style={styles.presetGroup}>
                            <TouchableOpacity style={styles.presetBtn} onPress={() => setPreset('morning')}>
                                <Ionicons name="sunny-outline" size={18} color={COLORS.primary} />
                                <Text style={styles.presetText}>Mañana</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.presetBtn} onPress={() => setPreset('afternoon')}>
                                <Ionicons name="partly-sunny-outline" size={18} color={COLORS.primary} />
                                <Text style={styles.presetText}>Tarde</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.presetBtn} onPress={() => setPreset('all')}>
                                <Ionicons name="time-outline" size={18} color={COLORS.primary} />
                                <Text style={styles.presetText}>Todo el Día</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.customRangeRow}>
                            <View style={styles.timeSelectBox}>
                                <Text style={styles.timeLabel}>Desde</Text>
                                <Text style={styles.timeValue}>{startTime}</Text>
                            </View>
                            <Ionicons name="arrow-forward" size={20} color={COLORS.border} />
                            <View style={styles.timeSelectBox}>
                                <Text style={styles.timeLabel}>Hasta</Text>
                                <Text style={styles.timeValue}>{endTime}</Text>
                            </View>
                        </View>

                        <View style={styles.rangeActions}>
                            <TouchableOpacity style={styles.applyBtn} onPress={applyRange}>
                                <Ionicons name="flash" size={18} color={COLORS.white} />
                                <Text style={styles.applyBtnText}>Activar Rango</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.clearBtn} onPress={clearDay}>
                                <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                                <Text style={styles.clearBtnText}>Limpiar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.slotsHeaderRow}>
                        <Text style={styles.sectionTitleLabel}>Horarios para el {date.getDate()} de {date.toLocaleDateString('es-ES', { month: 'short' })}</Text>
                        <Badge style={styles.slotBadge}>{timeSlots.filter(s => s.is_available).length}</Badge>
                    </View>

                    {timeSlots.length === 0 ? (
                        <View style={styles.emptySlotsCard}>
                            <Ionicons name="notifications-off-outline" size={40} color={COLORS.border} />
                            <Text style={styles.emptySlotsText}>Presiona un preset o activa un rango para comenzar</Text>
                        </View>
                    ) : (
                        <View style={styles.slotsGrid}>
                            {timeSlots.map((slot, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.slotCard,
                                        slot.is_available ? styles.slotCardAvailable : styles.slotCardBlocked
                                    ]}
                                    onPress={() => toggleSlot(index)}
                                >
                                    <Text style={[
                                        styles.slotText,
                                        slot.is_available ? styles.slotTextAvailable : styles.slotTextBlocked
                                    ]}>{slot.time_slot.substring(0, 5)}</Text>
                                    <View style={[styles.statusIndicator, { backgroundColor: slot.is_available ? COLORS.success : COLORS.border }]} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                <View style={styles.footerAction}>
                    <CustomButton
                        title="Guardar Configuración"
                        onPress={saveAvailability}
                        loading={saving}
                        style={styles.saveBtn}
                        icon="cloud-upload-outline"
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
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        padding: 12,
        borderRadius: 20,
        marginRight: 15,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 12,
        minWidth: 160,
    },
    selectedDoctorCard: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    doctorAvatarBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: COLORS.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
    },
    doctorName: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.text,
    },
    selectedDoctorName: {
        color: COLORS.white,
    },
    doctorRole: {
        fontSize: 11,
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    calendarCard: {
        marginHorizontal: 20,
        backgroundColor: COLORS.surface,
        borderRadius: 25,
        padding: 20,
        elevation: 6,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.08,
        shadowRadius: 15,
    },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    navBtn: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    monthTitle: {
        fontSize: 17,
        fontWeight: '900',
        color: COLORS.text,
        textTransform: 'capitalize',
    },
    weekDays: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    weekDayText: {
        width: '14%',
        textAlign: 'center',
        fontSize: 12,
        color: COLORS.textSecondary,
        fontWeight: '800',
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    calendarDay: {
        width: '14.28%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
        marginVertical: 2,
    },
    calendarDayEmpty: {
        width: '14.28%',
        aspectRatio: 1,
    },
    calendarDaySelected: {
        backgroundColor: COLORS.primary,
        elevation: 4,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    calendarDayHasData: {
        backgroundColor: COLORS.primary + '10',
    },
    calendarDayText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
    },
    calendarDayTextSelected: {
        color: COLORS.white,
        fontWeight: '900',
    },
    calendarDayTextHasData: {
        color: COLORS.primary,
        fontWeight: '800',
    },
    availabilityDot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: COLORS.primary,
        position: 'absolute',
        bottom: 6,
    },
    legend: {
        flexDirection: 'row',
        marginTop: 15,
        justifyContent: 'center',
        gap: 15,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        fontSize: 11,
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    actionPanel: {
        marginHorizontal: 20,
        backgroundColor: COLORS.surface,
        borderRadius: 25,
        padding: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    panelSubTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 15,
    },
    presetGroup: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
    },
    presetBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.background,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 6,
    },
    presetText: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.primary,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: 15,
    },
    customRangeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        marginBottom: 20,
    },
    timeSelectBox: {
        alignItems: 'center',
        backgroundColor: COLORS.background,
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 15,
        minWidth: 100,
    },
    timeLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: COLORS.textSecondary,
        marginBottom: 2,
    },
    timeValue: {
        fontSize: 16,
        fontWeight: '900',
        color: COLORS.text,
    },
    rangeActions: {
        flexDirection: 'row',
        gap: 12,
    },
    applyBtn: {
        flex: 2,
        flexDirection: 'row',
        backgroundColor: COLORS.primary,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    applyBtnText: {
        color: COLORS.white,
        fontWeight: '800',
        fontSize: 14,
    },
    clearBtn: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: COLORS.error + '10',
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 4,
    },
    clearBtnText: {
        color: COLORS.error,
        fontWeight: '800',
        fontSize: 13,
    },
    slotsHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingRight: 20,
        marginBottom: 15,
    },
    slotBadge: {
        backgroundColor: COLORS.primary,
        color: COLORS.white,
        fontWeight: '800',
    },
    slotsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 15,
        gap: 10,
    },
    slotCard: {
        width: '30%',
        paddingVertical: 12,
        paddingHorizontal: 5,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        flexDirection: 'row',
        gap: 6,
    },
    slotCardAvailable: {
        backgroundColor: COLORS.surface,
        borderColor: COLORS.primary + '30',
        elevation: 2,
    },
    slotCardBlocked: {
        backgroundColor: COLORS.background,
        borderColor: COLORS.border,
        opacity: 0.6,
    },
    slotText: {
        fontSize: 14,
        fontWeight: '800',
    },
    slotTextAvailable: {
        color: COLORS.text,
    },
    slotTextBlocked: {
        color: COLORS.textSecondary,
    },
    statusIndicator: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    emptySlotsCard: {
        marginHorizontal: 20,
        backgroundColor: COLORS.surface,
        borderRadius: 25,
        padding: 40,
        alignItems: 'center',
        borderStyle: 'dashed',
        borderWidth: 2,
        borderColor: COLORS.border,
    },
    emptySlotsText: {
        fontSize: 13,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginTop: 15,
        lineHeight: 20,
        fontWeight: '500',
    },
    footerAction: {
        paddingHorizontal: 20,
        marginTop: 10,
    },
    saveBtn: {
        height: 56,
        borderRadius: 18,
    },
    footerSpacer: {
        height: 40,
    },
});
