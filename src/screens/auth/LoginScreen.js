import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Keyboard,
    Platform,
    Alert,
    TouchableOpacity,
    TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CustomInput } from '../../components/CustomInput';
import { CustomButton } from '../../components/CustomButton';
import { authService } from '../../services/authService';
import { COLORS } from '../../constants';

export const LoginScreen = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const validateForm = () => {
        const newErrors = {};

        if (!email.trim()) {
            newErrors.email = 'El correo es requerido';
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = 'Correo inválido';
        }

        if (!password) {
            newErrors.password = 'La contraseña es requerida';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleLogin = async () => {
        if (!validateForm()) return;

        // Dismiss keyboard first
        Keyboard.dismiss();

        setLoading(true);

        // Wait for keyboard to fully close before proceeding
        await new Promise(resolve => setTimeout(resolve, 150));

        const { data, error } = await authService.signIn(email, password);
        setLoading(false);

        if (error) {
            const message = error.message === 'Invalid login credentials'
                ? 'Correo o contraseña incorrectos.'
                : error.message;
            Alert.alert('Error de Inicio de Sesión', message);
            return;
        }
    };

    const handleForgotPassword = async () => {
        if (!email.trim()) {
            Alert.alert('Recuperar Contraseña', 'Por favor ingresa tu correo electrónico primero.');
            return;
        }
        if (!/\S+@\S+\.\S+/.test(email)) {
            Alert.alert('Error', 'Por favor ingresa un correo válido.');
            return;
        }

        setLoading(true);
        const { error } = await authService.resetPassword(email);
        setLoading(false);

        if (error) {
            Alert.alert('Error', error.message || 'No se pudo enviar el correo de recuperación.');
        } else {
            Alert.alert(
                'Correo Enviado',
                'Si el correo existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña.'
            );
        }
    };

    // Dismiss keyboard when tapping outside inputs
    const dismissKeyboard = () => {
        Keyboard.dismiss();
    };

    return (
        <TouchableWithoutFeedback onPress={dismissKeyboard} accessible={false}>
            <View style={styles.container}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.header}>
                        <Text style={styles.title}>Consultorio Tunarosa</Text>
                        <Text style={styles.subtitle}>Cuidado dental de confianza</Text>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Bienvenido</Text>
                        <Text style={styles.cardSubtitle}>Ingresa tus credenciales para continuar</Text>

                        <View style={styles.form}>
                            <CustomInput
                                label="Correo Electrónico"
                                value={email}
                                onChangeText={setEmail}
                                placeholder="ejemplo@correo.com"
                                keyboardType="email-address"
                                error={errors.email}
                                icon="mail-outline"
                            />

                            <CustomInput
                                label="Contraseña"
                                value={password}
                                onChangeText={setPassword}
                                placeholder="••••••••"
                                secureTextEntry
                                error={errors.password}
                                icon="lock-closed-outline"
                            />

                            <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPassword}>
                                <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
                            </TouchableOpacity>

                            <CustomButton
                                title="Iniciar Sesión"
                                onPress={handleLogin}
                                loading={loading}
                                style={styles.loginButton}
                            />
                        </View>
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.registerText}>¿Aún no tienes una cuenta?</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Auth_Register')}>
                            <Text style={styles.registerLink}>Regístrate ahora</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
        </TouchableWithoutFeedback>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
    },
    title: {
        fontSize: 28,
        fontWeight: '900',
        color: COLORS.primary,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15,
        color: COLORS.textSecondary,
        marginTop: 4,
        fontWeight: '500',
    },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: 30,
        padding: 24,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
    },
    cardTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: COLORS.text,
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 24,
    },
    form: {
        width: '100%',
    },
    loginButton: {
        marginTop: 10,
        borderRadius: 16,
        height: 56,
    },
    forgotPassword: {
        alignSelf: 'flex-end',
        marginBottom: 20,
        marginTop: -10,
    },
    forgotPasswordText: {
        fontSize: 13,
        color: COLORS.secondary,
        fontWeight: '600',
    },
    footer: {
        marginTop: 30,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    registerText: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    registerLink: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: '700',
    },
});
