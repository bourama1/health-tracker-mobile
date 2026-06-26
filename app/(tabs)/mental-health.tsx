import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  Card,
  Title,
  Text,
  TextInput,
  Button,
  Portal,
  Dialog,
  DataTable,
  IconButton,
  useTheme,
  Chip,
  SegmentedButtons,
} from 'react-native-paper';
import { LineChart } from 'react-native-chart-kit';
import {
  getMentalHealthEntries,
  addMentalHealthEntry,
  deleteMentalHealthEntry,
} from '@/src/services/api';
import { MentalHealthEntry } from '@/src/services/types';
import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const metrics = [
  { key: 'energy', label: 'Energy', color: '#ff7300' },
  { key: 'mood', label: 'Mood', color: '#8884d8' },
  { key: 'composure', label: 'Composure', color: '#82ca9d' },
  { key: 'physicality', label: 'Physicality', color: '#1976d2' },
  { key: 'connectivity', label: 'Connectivity', color: '#e91e63' },
];

const metricDescriptions: Record<string, { low: string; balanced: string; high: string }> = {
  energy: { low: 'Lethargic, unmotivated', balanced: 'Bright, focused, consistent', high: 'Irrational, inefficient, distracted' },
  mood: { low: 'Depressed, irritable', balanced: 'Happy, content, stable', high: 'Inflated, obsessive' },
  composure: { low: 'Anxious, hyper-reactive', balanced: 'Stable, responsive', high: 'Careless, alienating' },
  physicality: { low: 'Tired, tense, slow', balanced: 'Relaxed, energized', high: 'Stressed, at risk of burnout' },
  connectivity: { low: 'Negative, lonely', balanced: 'Sociable, affectionate', high: 'Over-extended, codependent' },
};

const valueLabel = (val: number | null) => {
  if (val === -1) return 'Low';
  if (val === 1) return 'High';
  return 'Balanced';
};

