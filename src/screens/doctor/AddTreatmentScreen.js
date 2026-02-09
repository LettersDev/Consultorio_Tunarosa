import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, Title, TextInput, IconButton, Checkbox, Card, Divider, Badge } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { treatmentService } from '../../services/treatmentService';
import { appointmentService } from '../../services/appointmentService';
import { supabase } from '../../../supabase.config';
import { COLORS, TREATMENT_TYPES, TOOTH_CONDITIONS, APPOINTMENT_STATUS } from '../../constants';
import { CustomButton } from '../../components/CustomButton';

export const AddTreatmentScreen = ({ route, navigation }) => {
    const { patientId, appointmentId, preSelectedTooth } = route.params;
    const [treatmentType, setTreatmentType] = useState('');
    const [selectedTeeth, setSelectedTeeth] = useState(preSelectedTooth ? [preSelectedTooth] : []);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    const toggleTooth = (toothNum) => {
        if (selectedTeeth.includes(toothNum)) {
            setSelectedTeeth(selectedTeeth.filter(t => t !== toothNum));
        } else {
            setSelectedTeeth([...selectedTeeth, toothNum]);
        }
    };

    const handleSubmit = async () => {
        if (selectedTeeth.length === 0) {
            Alert.alert('Error', 'Por favor selecciona al menos un diente.');
            return;
        }

        try {
            setLoading(true);

            const { data: userData } = await supabase.auth.getUser();
            const treatmentData = {
                patient_id: patientId,
                doctor_id: userData.user.id,
                treatment_type: treatmentType,
                affected_teeth: selectedTeeth,
                notes,
                treatment_date: new Date().toISOString().split('T')[0],
            };

            await treatmentService.addTreatment(treatmentData);

            // If it's an appointment, mark it as completed
            if (appointmentId) {
                await appointmentService.updateAppointmentStatus(appointmentId, APPOINTMENT_STATUS.COMPLETED);
            }

            Alert.alert('Éxito', 'Tratamiento registrado correctamente.', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            console.error('Error adding treatment:', error);
            Alert.alert('Error', 'No se pudo registrar el tratamiento.');
        } finally {
            setLoading(false);
        }
    };

    const renderToothSelector = () => {
        const teeth = Array.from({ length: 32 }, (_, i) => i + 1);
        return (
            <View style={styles.teethGrid}>
                {teeth.map(toothNum => (
                    <TouchableOpacity
                        key={toothNum}
                        style={[
                            styles.toothItem,
                            selectedTeeth.includes(toothNum) && styles.toothSelected
                        ]}
                        onPress={() => toggleTooth(toothNum)}
                    >
                        <Text style={[
                            styles.toothText,
                            selectedTeeth.includes(toothNum) && styles.toothTextSelected
                        ]}>{toothNum}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>Registrar Tratamiento</Text>
                    </View>
                    <View style={{ width: 44 }} />
                </View>
                <View style={styles.headerSummary}>
                    <Ionicons name="medical-outline" size={20} color={COLORS.textSecondary} />
                    <Text style={styles.headerSummaryText}>Nueva entrada en historial clínico</Text>
                </View>
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.section}>
                    <Text style={styles.label}>Tipo de Procedimiento</Text>
                    <TextInput
                        mode="outlined"
                        placeholder="Ej: Limpieza dental, Extracción, Corona, etc."
                        value={treatmentType}
                        onChangeText={setTreatmentType}
                        style={styles.textArea}
                        outlineColor={COLORS.border}
                        activeOutlineColor={COLORS.primary}
                        outlineStyle={{ borderRadius: 16 }}
                    />
                </View>

                <View style={styles.section}>
                    <View style={styles.labelRow}>
                        <Text style={styles.label}>Piezas Dentales</Text>
                        <Badge style={styles.selectionCount}>{selectedTeeth.length}</Badge>
                    </View>
                    <View style={styles.chartContainer}>
                        {renderToothSelector()}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.label}>Notas y Diagnóstico</Text>
                    <TextInput
                        mode="outlined"
                        placeholder="Describa el procedimiento realizado, hallazgos y recomendaciones..."
                        multiline
                        numberOfLines={5}
                        value={notes}
                        onChangeText={setNotes}
                        style={styles.textArea}
                        outlineColor={COLORS.border}
                        activeOutlineColor={COLORS.primary}
                        outlineStyle={{ borderRadius: 16 }}
                    />
                </View>

                <View style={styles.actionSection}>
                    <CustomButton
                        title="Confirmar Registro"
                        onPress={handleSubmit}
                        loading={loading}
                        style={styles.submitButton}
                        icon="save-outline"
                    />
                </View>
                <View style={styles.footerSpacer} />
            </ScrollView >
        </View >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
    headerSummary: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 20,
        gap: 8,
    },
    headerSummaryText: {
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
        paddingHorizontal: 20,
        marginBottom: 25,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    label: {
        fontSize: 15,
        fontWeight: '800',
        color: COLORS.text,
        marginBottom: 15,
    },
    selectionCount: {
        backgroundColor: COLORS.primary,
        color: COLORS.white,
    },
    typeSelector: {
        marginBottom: 5,
    },
    typeSelectorContent: {
        gap: 10,
        paddingRight: 20,
    },
    typeItem: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 18,
        backgroundColor: COLORS.surface,
        borderWidth: 1.5,
        borderColor: COLORS.border,
    },
    typeSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    typeText: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.textSecondary,
    },
    typeTextSelected: {
        color: COLORS.white,
    },
    chartContainer: {
        backgroundColor: COLORS.surface,
        borderRadius: 25,
        padding: 15,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    teethGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 8,
    },
    toothItem: {
        width: '10%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        backgroundColor: COLORS.background,
    },
    toothSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    toothText: {
        fontSize: 12,
        fontWeight: '800',
        color: COLORS.text,
    },
    toothTextSelected: {
        color: COLORS.white,
    },
    textArea: {
        backgroundColor: COLORS.surface,
        fontSize: 15,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    input: {
        backgroundColor: COLORS.surface,
    },
    paymentToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 52,
        borderRadius: 16,
        paddingHorizontal: 15,
        borderWidth: 1.5,
        gap: 8,
        marginBottom: 20,
    },
    paidActive: {
        borderColor: COLORS.success + '40',
        backgroundColor: COLORS.success + '08',
    },
    unpaidActive: {
        borderColor: COLORS.border,
        backgroundColor: COLORS.surface,
    },
    paymentLabel: {
        fontSize: 14,
        fontWeight: '700',
    },
    actionSection: {
        paddingHorizontal: 20,
        marginTop: 10,
    },
    submitButton: {
        borderRadius: 20,
        height: 56,
    },
    footerSpacer: {
        height: 60,
    },
});
