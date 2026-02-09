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
import DateTimePicker from '@react-native-community/datetimepicker';
import { CustomInput } from '../../components/CustomInput';
import { CustomButton } from '../../components/CustomButton';
import { authService } from '../../services/authService';
import { COLORS } from '../../constants';

export const RegisterScreen = ({ navigation }) => {
    const [formData, setFormData] = useState({
        name: '',
        age: '',
        birthDate: new Date(),
        phone: '',
        email: '',
        allergies: '',
        medications: '',
        password: '',
        confirmPassword: '',
    });
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const updateField = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'El nombre es requerido';
        }

        if (!formData.age || parseInt(formData.age) < 1 || parseInt(formData.age) > 120) {
            newErrors.age = 'Edad inválida';
        }

        if (!formData.phone.trim()) {
            newErrors.phone = 'El teléfono es requerido';
        } else if (formData.phone.length < 10) {
            newErrors.phone = 'Teléfono inválido';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'El correo es requerido';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Correo inválido';
        }

        if (!formData.password) {
            newErrors.password = 'La contraseña es requerida';
        } else if (formData.password.length < 6) {
            newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
        }

        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Las contraseñas no coinciden';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleRegister = async () => {
        if (!validateForm()) return;

        setLoading(true);

        const userData = {
            name: formData.name,
            age: parseInt(formData.age),
            birthDate: formData.birthDate.toISOString().split('T')[0],
            phone: formData.phone,
            email: formData.email,
            allergies: formData.allergies || 'Ninguna',
            medications: formData.medications || 'Ninguno',
        };

        const { data, error } = await authService.signUp(
            formData.email,
            formData.password,
            userData
        );

        setLoading(false);

        if (error) {
            Alert.alert('Error de Registro', error.message);
            return;
        }

        Alert.alert(
            'Registro Exitoso',
            'Su cuenta ha sido creada. Por favor inicie sesión.',
            [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
        );
    };

    const onDateChange = (event, selectedDate) => {
        setShowDatePicker(false);
        if (selectedDate) {
            updateField('birthDate', selectedDate);
            // Calculate age from birth date
            const age = Math.floor((new Date() - selectedDate) / (365.25 * 24 * 60 * 60 * 1000));
            updateField('age', age.toString());
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text style={styles.title}>Registro de Paciente</Text>
                    <Text style={styles.subtitle}>Complete sus datos personales</Text>
                </View>

                <View style={styles.form}>
                    <CustomInput
                        label="Nombre Completo *"
                        value={formData.name}
                        onChangeText={(value) => updateField('name', value)}
                        placeholder="Juan Pérez"
                        error={errors.name}
                    />

                    <CustomButton
                        title={`Fecha de Nacimiento: ${formData.birthDate.toLocaleDateString()}`}
                        onPress={() => setShowDatePicker(true)}
                        variant="outline"
                        style={styles.dateButton}
                    />

                    {showDatePicker && (
                        <DateTimePicker
                            value={formData.birthDate instanceof Date ? formData.birthDate : new Date()}
                            mode="date"
                            display="default"
                            onChange={onDateChange}
                            maximumDate={new Date()}
                        />
                    )}

                    <CustomInput
                        label="Edad *"
                        value={formData.age}
                        onChangeText={(value) => updateField('age', value)}
                        placeholder="25"
                        keyboardType="numeric"
                        error={errors.age}
                    />

                    <CustomInput
                        label="Teléfono * (+58)"
                        value={formData.phone}
                        onChangeText={(value) => updateField('phone', value)}
                        placeholder="4121234567"
                        keyboardType="phone-pad"
                        error={errors.phone}
                        prefix="+58 "
                    />

                    <CustomInput
                        label="Correo Electrónico *"
                        value={formData.email}
                        onChangeText={(value) => updateField('email', value)}
                        placeholder="ejemplo@correo.com"
                        keyboardType="email-address"
                        error={errors.email}
                    />

                    <CustomInput
                        label="Alergias (opcional)"
                        value={formData.allergies}
                        onChangeText={(value) => updateField('allergies', value)}
                        placeholder="Penicilina, polen, etc."
                        multiline
                        numberOfLines={2}
                    />

                    <CustomInput
                        label="Medicamentos que toma (opcional)"
                        value={formData.medications}
                        onChangeText={(value) => updateField('medications', value)}
                        placeholder="Aspirina, insulina, etc."
                        multiline
                        numberOfLines={2}
                    />

                    <CustomInput
                        label="Contraseña *"
                        value={formData.password}
                        onChangeText={(value) => updateField('password', value)}
                        placeholder="Mínimo 6 caracteres"
                        secureTextEntry
                        error={errors.password}
                    />

                    <CustomInput
                        label="Confirmar Contraseña *"
                        value={formData.confirmPassword}
                        onChangeText={(value) => updateField('confirmPassword', value)}
                        placeholder="Repita su contraseña"
                        secureTextEntry
                        error={errors.confirmPassword}
                    />

                    <CustomButton
                        title="Registrarse"
                        onPress={handleRegister}
                        loading={loading}
                        style={styles.registerButton}
                    />

                    <View style={styles.loginContainer}>
                        <Text style={styles.loginText}>¿Ya tienes cuenta? </Text>
                        <CustomButton
                            title="Inicia sesión"
                            onPress={() => navigation.navigate('Auth_Login')}
                            variant="outline"
                            style={styles.loginButton}
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
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
        marginTop: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    form: {
        width: '100%',
    },
    dateButton: {
        marginBottom: 16,
    },
    registerButton: {
        marginTop: 8,
    },
    loginContainer: {
        marginTop: 24,
        marginBottom: 40,
        alignItems: 'center',
    },
    loginText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 12,
    },
    loginButton: {
        width: '100%',
    },
});
