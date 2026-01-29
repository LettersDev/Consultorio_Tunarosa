import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';

export const CustomButton = ({
    title,
    onPress,
    loading = false,
    disabled = false,
    variant = 'primary', // 'primary', 'secondary', 'outline', 'danger'
    style,
    textStyle,
    icon,
    iconSize = 20,
}) => {
    const isOutline = variant === 'outline';
    const isDanger = variant === 'danger';

    const getBackgroundColor = () => {
        if (disabled) return COLORS.border;
        if (isOutline) return 'transparent';
        if (isDanger) return COLORS.error;
        return COLORS.primary;
    };

    const getTextColor = () => {
        if (disabled) return COLORS.textSecondary;
        if (isOutline) return COLORS.primary;
        return COLORS.white;
    };

    return (
        <TouchableOpacity
            style={[
                styles.button,
                { backgroundColor: getBackgroundColor() },
                isOutline && { borderWidth: 1.5, borderColor: COLORS.primary },
                !isOutline && !disabled && styles.shadow,
                style,
            ]}
            onPress={onPress}
            disabled={!!(disabled || loading)}
            activeOpacity={0.8}
        >
            {loading ? (
                <ActivityIndicator animating={true} color={getTextColor()} />
            ) : (
                <View style={styles.content}>
                    {icon && (
                        <Ionicons
                            name={icon}
                            size={iconSize}
                            color={getTextColor()}
                            style={styles.icon}
                        />
                    )}
                    <Text style={[
                        styles.buttonText,
                        { color: getTextColor() },
                        textStyle,
                    ]}>
                        {title}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 52,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: {
        marginRight: 8,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 0.3,
    },
    shadow: {
        elevation: 6,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
    },
});
