import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, FlatList, TouchableOpacity } from 'react-native';
import { Text, Title, Paragraph, Card, Avatar, Divider, List, useTheme, Badge, FAB, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../supabase.config';
import { treatmentService } from '../../services/treatmentService';
import { COLORS, TOOTH_CONDITIONS } from '../../constants';
import { CustomButton } from '../../components/CustomButton';
import { WhatsAppButton } from '../../components/WhatsAppButton';

export const PatientDetailScreen = ({ route, navigation }) => {
    const { patientId, appointmentId } = route.params;
    const [patient, setPatient] = useState(null);
    const [appointment, setAppointment] = useState(null);
    const [treatments, setTreatments] = useState([]);
    const [prescriptions, setPrescriptions] = useState([]);
    const [dentalChart, setDentalChart] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);

    useEffect(() => {
        loadPatientData();
    }, [patientId]);

    const loadPatientData = async () => {
        try {
            setLoading(true);

            // Fetch patient user data
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', patientId)
                .maybeSingle();

            if (userError) throw userError;
            if (!userData) {
                Alert.alert('Error', 'No se encontró la información del paciente.');
                navigation.goBack();
                return;
            }
            setPatient(userData);

            // Fetch treatments
            const treatmentHistory = await treatmentService.getPatientTreatments(patientId);
            setTreatments(treatmentHistory.data || []);

            // Fetch specific appointment if ID is provided
            if (appointmentId) {
                const { data: apptData } = await supabase
                    .from('appointments')
                    .select('*')
                    .eq('id', appointmentId)
                    .maybeSingle();
                setAppointment(apptData);
            }

            // Fetch dental chart
            const { data: chartData, error: chartError } = await treatmentService.getDentalChart(patientId);
            if (chartError) throw chartError;
            setDentalChart(chartData || []);

            // Fetch prescriptions
            loadPrescriptions();

        } catch (error) {
            console.error('Error loading patient detail:', error);
            Alert.alert('Error', 'No se pudo cargar la información del paciente.');
        } finally {
            setLoading(false);
        }
    };

    const loadPrescriptions = async () => {
        try {
            setLoadingPrescriptions(true);
            const { data } = await treatmentService.getPatientPrescriptions(patientId);
            setPrescriptions(data || []);
        } catch (error) {
            console.error('Error loading prescriptions:', error);
        } finally {
            setLoadingPrescriptions(false);
        }
    };

    const handleToothPress = (toothNum) => {
        Alert.alert(
            `Pieza Dental ${toothNum}`,
            '¿Desea iniciar un tratamiento para esta pieza?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Nuevo Tratamiento',
                    onPress: () => navigation.navigate('AddTreatment', {
                        patientId,
                        appointmentId,
                        preSelectedTooth: toothNum
                    })
                }
            ]
        );
    };

    const renderToothChart = () => {
        const teeth = Array.from({ length: 32 }, (_, i) => i + 1);

        return (
            <View style={styles.chartContainer}>
                {teeth.map(toothNum => {
                    const condition = dentalChart.find(t => t.tooth_number === toothNum)?.condition;
                    return (
                        <TouchableOpacity
                            key={toothNum}
                            style={styles.toothItem}
                            onPress={() => handleToothPress(toothNum)}
                        >
                            <View style={[
                                styles.toothIcon,
                                {
                                    backgroundColor: condition === 'healthy' || !condition ? COLORS.background :
                                        condition === 'missing' ? COLORS.error + '20' :
                                            COLORS.warning + '20',
                                    borderColor: condition ? COLORS.primary : COLORS.border
                                }
                            ]}>
                                <Text style={styles.toothNumber}>{toothNum}</Text>
                            </View>
                            {condition && condition !== 'healthy' && (
                                <Text style={styles.conditionText} numberOfLines={1}>
                                    {condition}
                                </Text>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>
        );
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
                        <Text style={styles.headerTitle}>Detalle del Paciente</Text>
                    </View>
                    <View style={{ width: 44 }} />
                </View>

                <View style={styles.profileSection}>
                    <Avatar.Text
                        size={80}
                        label={patient?.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        backgroundColor={COLORS.primary}
                        labelStyle={{ fontWeight: '800' }}
                    />
                    <View style={styles.profileInfo}>
                        <Text style={styles.patientNameText}>{patient?.name}</Text>
                        <View style={styles.chipRow}>
                            <View style={styles.infoChip}>
                                <Text style={styles.chipText}>{patient?.age || '?'} años</Text>
                            </View>
                            {patient?.phone && (
                                <View style={styles.infoChip}>
                                    <Ionicons name="call-outline" size={10} color={COLORS.textSecondary} />
                                    <Text style={styles.chipText}>{patient.phone}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>

                <View style={styles.headerActionRow}>
                    <WhatsAppButton
                        phoneNumber={patient?.phone}
                        patientName={patient?.name}
                        variant="primary"
                        style={styles.headerActionBtn}
                    />
                    <CustomButton
                        title="Atender"
                        onPress={() => navigation.navigate('AddTreatment', { patientId, appointmentId })}
                        style={styles.headerActionBtn}
                        icon="medical"
                    />
                </View>
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {appointment?.reason && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Motivo de Consulta</Text>
                        <View style={styles.reasonCard}>
                            <Ionicons name="chatbubble-ellipses-outline" size={24} color={COLORS.primary} />
                            <Text style={styles.reasonValueText}>{appointment.reason}</Text>
                        </View>
                    </View>
                )}

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Alertas Médicas</Text>
                    <View style={styles.alertsContainer}>
                        <View style={[styles.alertBox, { borderLeftColor: COLORS.error }]}>
                            <View style={styles.alertHeader}>
                                <Ionicons name="warning" size={18} color={COLORS.error} />
                                <Text style={[styles.alertLabel, { color: COLORS.error }]}>ALERGIAS</Text>
                            </View>
                            <Text style={styles.alertValueText}>{patient?.allergies || 'Ninguna reportada'}</Text>
                        </View>

                        <View style={[styles.alertBox, { borderLeftColor: COLORS.warning }]}>
                            <View style={styles.alertHeader}>
                                <Ionicons name="medkit" size={18} color={COLORS.warning} />
                                <Text style={[styles.alertLabel, { color: COLORS.warning }]}>MEDICAMENTOS</Text>
                            </View>
                            <Text style={styles.alertValueText}>{patient?.medications || 'Ninguno reportado'}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Odontograma</Text>
                    <View style={styles.chartCard}>
                        {renderToothChart()}
                        <View style={styles.chartLegend}>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendColor, { backgroundColor: COLORS.warning }]} />
                                <Text style={styles.legendText}>Con Hallazgo</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendColor, { backgroundColor: COLORS.background }]} />
                                <Text style={styles.legendText}>Sano/Normal</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>Historial Clínico</Text>
                        <TouchableOpacity
                            style={styles.addTextContainer}
                            onPress={() => navigation.navigate('AddTreatment', { patientId, appointmentId })}
                        >
                            <Ionicons name="add-circle" size={20} color={COLORS.primary} />
                            <Text style={styles.addText}>Nuevo</Text>
                        </TouchableOpacity>
                    </View>

                    {(!treatments || treatments.length === 0) ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="documents-outline" size={40} color={COLORS.border} />
                            <Text style={styles.emptyText}>No hay tratamientos registrados</Text>
                        </View>
                    ) : (
                        treatments.map((t) => (
                            <View key={t.id} style={styles.historyCardContainer}>
                                <View style={styles.historyCard}>
                                    <View style={styles.historyCardHeader}>
                                        <View style={styles.treatmentTypeBadge}>
                                            <Text style={styles.treatmentTypeText}>{t.treatment_type}</Text>
                                        </View>
                                        <Text style={styles.historyDateText}>
                                            {new Date(t.treatment_date || t.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                        </Text>
                                    </View>
                                    <Text style={styles.historyNotesText}>{t.notes}</Text>
                                    {t.affected_teeth && t.affected_teeth.length > 0 && (
                                        <View style={styles.toothTagGroup}>
                                            {t.affected_teeth.map(tooth => (
                                                <View key={tooth} style={styles.toothTag}>
                                                    <Text style={styles.toothTagText}>D{tooth}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            </View>
                        ))
                    )}
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>Recetas</Text>
                        <TouchableOpacity
                            style={styles.addTextContainer}
                            onPress={() => navigation.navigate('AddPrescription', { patientId, appointmentId })}
                        >
                            <Ionicons name="add-circle" size={20} color={COLORS.primary} />
                            <Text style={styles.addText}>Crear</Text>
                        </TouchableOpacity>
                    </View>
                    {loadingPrescriptions ? (
                        <ActivityIndicator color={COLORS.primary} style={{ margin: 20 }} />
                    ) : (!prescriptions || prescriptions.length === 0) ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="document-text-outline" size={40} color={COLORS.border} />
                            <Text style={styles.emptyText}>No hay recetas registradas</Text>
                        </View>
                    ) : (
                        prescriptions.map((p) => (
                            <View key={p.id} style={styles.historyCardContainer}>
                                <View style={styles.historyCard}>
                                    <View style={styles.historyCardHeader}>
                                        <Text style={styles.historyDateText}>
                                            {new Date(p.created_at).toLocaleDateString()}
                                        </Text>
                                        <Badge style={{ backgroundColor: COLORS.success }}>Válida</Badge>
                                    </View>
                                    {p.medications.map((med, idx) => (
                                        <View key={idx} style={styles.medicationRow}>
                                            <Ionicons name="medical" size={14} color={COLORS.primary} />
                                            <Text style={styles.medicationName}>{med.name}</Text>
                                            <Text style={styles.medicationDose}>- {med.dose}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        ))
                    )}
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
        marginBottom: 20,
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
    profileSection: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 25,
        marginBottom: 25,
        gap: 20,
    },
    profileInfo: {
        flex: 1,
    },
    patientNameText: {
        fontSize: 22,
        fontWeight: '900',
        color: COLORS.text,
        marginBottom: 8,
    },
    chipRow: {
        flexDirection: 'row',
        gap: 8,
    },
    infoChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
        gap: 5,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    chipText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    headerActionRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingBottom: 25,
        gap: 12,
    },
    headerActionBtn: {
        flex: 1,
        height: 48,
        borderRadius: 16,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 20,
    },
    section: {
        paddingHorizontal: 20,
        marginBottom: 30,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.text,
        marginBottom: 15,
    },
    reasonCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary + '08',
        padding: 15,
        borderRadius: 20,
        gap: 15,
        borderWidth: 1,
        borderColor: COLORS.primary + '20',
    },
    reasonValueText: {
        fontSize: 15,
        color: COLORS.primary,
        fontWeight: '600',
        flex: 1,
        lineHeight: 22,
    },
    alertsContainer: {
        gap: 15,
    },
    alertBox: {
        backgroundColor: COLORS.surface,
        borderRadius: 15,
        padding: 15,
        borderLeftWidth: 6,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    alertHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    alertLabel: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1,
    },
    alertValueText: {
        fontSize: 15,
        color: COLORS.text,
        fontWeight: '600',
    },
    chartCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 25,
        padding: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.08,
        shadowRadius: 15,
    },
    chartContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 8,
    },
    toothItem: {
        width: '10%',
        alignItems: 'center',
        marginBottom: 10,
    },
    toothIcon: {
        width: 30,
        height: 30,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: COLORS.border,
    },
    toothNumber: {
        fontSize: 12,
        fontWeight: '800',
        color: COLORS.text,
    },
    conditionText: {
        fontSize: 8,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    chartLegend: {
        flexDirection: 'row',
        marginTop: 15,
        gap: 20,
        justifyContent: 'center',
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendColor: {
        width: 12,
        height: 12,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    legendText: {
        fontSize: 11,
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    addTextContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    addText: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: '700',
    },
    historyCardContainer: {
        marginBottom: 15,
    },
    historyCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        padding: 16,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    historyCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    treatmentTypeBadge: {
        backgroundColor: COLORS.primary + '10',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
    },
    treatmentTypeText: {
        fontSize: 12,
        fontWeight: '800',
        color: COLORS.primary,
    },
    historyDateText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    historyNotesText: {
        fontSize: 14,
        color: COLORS.text,
        lineHeight: 20,
        marginBottom: 12,
    },
    toothTagGroup: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    toothTag: {
        backgroundColor: COLORS.background,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    toothTagText: {
        fontSize: 10,
        fontWeight: '700',
        color: COLORS.textSecondary,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 30,
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        borderStyle: 'dashed',
        borderWidth: 2,
        borderColor: COLORS.border,
    },
    emptyText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: 10,
        fontWeight: '500',
    },
    recipeBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        padding: 15,
        borderRadius: 15,
        gap: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    recipeBannerText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    medicationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    medicationName: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.text,
    },
    medicationDose: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    footerSpacer: {
        height: 60,
    },
});
