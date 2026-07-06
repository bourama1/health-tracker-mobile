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
  Chip,
  useTheme,
  SegmentedButtons,
} from 'react-native-paper';
import { LineChart } from 'react-native-chart-kit';
import {
  getMentalHealthEntries,
  addMentalHealthEntry,
  getAllJournalEntries,
  saveJournalEntry,
} from '@/src/services/api';
import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const metrics = [
  { key: 'energy', label: 'Energy', color: '#ff7300' },
  { key: 'mood', label: 'Mood', color: '#8884d8' },
  { key: 'composure', label: 'Composure', color: '#82ca9d' },
  { key: 'physicality', label: 'Physicality', color: '#1976d2' },
  { key: 'connectivity', label: 'Connectivity', color: '#e91e63' },
];

const valueLabel = (val: number | null) => {
  if (val === -1) return 'Low';
  if (val === 1) return 'High';
  return 'Balanced';
};

const helmPrompts = [
  { key: 'prompt1' as const, question: 'How are you feeling? Why do you think that is? If you don\'t know, make two guesses.' },
  { key: 'prompt2' as const, question: 'What are you thinking about? Write at least three sentences about a current problem, a new idea, or what you are currently grateful for.' },
  { key: 'prompt3' as const, question: 'What action steps can you take now? Where are you going next and what will you be doing before your next journal entry?' },
];

export default function MentalHealthScreen() {
  const theme = useTheme();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState('energy');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formValues, setFormValues] = useState<Record<string, number | null>>({
    energy: null,
    mood: null,
    composure: null,
    physicality: null,
    connectivity: null,
  });
  const [formNotes, setFormNotes] = useState('');
  const [journalPrompts, setJournalPrompts] = useState({ prompt1: '', prompt2: '', prompt3: '', prompt4: '' });
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [journalLoading, setJournalLoading] = useState(false);

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

  const fetchJournal = useCallback(async () => {
    setJournalLoading(true);
    try {
      const res = await getAllJournalEntries();
      setJournalEntries(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setJournalLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJournal();
  }, [fetchJournal]);

  const handleSave = async () => {
    try {
      await addMentalHealthEntry({
        date: formDate,
        ...formValues,
        notes: formNotes,
      });
      await saveJournalEntry({
        date: formDate,
        ...journalPrompts,
      });
      fetchData();
      fetchJournal();
      Alert.alert('Saved', 'Check-in saved!');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to save check-in');
    }
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
              style={{ marginTop: 8, marginBottom: 8 }}
            >
              {metrics.map((m) => (
                <Chip
                  key={m.key}
                  selected={selectedMetric === m.key}
                  onPress={() => setSelectedMetric(m.key)}
                  style={{ marginRight: 8 }}
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

        <Card style={styles.formCard}>
          <Card.Content>
            <Title style={{ fontSize: 16 }}>Daily Check-In</Title>
            <Text style={{ fontStyle: 'italic', fontSize: 12, opacity: 0.7, marginBottom: 12 }}>
              "Track your experiences, goals, blessings, and overall progress."
            </Text>

            <TextInput
              label="Date"
              value={formDate}
              onChangeText={setFormDate}
              mode="outlined"
              style={{ marginBottom: 12 }}
            />

            <Title style={{ fontSize: 14, marginBottom: 8 }}>Metrics</Title>
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
              style={{ marginBottom: 12 }}
            />

            <Title style={{ fontSize: 14, marginBottom: 8 }}>Journal</Title>
            {helmPrompts.map((p) => (
              <TextInput
                key={p.key}
                label={p.question}
                value={journalPrompts[p.key]}
                onChangeText={(text) =>
                  setJournalPrompts((prev) => ({ ...prev, [p.key]: text }))
                }
                mode="outlined"
                multiline
                numberOfLines={2}
                style={{ marginBottom: 12 }}
              />
            ))}

            <Button mode="contained" onPress={handleSave}>
              Save Check-In
            </Button>
          </Card.Content>
        </Card>

        <Title style={styles.sectionTitle}>Journal History</Title>
        {journalLoading ? (
          <ActivityIndicator style={{ marginTop: 16 }} />
        ) : journalEntries.length === 0 ? (
          <Text style={{ textAlign: 'center', opacity: 0.5, marginTop: 16 }}>
            No journal entries yet.
          </Text>
        ) : (
          journalEntries.map((entry: any) => (
            <Card key={entry.id} style={styles.historyCard}>
              <Card.Content>
                <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>{entry.date}</Text>
                {helmPrompts.map((p) => (
                  <View key={p.key} style={{ marginBottom: 8 }}>
                    <Text style={{ fontSize: 11, opacity: 0.6 }}>{p.question}</Text>
                    <Text style={{ fontSize: 13 }}>{entry[p.key] || '(empty)'}</Text>
                  </View>
                ))}
              </Card.Content>
            </Card>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  chartCard: { marginBottom: 16, borderRadius: 12, elevation: 2 },
  formCard: { marginBottom: 16, borderRadius: 12, elevation: 2 },
  noData: { height: 180, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  historyCard: { marginBottom: 12, borderRadius: 12, elevation: 1 },
});