import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Dimensions,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  Card,
  Title,
  FAB,
  Text,
  TextInput,
  Button,
  Portal,
  Dialog,
  DataTable,
  IconButton,
  useTheme,
  Divider,
} from 'react-native-paper';
import { LineChart } from 'react-native-chart-kit';
import {
  getMeasurements,
  addMeasurement,
  deleteMeasurement,
} from '@/src/services/api';
import { Measurement } from '@/src/services/types';
import AiInsights from '@/components/AiInsights';
import Sparkline from '@/components/Common/Sparkline';
import {
  addTrendline,
  calcDomain,
  getGradientColor,
} from '@/src/utils/chartUtils';

const { width } = Dimensions.get('window');

const measurementOptions = [
  {
    label: 'Bodyweight (kg)',
    value: 'bodyweight',
    better: 'lower',
    color: '#1976d2',
  },
  {
    label: 'Body Fat (%)',
    value: 'body_fat',
    better: 'lower',
    color: '#82ca9d',
  },
  { label: 'VO2 Max', value: 'vo2_max', better: 'higher', color: '#ff7300' },
  { label: 'Chest (cm)', value: 'chest', better: 'higher', color: '#8884d8' },
  { label: 'Waist (cm)', value: 'waist', better: 'lower', color: '#ff4444' },
  { label: 'Biceps (cm)', value: 'biceps', better: 'higher', color: '#0088fe' },
];

