import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';

export const CustomInput = React.memo(({
    label,
    value,
    onChangeText,
    placeholder,
    secureTextEntry = false,
    keyboardType = 'default',
    multiline = false,
    numberOfLines = 1,
    error = '',
    editable = true,
    style,
    prefix,
    icon,
}) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <View style={[styles.container, style]}>
            {label && <Text style={[styles.label, isFocused && styles.labelFocused]}>{label}</Text>}
            <View style={[
                styles.inputContainer,
                isFocused && styles.inputContainerFocused,
                error ? styles.inputContainerError : null
            ]}>
                {icon && (
                    <View style={styles.iconBox}>
                        <Ionicons name={icon} size={20} color={isFocused ? COLORS.primary : COLORS.textSecondary} />
                    </View>
                )}
                {prefix && <Text style={styles.prefix}>{prefix}</Text>}
                <TextInput
                    style={[
                        styles.input,
                        prefix ? styles.inputWithPrefix : null,
                        multiline ? styles.multilineInput : null,
                        !editable ? styles.inputDisabled : null,
                    ]}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={COLORS.textSecondary + '80'}
                    secureTextEntry={!!secureTextEntry}
                    keyboardType={keyboardType}
                    multiline={!!multiline}
                    numberOfLines={Number(numberOfLines) || 1}
                    editable={!!editable}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                />
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
    },
    label: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.textSecondary,
        marginBottom: 8,
        marginLeft: 4,
    },
    labelFocused: {
        color: COLORS.primary,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: COLORS.border,
        borderRadius: 16,
        backgroundColor: COLORS.background,
        overflow: 'hidden',
        minHeight: 56,
    },
    inputContainerFocused: {
        borderColor: COLORS.secondary,
        backgroundColor: COLORS.surface,
        elevation: 4,
        shadowColor: COLORS.secondary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    inputContainerError: {
        borderColor: COLORS.error,
    },
    iconBox: {
        width: 48,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
    },
    prefix: {
        paddingLeft: 14,
        fontSize: 16,
        color: COLORS.text,
        fontWeight: '600',
    },
    input: {
        flex: 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 16,
        color: COLORS.text,
        textAlignVertical: 'center',
    },
    inputWithPrefix: {
        paddingLeft: 0,
    },
    multilineInput: {
        minHeight: 120,
        textAlignVertical: 'top',
        paddingTop: 14,
    },
    inputDisabled: {
        backgroundColor: '#F1F5F9',
        color: COLORS.textSecondary,
    },
    errorText: {
        color: COLORS.error,
        fontSize: 12,
        marginTop: 6,
        marginLeft: 4,
        fontWeight: '600',
    },
});
