import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, Avatar, List, Divider, useTheme, Card, Title, Paragraph, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../../services/authService';
import { treatmentService } from '../../services/treatmentService';
import { COLORS } from '../../constants';
import { CustomButton } from '../../components/CustomButton';

export const PatientProfileScreen = ({ navigation, user: initialUser }) => {
    const [user, setUser] = useState(initialUser);
    const [patientData, setPatientData] = useState(initialUser);
    const [treatments, setTreatments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            let currentUserId = user?.id || initialUser?.id;

            if (!currentUserId) {
                const { data: currentUser } = await authService.getCurrentUser();
                if (currentUser) {
                    setUser(currentUser);
                    setPatientData(currentUser);
                    currentUserId = currentUser.id;
                }
            } else if (!user && initialUser) {
                setUser(initialUser);
                setPatientData(initialUser);
            }

            if (currentUserId) {
                // Fetch treatment history
                const { data: history } = await treatmentService.getPatientTreatments(currentUserId);
                setTreatments(history || []);
            }
        } catch (error) {
            console.error('Error loading profile data:', error);
            Alert.alert('Error', 'No se pudo cargar la información del perfil.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            'Cerrar Sesión',
            '¿Estás seguro de que deseas cerrar sesión?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Cerrar Sesión',
                    onPress: async () => {
                        await authService.signOut();
                        // Navigation is handled in App.js by the auth listener
                    },
                    style: 'destructive'
                }
            ]
        );
    };

    const renderInfoItem = (label, value, icon) => (
        <List.Item
            title={label}
            description={value || 'No especificado'}
            left={props => <Ionicons {...props} name={icon} size={24} color={COLORS.primary} />}
            titleStyle={styles.infoLabel}
            descriptionStyle={styles.infoValue}
        />
    );

    if (loading && !patientData) {
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
                        <Text style={styles.headerTitle}>Mi Perfil</Text>
                    </View>
                    <TouchableOpacity onPress={handleLogout} style={styles.logoutIconBtn}>
                        <Ionicons name="log-out-outline" size={22} color={COLORS.error} />
                    </TouchableOpacity>
                </View>

                <View style={styles.profileSummary}>
                    <Avatar.Text
                        size={80}
                        label={user?.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U'}
                        backgroundColor={COLORS.primary}
                        labelStyle={{ fontWeight: '800' }}
                    />
                    <Text style={styles.userNameText}>{user?.name}</Text>
                    <View style={styles.emailBadge}>
                        <Ionicons name="mail-outline" size={14} color={COLORS.textSecondary} />
                        <Text style={styles.userEmailText}>{user?.email}</Text>
                    </View>
                </View>
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Información Personal</Text>
                    <View style={styles.infoCard}>
                        <View style={styles.infoRow}>
                            <View style={styles.infoIconBox}>
                                <Ionicons name="call-outline" size={20} color={COLORS.primary} />
                            </View>
                            <View style={styles.infoTextContainer}>
                                <Text style={styles.infoLabel}>Teléfono</Text>
                                <Text style={styles.infoValue}>{patientData?.phone || 'No registrado'}</Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.infoRow}>
                            <View style={styles.infoIconBox}>
                                <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                            </View>
                            <View style={styles.infoTextContainer}>
                                <Text style={styles.infoLabel}>Edad</Text>
                                <Text style={styles.infoValue}>{patientData?.age ? `${patientData.age} años` : 'No especificada'}</Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.infoRow}>
                            <View style={styles.infoIconBox}>
                                <Ionicons name="gift-outline" size={20} color={COLORS.primary} />
                            </View>
                            <View style={styles.infoTextContainer}>
                                <Text style={styles.infoLabel}>Fecha de Nacimiento</Text>
                                <Text style={styles.infoValue}>{patientData?.birth_date || 'No especificada'}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Condición Médica</Text>
                    <View style={styles.medicalAlerts}>
                        <View style={[styles.medicalBox, { borderLeftColor: COLORS.error }]}>
                            <View style={styles.medicalHeader}>
                                <Ionicons name="warning-outline" size={18} color={COLORS.error} />
                                <Text style={[styles.medicalLabel, { color: COLORS.error }]}>ALERGIAS</Text>
                            </View>
                            <Text style={styles.medicalValue}>{patientData?.allergies || 'Ninguna reportada'}</Text>
                        </View>

                        <View style={[styles.medicalBox, { borderLeftColor: COLORS.warning }]}>
                            <View style={styles.medicalHeader}>
                                <Ionicons name="medkit-outline" size={18} color={COLORS.warning} />
                                <Text style={[styles.medicalLabel, { color: COLORS.warning }]}>MEDICAMENTOS</Text>
                            </View>
                            <Text style={styles.medicalValue}>{patientData?.medications || 'Ninguno reportado'}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Historial de Tratamientos</Text>
                    {!Array.isArray(treatments) || treatments.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="document-text-outline" size={40} color={COLORS.border} />
                            <Text style={styles.emptyText}>Sin tratamientos registrados aún</Text>
                        </View>
                    ) : (
                        treatments.map((t) => (
                            <View key={t.id} style={styles.treatmentCard}>
                                <View style={styles.treatmentHeader}>
                                    <View style={styles.typeBadge}>
                                        <Text style={styles.typeBadgeText}>{t.treatment_type}</Text>
                                    </View>
                                    <Text style={styles.treatmentDateText}>
                                        {new Date(t.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                    </Text>
                                </View>
                                {t.notes && <Text style={styles.treatmentNotes}>{t.notes}</Text>}
                                {t.tooth_numbers && t.tooth_numbers.length > 0 && (
                                    <View style={styles.toothTags}>
                                        {t.tooth_numbers.map(num => (
                                            <View key={num} style={styles.toothTag}>
                                                <Text style={styles.toothTagText}>Pieza {num}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        ))
                    )}
                </View>

                <View style={styles.actionSection}>
                    <CustomButton
                        title="Cerrar Sesión"
                        onPress={handleLogout}
                        variant="danger"
                        style={styles.logoutBtn}
                        icon="log-out-outline"
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
    logoutIconBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.error + '10',
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileSummary: {
        alignItems: 'center',
        paddingBottom: 30,
    },
    userNameText: {
        fontSize: 22,
        fontWeight: '900',
        color: COLORS.text,
        marginTop: 15,
        marginBottom: 5,
    },
    emailBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 6,
    },
    userEmailText: {
        fontSize: 13,
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
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.text,
        marginBottom: 15,
    },
    infoCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 25,
        padding: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    infoIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: COLORS.primary + '10',
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoTextContainer: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontWeight: '600',
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 15,
        color: COLORS.text,
        fontWeight: '700',
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: 15,
        marginLeft: 55,
    },
    medicalAlerts: {
        gap: 12,
    },
    medicalBox: {
        backgroundColor: COLORS.surface,
        borderRadius: 18,
        padding: 16,
        borderLeftWidth: 6,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    medicalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
    },
    medicalLabel: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1,
    },
    medicalValue: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.text,
    },
    treatmentCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        padding: 16,
        marginBottom: 15,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    treatmentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    typeBadge: {
        backgroundColor: COLORS.primary + '10',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
    },
    typeBadgeText: {
        fontSize: 12,
        fontWeight: '800',
        color: COLORS.primary,
    },
    treatmentDateText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    treatmentNotes: {
        fontSize: 14,
        color: COLORS.text,
        lineHeight: 20,
        marginBottom: 12,
    },
    toothTags: {
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
    actionSection: {
        paddingHorizontal: 20,
        marginTop: 10,
    },
    logoutBtn: {
        height: 56,
        borderRadius: 18,
    },
    footerSpacer: {
        height: 40,
    },
});