export default function MeasurementsScreen() {
  const theme = useTheme();
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState('bodyweight');
  const [formData, setFormData] = useState<any>({
    date: new Date().toISOString().split('T')[0],
    bodyweight: '',
    body_fat: '',
    chest: '',
    waist: '',
    biceps: '',
    vo2_max: '',
  });

  const fetchData = useCallback(async () => {
    try {
      const res = await getMeasurements();
      setMeasurements(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const statsRanges = useMemo(() => {
    const ranges: any = {};
    measurementOptions.forEach((opt) => {
      const vals = measurements
        .map((m: any) => parseFloat(m[opt.value]))
        .filter((v) => !isNaN(v));
      if (vals.length > 0) {
        ranges[opt.value] = { min: Math.min(...vals), max: Math.max(...vals) };
      }
    });
    return ranges;
  }, [measurements]);

  const handleSave = async () => {
    try {
      await addMeasurement(formData);
      setVisible(false);
      fetchData();
    } catch (err) {
      Alert.alert('Error', 'Failed to save measurement');
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Delete', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteMeasurement(id);
          fetchData();
        },
      },
    ]);
  };

  const chartData = useMemo(() => {
    const data = measurements
      .slice()
      .reverse()
      .map((m: any) => ({
        date: m.date,
        value: parseFloat(m[selectedMetric]),
      }))
      .filter((d) => !isNaN(d.value));

    return addTrendline(data);
  }, [measurements, selectedMetric]);

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />;

  const currentOption = measurementOptions.find(
    (o) => o.value === selectedMetric
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView>
        <Title style={styles.headerTitle}>Progress Tracker</Title>

        <Card style={styles.chartCard}>
          <Card.Content>
            <View style={styles.chartHeader}>
              <Title style={{ fontSize: 16 }}>{currentOption?.label}</Title>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginTop: 8 }}
              >
                {measurementOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setSelectedMetric(opt.value)}
                  >
                    <Chip
                      selected={selectedMetric === opt.value}
                      style={styles.metricChip}
                      textStyle={{ fontSize: 10 }}
                      compact
                    >
                      {opt.label.split(' ')[0]}
                    </Chip>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {chartData.length > 1 ? (
              <LineChart
                data={{
                  labels: chartData.map((d) =>
                    d.date.split('-').slice(1).join('/')
                  ),
                  datasets: [
                    {
                      data: chartData.map((d) => d.value),
                      color: (opacity = 1) =>
                        currentOption?.color || theme.colors.primary,
                      strokeWidth: 2,
                    },
                    {
                      data: chartData.map((d) => d.trend),
                      color: (opacity = 1) => `rgba(255, 112, 67, ${opacity})`,
                      strokeWidth: 2,
                      withDots: false,
                    },
                  ],
                }}
                width={width - 64}
                height={200}
                chartConfig={{
                  backgroundGradientFrom: theme.colors.surface,
                  backgroundGradientTo: theme.colors.surface,
                  color: (opacity = 1) => theme.colors.onSurface,
                  labelColor: (opacity = 1) => theme.colors.onSurfaceVariant,
                  decimalPlaces: 1,
                }}
                bezier
                style={{ marginTop: 16, borderRadius: 12 }}
              />
            ) : (
              <View style={styles.noData}>
                <Text>Not enough data for trendline</Text>
              </View>
            )}

            <AiInsights
              data={measurements.slice(0, 14)}
              contextType="measurements"
            />
          </Card.Content>
        </Card>

        <Title style={styles.sectionTitle}>Overview</Title>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.sparkRow}
        >
          {measurementOptions.map((opt) => {
            const vals = measurements
              .slice()
              .reverse()
              .map((m: any) => ({ value: parseFloat(m[opt.value]) }))
              .filter((d) => !isNaN(d.value));

            if (vals.length < 2) return null;

            return (
              <Card key={opt.value} style={styles.sparkCard}>
                <Card.Content>
                  <Text style={styles.sparkLabel}>
                    {opt.label.split(' ')[0]}
                  </Text>
                  <Text style={styles.sparkValue}>
                    {vals[vals.length - 1].value}
                  </Text>
                  <Sparkline
                    data={vals}
                    color={opt.color}
                    width={80}
                    height={40}
                  />
                </Card.Content>
              </Card>
            );
          })}
        </ScrollView>

        <Title style={styles.sectionTitle}>History</Title>
        <DataTable style={styles.table}>
          <DataTable.Header>
            <DataTable.Title>Date</DataTable.Title>
            <DataTable.Title numeric>Weight</DataTable.Title>
            <DataTable.Title numeric>Fat%</DataTable.Title>
            <DataTable.Title numeric>VO2</DataTable.Title>
            <DataTable.Title numeric></DataTable.Title>
          </DataTable.Header>

          {measurements.map((m: any) => (
            <DataTable.Row key={m.id}>
              <DataTable.Cell>
                {m.date.split('-').slice(1).join('/')}
              </DataTable.Cell>
              <DataTable.Cell numeric>
                <Text
                  style={{
                    color: getGradientColor(
                      m.bodyweight,
                      statsRanges.bodyweight?.min,
                      statsRanges.bodyweight?.max
                    ),
                    fontWeight: 'bold',
                  }}
                >
                  {m.bodyweight || '-'}
                </Text>
              </DataTable.Cell>
              <DataTable.Cell numeric>
                <Text
                  style={{
                    color: getGradientColor(
                      m.body_fat,
                      statsRanges.body_fat?.min,
                      statsRanges.body_fat?.max
                    ),
                  }}
                >
                  {m.body_fat || '-'}
                </Text>
              </DataTable.Cell>
              <DataTable.Cell numeric>{m.vo2_max || '-'}</DataTable.Cell>
              <DataTable.Cell numeric>
                <IconButton
                  icon="delete"
                  size={16}
                  onPress={() => handleDelete(m.id)}
                />
              </DataTable.Cell>
            </DataTable.Row>
          ))}
        </DataTable>
        <View style={{ height: 100 }} />
      </ScrollView>

      <FAB style={styles.fab} icon="plus" onPress={() => setVisible(true)} />

      <Portal>
        <Dialog visible={visible} onDismiss={() => setVisible(false)}>
          <Dialog.Title>Add Entry</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Date"
              value={formData.date}
              onChangeText={(t) => setFormData({ ...formData, date: t })}
              style={styles.input}
            />
            <View style={styles.inputRow}>
              <TextInput
                label="Weight"
                value={formData.bodyweight}
                onChangeText={(t) =>
                  setFormData({ ...formData, bodyweight: t })
                }
                style={[styles.input, { flex: 1, marginRight: 8 }]}
                keyboardType="numeric"
              />
              <TextInput
                label="Body Fat"
                value={formData.body_fat}
                onChangeText={(t) => setFormData({ ...formData, body_fat: t })}
                style={[styles.input, { flex: 1 }]}
                keyboardType="numeric"
              />
            </View>
            <TextInput
              label="VO2 Max"
              value={formData.vo2_max}
              onChangeText={(t) => setFormData({ ...formData, vo2_max: t })}
              style={styles.input}
              keyboardType="numeric"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setVisible(false)}>Cancel</Button>
            <Button onPress={handleSave}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

// Simple local Chip to avoid style conflicts
function Chip({ children, selected, style, textStyle, compact, onPress }: any) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        {
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 16,
          backgroundColor: selected
            ? theme.colors.primary
            : theme.colors.surfaceVariant,
          marginRight: 8,
        },
        style,
      ]}
    >
      <Text
        style={[
          { color: selected ? '#fff' : theme.colors.onSurfaceVariant },
          textStyle,
        ]}
      >
        {children}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  chartCard: { marginBottom: 16, borderRadius: 12, elevation: 2 },
  chartHeader: { marginBottom: 8 },
  metricChip: { height: 28 },
  noData: { height: 200, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  sparkRow: { flexDirection: 'row', marginBottom: 16 },
  sparkCard: { marginRight: 12, width: 120, borderRadius: 12 },
  sparkLabel: { fontSize: 10, opacity: 0.6 },
  sparkValue: { fontSize: 18, fontWeight: 'bold' },
  table: { backgroundColor: '#fff', borderRadius: 12, elevation: 1 },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    borderRadius: 28,
  },
  input: { marginBottom: 12, backgroundColor: 'transparent' },
  inputRow: { flexDirection: 'row' },
});
