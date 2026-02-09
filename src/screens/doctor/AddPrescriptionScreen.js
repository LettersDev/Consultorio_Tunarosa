import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, Title, TextInput, List, IconButton, Card, Divider, Badge } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { treatmentService } from '../../services/treatmentService';
import { appointmentService } from '../../services/appointmentService';
import { supabase } from '../../../supabase.config';
import { COLORS } from '../../constants';
import { CustomButton } from '../../components/CustomButton';

export const AddPrescriptionScreen = ({ route, navigation }) => {
    const { patientId, appointmentId } = route.params;
    const [medications, setMedications] = useState([]);
    const [currentMed, setCurrentMed] = useState('');
    const [currentDose, setCurrentDose] = useState('');
    const [loading, setLoading] = useState(false);

    const addMedication = () => {
        if (!currentMed || !currentDose) {
            Alert.alert('Error', 'Por favor ingresa el medicamento y la dosis.');
            return;
        }
        setMedications([...medications, { name: currentMed, dose: currentDose }]);
        setCurrentMed('');
        setCurrentDose('');
    };

    const removeMedication = (index) => {
        setMedications(medications.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (medications.length === 0) {
            Alert.alert('Error', 'Por favor agrega al menos un medicamento.');
            return;
        }

        try {
            setLoading(true);

            const { data: userData } = await supabase.auth.getUser();
            const prescriptionData = {
                patient_id: patientId,
                doctor_id: userData.user.id,
                appointment_id: appointmentId || null,
                medications: medications,
                created_at: new Date().toISOString(),
            };

            console.log('Saving prescription:', prescriptionData);
            const result = await treatmentService.addPrescription(prescriptionData);
            console.log('Prescription save result:', result);

            if (result.error) {
                throw result.error;
            }

            // Si hay una cita asociada, marcarla como completada
            if (appointmentId) {
                try {
                    await appointmentService.updateAppointmentStatus(appointmentId, 'completed');
                } catch (updateErr) {
                    console.error('Error al completar cita desde receta:', updateErr);
                }
            }

            Alert.alert('Éxito', 'Receta digital guardada correctamente.', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            console.error('Error adding prescription:', error);
            Alert.alert('Error', `No se pudo guardar la receta: ${error.message || error}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>Emitir Receta Digital</Text>
                    </View>
                    <View style={{ width: 44 }} />
                </View>
                <View style={styles.headerSubtitle}>
                    <Ionicons name="shield-checkmark" size={16} color={COLORS.success} />
                    <Text style={styles.headerSubtitleText}>Documento médico verificado</Text>
                </View>
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.section}>
                    <Text style={styles.sectionTitleLabel}>Nuevo Medicamento</Text>
                    <View style={styles.entryCard}>
                        <TextInput
                            mode="outlined"
                            label="Nombre del Medicamento"
                            placeholder="Eje: Amoxicilina / Paracetamol"
                            value={currentMed}
                            onChangeText={setCurrentMed}
                            style={styles.input}
                            outlineColor={COLORS.border}
                            activeOutlineColor={COLORS.primary}
                            outlineStyle={{ borderRadius: 14 }}
                        />
                        <TextInput
                            mode="outlined"
                            label="Indicaciones / Posología"
                            placeholder="500mg cada 8 horas por 5 días"
                            value={currentDose}
                            onChangeText={setCurrentDose}
                            style={styles.input}
                            outlineColor={COLORS.border}
                            activeOutlineColor={COLORS.primary}
                            outlineStyle={{ borderRadius: 14 }}
                            multiline
                        />
                        <CustomButton
                            title="Agregar a la receta"
                            onPress={addMedication}
                            variant="primary"
                            style={styles.addBtn}
                            icon="add-circle"
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.listHeader}>
                        <Text style={styles.sectionTitleLabel}>Lista de Medicamentos</Text>
                        <Badge style={styles.medBadge}>{medications.length}</Badge>
                    </View>

                    {medications.length === 0 ? (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconCircle}>
                                <Ionicons name="medical-outline" size={40} color={COLORS.border} />
                            </View>
                            <Text style={styles.emptyText}>No has agregado ningún medicamento aún</Text>
                        </View>
                    ) : (
                        medications.map((med, index) => (
                            <View key={index} style={styles.medItemCard}>
                                <View style={styles.medItemInfo}>
                                    <Text style={styles.medNameText}>{med.name}</Text>
                                    <Text style={styles.medDoseText}>{med.dose}</Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => removeMedication(index)}
                                    style={styles.removeBtn}
                                >
                                    <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                </View>

                <View style={styles.actionSection}>
                    <CustomButton
                        title="Finalizar y Guardar Receta"
                        onPress={handleSubmit}
                        loading={loading}
                        disabled={medications.length === 0}
                        style={styles.submitButton}
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
        paddingBottom: 20,
        gap: 6,
    },
    headerSubtitleText: {
        fontSize: 12,
        color: COLORS.success,
        fontWeight: '700',
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 25,
    },
    section: {
        paddingHorizontal: 20,
        marginBottom: 30,
    },
    sectionTitleLabel: {
        fontSize: 15,
        fontWeight: '800',
        color: COLORS.text,
        marginBottom: 15,
    },
    entryCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 25,
        padding: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    input: {
        backgroundColor: COLORS.surface,
        marginBottom: 15,
    },
    addBtn: {
        marginTop: 5,
        borderRadius: 14,
    },
    listHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 15,
    },
    medBadge: {
        backgroundColor: COLORS.primary,
        color: COLORS.white,
    },
    medItemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: 18,
        padding: 16,
        marginBottom: 12,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    medItemInfo: {
        flex: 1,
    },
    medNameText: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 4,
    },
    medDoseText: {
        fontSize: 13,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    removeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.error + '10',
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        backgroundColor: COLORS.surface,
        borderRadius: 25,
        borderStyle: 'dashed',
        borderWidth: 2,
        borderColor: COLORS.border,
    },
    emptyIconCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    emptyText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        fontWeight: '500',
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    actionSection: {
        paddingHorizontal: 20,
        marginTop: 10,
    },
    submitButton: {
        height: 56,
        borderRadius: 18,
    },
    footerSpacer: {
        height: 40,
    },
});
