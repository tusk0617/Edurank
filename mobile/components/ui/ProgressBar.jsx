import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '../../constants/Colors';

export default function ProgressBar({ value = 0, color = Colors.primary, showLabel = false, height = 8 }) {
  const pct = Math.min(100, Math.max(0, isNaN(value) ? 0 : value || 0));
  return (
    <View>
      <View style={[styles.track, { height }]}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color, height }]} />
      </View>
      {showLabel && <Text style={styles.label}>{pct.toFixed(0)}%</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { backgroundColor: '#E5E7EB', borderRadius: 99, overflow: 'hidden' },
  fill: { borderRadius: 99 },
  label: { fontSize: 11, color: '#6B7280', marginTop: 2, textAlign: 'right' },
});
