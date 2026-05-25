import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { LineChart } from 'react-native-chart-kit';

interface SparklineProps {
  data: any[];
  valueKey?: string;
  color?: string;
  width?: number;
  height?: number;
}

export default function Sparkline({
  data,
  valueKey = 'value',
  color,
  width = 100,
  height = 50,
}: SparklineProps) {
  const theme = useTheme();
  const vals = data
    .map((d) => parseFloat(d[valueKey]))
    .filter((v) => !isNaN(v));

  if (vals.length < 2) return null;

  const chartData = {
    labels: [], // No labels for sparkline
    datasets: [
      {
        data: vals,
        color: (opacity = 1) => color || theme.colors.primary,
        strokeWidth: 2,
      },
    ],
  };

  const chartConfig = {
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    color: (opacity = 1) => color || theme.colors.primary,
    propsForDots: { r: '0' }, // Hide dots
    strokeWidth: 2,
    decimalPlaces: 0,
    fillShadowGradient: color || theme.colors.primary,
    fillShadowGradientOpacity: 0.1,
  };

  return (
    <View style={{ width, height, overflow: 'hidden' }}>
      <LineChart
        data={chartData}
        width={width + 50} // Add overflow to hide padding
        height={height + 20}
        chartConfig={chartConfig}
        withDots={false}
        withInnerLines={false}
        withOuterLines={false}
        withVerticalLabels={false}
        withHorizontalLabels={false}
        style={{
          marginLeft: -25, // Shift to hide padding
          marginTop: -10,
        }}
        bezier
      />
    </View>
  );
}
