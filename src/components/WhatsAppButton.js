import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';
import { whatsappService } from '../services/whatsappService';

export const WhatsAppButton = ({
    phoneNumber,
    message = '',
    userName = '',
    variant = 'default', // 'default', 'small', 'icon-only'
    style
}) => {
    const handlePress = async () => {
        await whatsappService.openWhatsApp(phoneNumber, message);
    };

    if (variant === 'icon-only') {
        return (
            <TouchableOpacity
                style={[styles.iconButton, style]}
                onPress={handlePress}
                activeOpacity={0.7}
            >
                <Ionicons name="logo-whatsapp" size={24} color={COLORS.success} />
            </TouchableOpacity>
        );
    }

    if (variant === 'small') {
        return (
            <TouchableOpacity
                style={[styles.smallButton, style]}
                onPress={handlePress}
                activeOpacity={0.7}
            >
                <Ionicons name="logo-whatsapp" size={18} color={COLORS.surface} />
                <Text style={styles.smallButtonText}>WhatsApp</Text>
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            style={[styles.button, style]}
            onPress={handlePress}
            activeOpacity={0.7}
        >
            <Ionicons name="logo-whatsapp" size={24} color={COLORS.surface} />
            <Text style={styles.buttonText}>
                Contactar por WhatsApp{userName ? ` a ${userName}` : ''}
            </Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#25D366', // WhatsApp green
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        gap: 8,
    },
    buttonText: {
        color: COLORS.surface,
        fontSize: 16,
        fontWeight: '600',
    },
    smallButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#25D366',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        gap: 6,
    },
    smallButtonText: {
        color: COLORS.surface,
        fontSize: 14,
        fontWeight: '600',
    },
    iconButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: COLORS.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
