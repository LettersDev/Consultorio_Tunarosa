import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { notificationService } from '../../services/notificationService';
import { CustomButton } from '../../components/CustomButton';
import { CustomInput } from '../../components/CustomInput';
import { COLORS } from '../../constants';

export const BroadcastScreen = ({ navigation }) => {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
        if (!title.trim() || !message.trim()) {
            Alert.alert('Error', 'Por favor completa el título y el mensaje.');
            return;
        }

        Alert.alert(
            'Confirmar Envío Masivo',
            'Este mensaje se enviará a TODOS los pacientes registrados. ¿Deseas continuar?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Sí, enviar a todos',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            const result = await notificationService.sendBroadcastNotification(title, message);

                            if (result.success) {
                                Alert.alert(
                                    '¡Éxito!',
                                    `Mensaje enviado correctamente a ${result.count} pacientes.`,
                                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                                );
                                setTitle('');
                                setMessage('');
                            } else {
                                Alert.alert('Error', result.message || 'No se pudo enviar el mensaje.');
                            }
                        } catch (error) {
                            console.error('Error sending broadcast:', error);
                            Alert.alert('Error', 'Ocurrió un fallo al procesar la difusión.');
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Nueva Difusión</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.introCard}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="megaphone-outline" size={32} color={COLORS.primary} />
                    </View>
                    <View style={styles.introTextContainer}>
                        <Text style={styles.introTitle}>Anuncios y Ofertas</Text>
                        <Text style={styles.introSubtitle}>
                            Redacta un mensaje para que le llegue a todos tus pacientes como notificación push y quede en su historial.
                        </Text>
                    </View>
                </View>

                <View style={styles.form}>
                    <CustomInput
                        label="Título del anuncio"
                        placeholder="Ej: ¡Oferta de Mes! 20% en Blanqueamiento"
                        value={title}
                        onChangeText={setTitle}
                        icon="bookmark-outline"
                    />

                    <CustomInput
                        label="Mensaje"
                        placeholder="Escribe aquí los detalles de la oferta o aviso..."
                        value={message}
                        onChangeText={setMessage}
                        multiline
                        numberOfLines={6}
                        style={styles.textArea}
                        icon="chatbubble-ellipses-outline"
                    />

                    <View style={styles.warningBox}>
                        <Ionicons name="information-circle-outline" size={20} color={COLORS.textSecondary} />
                        <Text style={styles.warningText}>
                            Recuerda que este es un mensaje público para toda tu base de pacientes.
                        </Text>
                    </View>

                    <CustomButton
                        title="Enviar Difusión"
                        onPress={handleSend}
                        loading={loading}
                        icon="send-outline"
                        style={styles.sendBtn}
                    />
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

// Import inline to fix TouchableOpacity issue if needed
import { TouchableOpacity } from 'react-native';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 20,
        backgroundColor: COLORS.surface,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.primary,
    },
    scrollContent: {
        padding: 20,
    },
    introCard: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        padding: 20,
        marginBottom: 25,
        alignItems: 'center',
        elevation: 4,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    introTextContainer: {
        flex: 1,
    },
    introTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 4,
    },
    introSubtitle: {
        fontSize: 12,
        color: COLORS.textSecondary,
        lineHeight: 18,
    },
    form: {
        backgroundColor: COLORS.surface,
        borderRadius: 24,
        padding: 25,
        elevation: 2,
    },
    textArea: {
        height: 120,
        textAlignVertical: 'top',
    },
    warningBox: {
        flexDirection: 'row',
        backgroundColor: COLORS.background,
        padding: 15,
        borderRadius: 15,
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 25,
        gap: 10,
    },
    warningText: {
        flex: 1,
        fontSize: 12,
        color: COLORS.textSecondary,
        fontStyle: 'italic',
    },
    sendBtn: {
        borderRadius: 16,
    },
});
