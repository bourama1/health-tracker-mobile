import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Dimensions,
  TouchableOpacity,
  Alert,
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
  IconButton,
  useTheme,
} from 'react-native-paper';
import { LineChart } from 'react-native-chart-kit';
import {
  getSleepRecords,
  addSleepRecord,
  deleteSleepRecord,
  syncGoogleFitSleep,
  syncUltrahuman,
} from '@/src/services/api';
import { SleepRecord } from '@/src/services/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const sleepStatsOptions = [
  { label: 'RHR (bpm)', value: 'rhr', better: 'lower' },
  { label: 'HRV (ms)', value: 'hrv', better: 'higher' },
  { label: 'Score', value: 'sleep_score', better: 'higher' },
  { label: 'Temp Dev', value: 'temp_dev', better: 'lower' },
  { label: 'Deep (min)', value: 'deep_sleep_minutes', better: 'higher' },
  { label: 'REM (min)', value: 'rem_sleep_minutes', better: 'higher' },
];

const minutesToHm = (minutes: any) => {
  if (minutes === null || minutes === undefined || minutes === '') return '-';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${m.toString().padStart(2, '0')}`;
};

export default function SleepScreen() {
  const theme = useTheme();
  const [history, setHistory] = useState<SleepRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStat, setSelectedStat] = useState('rhr');
  const [visible, setVisible] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    bedtime: '',
    wake_time: '',
    rhr: '',
    hrv: '',
    sleep_score: '',
    temp_dev: '',
    deep_sleep_minutes: '',
    rem_sleep_minutes: '',
    light_minutes: '',
    awake_minutes: '',
  });

  const fetchHistory = useCallback(async () => {
    try {
      const response = await getSleepRecords();
      setHistory(
        response.data.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )
      );
    } catch (error) {
      console.error('Error fetching sleep records:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleInputChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    try {
      await addSleepRecord(formData);
      fetchHistory();
      setVisible(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        bedtime: '',
        wake_time: '',
        rhr: '',
        hrv: '',
        sleep_score: '',
        temp_dev: '',
        deep_sleep_minutes: '',
        rem_sleep_minutes: '',
        light_minutes: '',
        awake_minutes: '',
      });
    } catch (err) {
      Alert.alert('Error', 'Failed to save sleep entry');
    }
  };

  const handleDelete = async (id: number) => {
    Alert.alert('Delete Entry', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSleepRecord(id);
            fetchHistory();
          } catch (err) {
            Alert.alert('Error', 'Failed to delete entry');
          }
        },
      },
    ]);
  };

  const handleSync = async (type: 'google' | 'ultrahuman') => {
    setSyncing(true);
    try {
      if (type === 'google') {
        const tz = 'UTC'; // Simplification for now
        await syncGoogleFitSleep(30, tz);
      } else {
        await syncUltrahuman(30);
      }
      fetchHistory();
      Alert.alert('Success', 'Sync completed');
    } catch (err) {
      Alert.alert('Error', 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const chartData = useMemo(() => {
    const data = history
      .slice()
      .reverse()
      .filter((h) => h[selectedStat as keyof SleepRecord] != null)
      .slice(-10);

    if (data.length === 0) return null;

    return {
      labels: data.map((h) => {
        const d = new Date(h.date);
        return `${d.getMonth() + 1}/${d.getDate()}`;
      }),
      datasets: [
        {
          data: data.map(
            (h) =>
              parseFloat(h[selectedStat as keyof SleepRecord] as string) || 0
          ),
        },
      ],
    };
  }, [history, selectedStat]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const selectedOpt = sleepStatsOptions.find((o) => o.value === selectedStat);

  const currentChartConfig = {
    ...chartConfig,
    backgroundColor: theme.colors.surface,
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    color: (opacity = 1) => `rgba(103, 58, 183, ${opacity})`,
    labelColor: (opacity = 1) =>
      theme.dark
        ? `rgba(255, 255, 255, ${opacity})`
        : `rgba(0, 0, 0, ${opacity})`,
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView style={styles.container}>
        <View style={styles.syncContainer}>
          <Button
            mode="outlined"
            icon="google"
            onPress={() => handleSync('google')}
            disabled={syncing}
            style={[styles.syncButton, { borderColor: theme.colors.primary }]}
            compact
          >
            Google
          </Button>
          <Button
            mode="outlined"
            icon="sync"
            onPress={() => handleSync('ultrahuman')}
            disabled={syncing}
            style={[styles.syncButton, { borderColor: theme.colors.primary }]}
            compact
          >
            Ultrahuman
          </Button>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.metricPicker}
        >
          {sleepStatsOptions.map((opt) => {
            const isSelected = selectedStat === opt.value;
            const latest = history[0]?.[opt.value as keyof SleepRecord];
            const displayValue = opt.value.includes('minutes')
              ? minutesToHm(latest)
              : latest;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setSelectedStat(opt.value)}
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
                {latest !== undefined && (
                  <Text
                    style={[
                      styles.metricValue,
                      { color: theme.colors.onSurface },
                      isSelected && { color: theme.colors.onPrimary },
                    ]}
                  >
                    {displayValue}
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
              <DataTable.Title style={{ width: 60 }}>Score</DataTable.Title>
              <DataTable.Title style={{ width: 60 }}>RHR</DataTable.Title>
              <DataTable.Title style={{ width: 60 }}>Deep</DataTable.Title>
              <DataTable.Title style={{ width: 50 }}></DataTable.Title>
            </DataTable.Header>

            {history.map((h) => (
              <DataTable.Row key={h.id}>
                <DataTable.Cell style={{ width: 100 }}>{h.date}</DataTable.Cell>
                <DataTable.Cell style={{ width: 60 }}>
                  {h.sleep_score || '-'}
                </DataTable.Cell>
                <DataTable.Cell style={{ width: 60 }}>
                  {h.rhr || '-'}
                </DataTable.Cell>
                <DataTable.Cell style={{ width: 60 }}>
                  {minutesToHm(h.deep_sleep_minutes)}
                </DataTable.Cell>
                <DataTable.Cell style={{ width: 50 }}>
                  <IconButton
                    icon="delete-outline"
                    size={18}
                    onPress={() => handleDelete(h.id)}
                  />
                </DataTable.Cell>
              </DataTable.Row>
            ))}
          </DataTable>
        </ScrollView>
        <View style={{ height: 80 }} />
      </ScrollView>

      <Portal>
        <Dialog
          visible={visible}
          onDismiss={() => setVisible(false)}
          style={[styles.dialog, { backgroundColor: theme.colors.surface }]}
        >
          <Dialog.Title>Add Sleep Entry</Dialog.Title>
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
                  label="Bedtime"
                  value={formData.bedtime}
                  onChangeText={(v) => handleInputChange('bedtime', v)}
                  placeholder="22:30"
                  mode="outlined"
                  style={[styles.input, { flex: 1, marginRight: 8 }]}
                />
                <TextInput
                  label="Wake Time"
                  value={formData.wake_time}
                  onChangeText={(v) => handleInputChange('wake_time', v)}
                  placeholder="06:30"
                  mode="outlined"
                  style={[styles.input, { flex: 1 }]}
                />
              </View>
              <View style={styles.inputRow}>
                <TextInput
                  label="RHR"
                  value={formData.rhr}
                  onChangeText={(v) => handleInputChange('rhr', v)}
                  keyboardType="numeric"
                  mode="outlined"
                  style={[styles.input, { flex: 1, marginRight: 8 }]}
                />
                <TextInput
                  label="HRV"
                  value={formData.hrv}
                  onChangeText={(v) => handleInputChange('hrv', v)}
                  keyboardType="numeric"
                  mode="outlined"
                  style={[styles.input, { flex: 1 }]}
                />
              </View>
              <TextInput
                label="Sleep Score"
                value={formData.sleep_score}
                onChangeText={(v) => handleInputChange('sleep_score', v)}
                keyboardType="numeric"
                mode="outlined"
                style={styles.input}
              />
              <View style={styles.inputRow}>
                <TextInput
                  label="Deep (min)"
                  value={formData.deep_sleep_minutes}
                  onChangeText={(v) =>
                    handleInputChange('deep_sleep_minutes', v)
                  }
                  keyboardType="numeric"
                  mode="outlined"
                  style={[styles.input, { flex: 1, marginRight: 8 }]}
                />
                <TextInput
                  label="REM (min)"
                  value={formData.rem_sleep_minutes}
                  onChangeText={(v) =>
                    handleInputChange('rem_sleep_minutes', v)
                  }
                  keyboardType="numeric"
                  mode="outlined"
                  style={[styles.input, { flex: 1 }]}
                />
              </View>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setVisible(false)}>Cancel</Button>
            <Button mode="contained" onPress={handleSubmit}>
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => setVisible(true)}
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
  color: (opacity = 1) => `rgba(103, 58, 183, ${opacity})`, // Deep Purple
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  style: {
    borderRadius: 16,
  },
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: '#673ab7',
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
  syncContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
    gap: 8,
  },
  syncButton: {},
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
