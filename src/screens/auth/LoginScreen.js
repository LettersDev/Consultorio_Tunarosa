import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';
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

        setLoading(true);
        const { data, error } = await authService.signIn(email, password);
        setLoading(false);

        if (error) {
            const message = error.message === 'Invalid login credentials'
                ? 'Correo o contraseña incorrectos.'
                : error.message;
            Alert.alert('Error de Inicio de Sesión', message);
            return;
        }

        // Navigation will be handled by the main App component based on user role
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text style={styles.title}>Consultorio Dental</Text>
                    <Text style={styles.subtitle}>Inicia sesión en tu cuenta</Text>
                </View>

                <View style={styles.form}>
                    <CustomInput
                        label="Correo Electrónico"
                        value={email}
                        onChangeText={setEmail}
                        placeholder="ejemplo@correo.com"
                        keyboardType="email-address"
                        error={errors.email}
                    />

                    <CustomInput
                        label="Contraseña"
                        value={password}
                        onChangeText={setPassword}
                        placeholder="••••••••"
                        secureTextEntry
                        error={errors.password}
                    />

                    <CustomButton
                        title="Iniciar Sesión"
                        onPress={handleLogin}
                        loading={loading}
                        style={styles.loginButton}
                    />

                    <View style={styles.registerContainer}>
                        <Text style={styles.registerText}>¿No tienes cuenta? </Text>
                        <CustomButton
                            title="Regístrate aquí"
                            onPress={() => navigation.navigate('Auth_Register')}
                            variant="outline"
                            style={styles.registerButton}
                        />
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
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
        marginBottom: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.textSecondary,
    },
    form: {
        width: '100%',
    },
    loginButton: {
        marginTop: 8,
    },
    registerContainer: {
        marginTop: 24,
        alignItems: 'center',
    },
    registerText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 12,
    },
    registerButton: {
        width: '100%',
    },
});
