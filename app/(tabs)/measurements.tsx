import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import {
  Card,
  Title,
  FAB,
  ActivityIndicator,
  Portal,
  Dialog,
  Button,
  TextInput,
  Text,
  Divider,
  List,
  DataTable,
  useTheme,
} from 'react-native-paper';
import { LineChart } from 'react-native-chart-kit';
import { getMeasurements, addMeasurement } from '@/src/services/api';
import { Measurement } from '@/src/services/types';

const { width } = Dimensions.get('window');

const measurementOptions = [
  { label: 'Weight (kg)', value: 'bodyweight', better: 'lower' },
  { label: 'Body Fat (%)', value: 'body_fat', better: 'lower' },
  { label: 'VO2 Max', value: 'vo2_max', better: 'higher' },
  { label: 'Chest (cm)', value: 'chest', better: 'lower' },
  { label: 'Waist (cm)', value: 'waist', better: 'lower' },
  { label: 'Biceps (cm)', value: 'biceps', better: 'higher' },
  { label: 'Forearm (cm)', value: 'forearm', better: 'higher' },
  { label: 'Calf (cm)', value: 'calf', better: 'higher' },
  { label: 'Thigh (cm)', value: 'thigh', better: 'higher' },
];

export default function MeasurementsScreen() {
  const theme = useTheme();
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMeasurement, setSelectedMeasurement] = useState('bodyweight');
  const [visible, setVisible] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    bodyweight: '',
    body_fat: '',
    chest: '',
    waist: '',
    biceps: '',
    forearm: '',
    calf: '',
    thigh: '',
  });

  const fetchMeasurements = useCallback(async () => {
    try {
      const response = await getMeasurements();
      const sorted = response.data.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setMeasurements(sorted);
    } catch (error) {
      console.error('Error fetching measurements:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMeasurements();
  }, [fetchMeasurements]);

  useEffect(() => {
    const existing = measurements.find((m) => m.date === formData.date);
    if (existing) {
      setFormData((prev) => ({
        ...prev,
        bodyweight: existing.bodyweight?.toString() || '',
        body_fat: existing.body_fat?.toString() || '',
        chest: existing.chest?.toString() || '',
        waist: existing.waist?.toString() || '',
        biceps: existing.biceps?.toString() || '',
        forearm: existing.forearm?.toString() || '',
        calf: existing.calf?.toString() || '',
        thigh: existing.thigh?.toString() || '',
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        bodyweight: '',
        body_fat: '',
        chest: '',
        waist: '',
        biceps: '',
        forearm: '',
        calf: '',
        thigh: '',
      }));
    }
  }, [formData.date, measurements]);

  const showDialog = () => setVisible(true);
  const hideDialog = () => setVisible(false);

  const handleInputChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    try {
      await addMeasurement(formData);
      fetchMeasurements();
      hideDialog();
      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        bodyweight: '',
        body_fat: '',
        chest: '',
        waist: '',
        biceps: '',
        forearm: '',
        calf: '',
        thigh: '',
      });
    } catch (err) {
      console.error('Error saving measurement:', err);
    }
  };

  const chartData = useMemo(() => {
    const data = measurements
      .slice()
      .reverse()
      .filter((m) => m[selectedMeasurement as keyof Measurement] != null)
      .slice(-10); // Last 10 points

    if (data.length === 0) return null;

    return {
      labels: data.map((m) => {
        const d = new Date(m.date);
        return `${d.getMonth() + 1}/${d.getDate()}`;
      }),
      datasets: [
        {
          data: data.map(
            (m) =>
              parseFloat(
                m[selectedMeasurement as keyof Measurement] as string
              ) || 0
          ),
        },
      ],
    };
  }, [measurements, selectedMeasurement]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const selectedOpt = measurementOptions.find(
    (o) => o.value === selectedMeasurement
  );

  const currentChartConfig = {
    ...chartConfig,
    backgroundColor: theme.colors.surface,
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    color: (opacity = 1) => `rgba(25, 118, 210, ${opacity})`,
    labelColor: (opacity = 1) =>
      theme.dark
        ? `rgba(255, 255, 255, ${opacity})`
        : `rgba(0, 0, 0, ${opacity})`,
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView style={styles.container}>
        <Title style={styles.mainTitle}>Progress Visualization</Title>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.metricPicker}
        >
          {measurementOptions.map((opt) => {
            const isSelected = selectedMeasurement === opt.value;
            const latest = measurements.find(
              (m) => m[opt.value as keyof Measurement] != null
            )?.[opt.value as keyof Measurement];
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setSelectedMeasurement(opt.value)}
                style={[
                  styles.metricChip,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outline,
                  },
                  isSelected && {
                    backgroundColor: theme.colors.primary,
                    borderColor: theme.colors.primary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.metricLabel,
                    { color: theme.colors.onSurfaceVariant },
                    isSelected && { color: theme.colors.onPrimary },
                  ]}
                >
                  {opt.label.split(' ')[0]}
                </Text>
                {latest && (
                  <Text
                    style={[
                      styles.metricValue,
                      { color: theme.colors.onSurface },
                      isSelected && { color: theme.colors.onPrimary },
                    ]}
                  >
                    {latest}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Card style={styles.chartCard}>
          <Card.Content>
            <Title style={styles.chartTitle}>{selectedOpt?.label}</Title>
            {chartData ? (
              <LineChart
                data={chartData}
                width={width - 48}
                height={220}
                chartConfig={currentChartConfig}
                bezier
                style={styles.chart}
              />
            ) : (
              <View style={styles.noData}>
                <Text>No data for this metric yet.</Text>
              </View>
            )}
          </Card.Content>
        </Card>

        <Title style={styles.mainTitle}>History</Title>
        <ScrollView horizontal>
          <DataTable
            style={[styles.table, { backgroundColor: theme.colors.surface }]}
          >
            <DataTable.Header>
              <DataTable.Title style={{ width: 100 }}>Date</DataTable.Title>
              {measurementOptions.map((opt) => (
                <DataTable.Title key={opt.value} numeric style={{ width: 80 }}>
                  {opt.label.split(' ')[0]}
                </DataTable.Title>
              ))}
            </DataTable.Header>

            {measurements.map((m) => (
              <DataTable.Row key={m.id}>
                <DataTable.Cell style={{ width: 100 }}>{m.date}</DataTable.Cell>
                {measurementOptions.map((opt) => (
                  <DataTable.Cell key={opt.value} numeric style={{ width: 80 }}>
                    {m[opt.value as keyof Measurement] || '-'}
                  </DataTable.Cell>
                ))}
              </DataTable.Row>
            ))}
          </DataTable>
        </ScrollView>
        <View style={{ height: 80 }} />
      </ScrollView>

      <Portal>
        <Dialog
          visible={visible}
          onDismiss={hideDialog}
          style={[styles.dialog, { backgroundColor: theme.colors.surface }]}
        >
          <Dialog.Title>Add New Entry</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 400 }}>
            <ScrollView>
              <TextInput
                label="Date"
                value={formData.date}
                onChangeText={(v) => handleInputChange('date', v)}
                mode="outlined"
                style={styles.input}
              />
              <View style={styles.inputRow}>
                <TextInput
                  label="Weight (kg)"
                  value={formData.bodyweight}
                  onChangeText={(v) => handleInputChange('bodyweight', v)}
                  keyboardType="numeric"
                  mode="outlined"
                  style={[styles.input, { flex: 1, marginRight: 8 }]}
                />
                <TextInput
                  label="Body Fat (%)"
                  value={formData.body_fat}
                  onChangeText={(v) => handleInputChange('body_fat', v)}
                  keyboardType="numeric"
                  mode="outlined"
                  style={[styles.input, { flex: 1 }]}
                />
              </View>
              <View style={styles.inputRow}>
                <TextInput
                  label="Chest (cm)"
                  value={formData.chest}
                  onChangeText={(v) => handleInputChange('chest', v)}
                  keyboardType="numeric"
                  mode="outlined"
                  style={[styles.input, { flex: 1, marginRight: 8 }]}
                />
                <TextInput
                  label="Waist (cm)"
                  value={formData.waist}
                  onChangeText={(v) => handleInputChange('waist', v)}
                  keyboardType="numeric"
                  mode="outlined"
                  style={[styles.input, { flex: 1 }]}
                />
              </View>
              <View style={styles.inputRow}>
                <TextInput
                  label="Biceps (cm)"
                  value={formData.biceps}
                  onChangeText={(v) => handleInputChange('biceps', v)}
                  keyboardType="numeric"
                  mode="outlined"
                  style={[styles.input, { flex: 1, marginRight: 8 }]}
                />
                <TextInput
                  label="Forearm (cm)"
                  value={formData.forearm}
                  onChangeText={(v) => handleInputChange('forearm', v)}
                  keyboardType="numeric"
                  mode="outlined"
                  style={[styles.input, { flex: 1 }]}
                />
              </View>
              <View style={styles.inputRow}>
                <TextInput
                  label="Calf (cm)"
                  value={formData.calf}
                  onChangeText={(v) => handleInputChange('calf', v)}
                  keyboardType="numeric"
                  mode="outlined"
                  style={[styles.input, { flex: 1, marginRight: 8 }]}
                />
                <TextInput
                  label="Thigh (cm)"
                  value={formData.thigh}
                  onChangeText={(v) => handleInputChange('thigh', v)}
                  keyboardType="numeric"
                  mode="outlined"
                  style={[styles.input, { flex: 1 }]}
                />
              </View>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={hideDialog}>Cancel</Button>
            <Button mode="contained" onPress={handleSubmit}>
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={showDialog}
        label="Add Entry"
      />
    </View>
  );
}

const chartConfig = {
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 1,
  color: (opacity = 1) => `rgba(25, 118, 210, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  style: {
    borderRadius: 16,
  },
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: '#1976d2',
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  metricPicker: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  metricChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    minWidth: 80,
  },
  metricLabel: {
    fontSize: 10,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  chartCard: {
    marginBottom: 20,
    elevation: 4,
    borderRadius: 12,
  },
  chartTitle: {
    fontSize: 16,
    marginBottom: 8,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 12,
  },
  noData: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  table: {
    borderRadius: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  dialog: {
    borderRadius: 12,
  },
  input: {
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
});
