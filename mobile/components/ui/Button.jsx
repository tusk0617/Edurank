import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Colors from '../../constants/Colors';

export default function Button({ title, onPress, loading, disabled, variant = 'primary', style }) {
  const isDisabled = disabled || loading;
  const bg = variant === 'danger' ? Colors.danger
    : variant === 'secondary' ? Colors.secondary
    : variant === 'outline' ? 'transparent'
    : Colors.primary;

  return (
    <TouchableOpacity
      style={[
        styles.btn,
        { backgroundColor: bg },
        variant === 'outline' && styles.outline,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {loading
        ? <ActivityIndicator color={variant === 'outline' ? Colors.primary : '#fff'} />
        : <Text style={[styles.text, variant === 'outline' && styles.outlineText]}>{title}</Text>
      }
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { color: '#fff', fontSize: 16, fontWeight: '600' },
  outline: { borderWidth: 1.5, borderColor: Colors.primary },
  outlineText: { color: Colors.primary },
  disabled: { opacity: 0.5 },
});