export default function MentalHealthScreen() {
  const theme = useTheme();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState('energy');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formValues, setFormValues] = useState<Record<string, number | null>>({
    energy: null,
    mood: null,
    composure: null,
    physicality: null,
    connectivity: null,
  });
  const [formNotes, setFormNotes] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const res = await getMentalHealthEntries();
      setEntries(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    try {
      await addMentalHealthEntry({
        date: formDate,
        ...formValues,
        notes: formNotes,
      });
      setDialogVisible(false);
      setFormValues({ energy: null, mood: null, composure: null, physicality: null, connectivity: null });
      setFormNotes('');
      fetchData();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to save entry');
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Delete', 'Delete this entry?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteMentalHealthEntry(id);
          fetchData();
        } catch (err) {
          console.error(err);
        }
      }},
    ]);
  };

  const openDialog = () => {
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormValues({ energy: null, mood: null, composure: null, physicality: null, connectivity: null });
    setFormNotes('');
    setDialogVisible(true);
  };

  const chartData = useMemo(() => {
    return entries
      .slice()
      .reverse()
      .map((e: any) => ({
        date: e.date,
        value: e[selectedMetric],
      }))
      .filter((d: any) => d.value !== null && d.value !== undefined);
  }, [entries, selectedMetric]);

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 40 }} />;
  }

  const currentMetric = metrics.find((m) => m.key === selectedMetric);
  const desc = metricDescriptions[selectedMetric];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView>
        <Title style={styles.headerTitle}>Mental Health</Title>

        <Card style={styles.chartCard}>
          <Card.Content>
            <Title style={{ fontSize: 16 }}>{currentMetric?.label} Trend</Title>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: 8 }}
            >
              {metrics.map((m) => (
                <Chip
                  key={m.key}
                  selected={selectedMetric === m.key}
                  onPress={() => setSelectedMetric(m.key)}
                  style={styles.metricChip}
                >
                  {m.label}
                </Chip>
              ))}
            </ScrollView>

            {chartData.length > 1 ? (
              <LineChart
                data={{
                  labels: chartData.map((d: any) =>
                    d.date.split('-').slice(1).join('/')
                  ),
                  datasets: [{
                    data: chartData.map((d: any) => d.value),
                    color: (opacity = 1) => currentMetric?.color || theme.colors.primary,
                  }],
                }}
                width={width - 64}
                height={180}
                yAxisSuffix=""
                fromZero={false}
                segments={2}
                chartConfig={{
                  backgroundGradientFrom: theme.colors.surface,
                  backgroundGradientTo: theme.colors.surface,
                  color: (opacity = 1) => theme.colors.onSurface,
                  labelColor: (opacity = 1) => theme.colors.onSurfaceVariant,
                  decimalPlaces: 0,
                  propsForLabels: { fontSize: 10 },
                }}
                bezier
                style={{ marginTop: 16, borderRadius: 12 }}
              />
            ) : (
              <View style={styles.noData}>
                <Text>Not enough data</Text>
              </View>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.descCard}>
          <Card.Content>
            <Title style={{ fontSize: 14 }}>{currentMetric?.label} Guide</Title>
            <Text style={styles.descText}>
              <Text style={{ fontWeight: 'bold' }}>Low:</Text> {desc?.low}
            </Text>
            <Text style={styles.descText}>
              <Text style={{ fontWeight: 'bold' }}>Balanced:</Text> {desc?.balanced}
            </Text>
            <Text style={styles.descText}>
              <Text style={{ fontWeight: 'bold' }}>High:</Text> {desc?.high}
            </Text>
          </Card.Content>
        </Card>

        <Title style={styles.sectionTitle}>History</Title>
        <DataTable style={styles.table}>
          <DataTable.Header>
            <DataTable.Title>Date</DataTable.Title>
            {metrics.map((m) => (
              <DataTable.Title key={m.key} numeric style={{ minWidth: 24 }}>
                {m.label.slice(0, 3)}
              </DataTable.Title>
            ))}
            <DataTable.Title numeric>Del</DataTable.Title>
          </DataTable.Header>

          {entries.map((e: any) => (
            <DataTable.Row key={e.id}>
              <DataTable.Cell>{e.date.split('-').slice(1).join('/')}</DataTable.Cell>
              {metrics.map((m) => (
                <DataTable.Cell key={m.key} numeric>
                  <Text style={{ fontSize: 11, fontWeight: 'bold' }}>
                    {e[m.key] !== null && e[m.key] !== undefined
                      ? e[m.key] === -1 ? 'L' : e[m.key] === 1 ? 'H' : 'B'
                      : '-'}
                  </Text>
                </DataTable.Cell>
              ))}
              <DataTable.Cell numeric>
                <IconButton
                  icon="delete"
                  size={16}
                  onPress={() => handleDelete(e.id)}
                />
              </DataTable.Cell>
            </DataTable.Row>
          ))}
        </DataTable>

        <View style={{ height: 100 }} />
      </ScrollView>

      <FAB icon="plus" style={styles.fab} onPress={openDialog} />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Daily Check-In</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Date"
              value={formDate}
              onChangeText={setFormDate}
              mode="outlined"
              style={{ marginBottom: 12 }}
            />
            {metrics.map((m) => (
              <View key={m.key} style={{ marginBottom: 12 }}>
                <Text style={{ marginBottom: 4, fontWeight: 'bold', fontSize: 13 }}>
                  {m.label}
                </Text>
                <SegmentedButtons
                  value={formValues[m.key]?.toString() ?? ''}
                  onValueChange={(val) =>
                    setFormValues((prev) => ({ ...prev, [m.key]: parseInt(val) }))
                  }
                  buttons={[
                    { value: '-1', label: 'Low' },
                    { value: '0', label: 'Balanced' },
                    { value: '1', label: 'High' },
                  ]}
                />
              </View>
            ))}
            <TextInput
              label="Notes"
              value={formNotes}
              onChangeText={setFormNotes}
              mode="outlined"
              multiline
              numberOfLines={2}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleSave}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const FAB = ({ icon, style, onPress }: any) => (
  <IconButton
    icon={icon}
    mode="contained"
    size={28}
    onPress={onPress}
    style={[{
      position: 'absolute',
      right: 16,
      bottom: 16,
      borderRadius: 28,
      elevation: 4,
    }, style]}
  />
);

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  chartCard: { marginBottom: 16, borderRadius: 12, elevation: 2 },
  descCard: { marginBottom: 16, borderRadius: 12, elevation: 1 },
  descText: { fontSize: 12, marginBottom: 2, opacity: 0.8 },
  metricChip: { marginRight: 8, height: 32 },
  noData: { height: 180, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  table: { backgroundColor: '#fff', borderRadius: 12, elevation: 1 },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    borderRadius: 28,
    elevation: 4,
  },
});
