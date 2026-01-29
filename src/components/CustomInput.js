import React from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants';

export const CustomInput = ({
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
}) => {
    return (
        <View style={[styles.container, style]}>
            {label && <Text style={styles.label}>{label}</Text>}
            <TextInput
                style={[
                    styles.input,
                    multiline ? styles.multilineInput : null,
                    error ? styles.inputError : null,
                    !editable ? styles.inputDisabled : null,
                ]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={COLORS.textSecondary}
                secureTextEntry={!!secureTextEntry}
                keyboardType={keyboardType}
                multiline={!!multiline}
                numberOfLines={Number(numberOfLines) || 1}
                editable={!!editable}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 16,
        backgroundColor: COLORS.surface,
        color: COLORS.text,
    },
    multilineInput: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    inputError: {
        borderColor: COLORS.error,
    },
    inputDisabled: {
        backgroundColor: COLORS.background,
        color: COLORS.textSecondary,
    },
    errorText: {
        color: COLORS.error,
        fontSize: 12,
        marginTop: 4,
    },
});
