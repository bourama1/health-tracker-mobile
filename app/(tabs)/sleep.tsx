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
  Chip,
} from 'react-native-paper';
import { LineChart } from 'react-native-chart-kit';
import {
  getSleepRecords,
  addSleepRecord,
  updateSleepRecord,
} from '@/src/services/api';
import { SleepRecord } from '@/src/services/types';
import AiInsights from '@/components/AiInsights';
import Sparkline from '@/components/Common/Sparkline';
import { addTrendline, getGradientColor } from '@/src/utils/chartUtils';

const { width } = Dimensions.get('window');

const sleepMetrics = [
  { label: 'Sleep Score', value: 'sleep_score', color: '#6200ee' },
  { label: 'Recovery Index', value: 'recovery_index', color: '#03dac4' },
  { label: 'Deep Sleep', value: 'deep_sleep_minutes', color: '#1976d2' },
  { label: 'REM Sleep', value: 'rem_sleep_minutes', color: '#9c27b0' },
];

export default function SleepScreen() {
  const theme = useTheme();
  const [records, setRecords] = useState<SleepRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState('sleep_score');

  const fetchData = useCallback(async () => {
    try {
      const res = await getSleepRecords();
      setRecords(res.data);
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
    sleepMetrics.forEach((opt) => {
      const vals = records
        .map((m: any) => parseFloat(m[opt.value]))
        .filter((v) => !isNaN(v));
      if (vals.length > 0) {
        ranges[opt.value] = { min: Math.min(...vals), max: Math.max(...vals) };
      }
    });
    return ranges;
  }, [records]);

  const chartData = useMemo(() => {
    const data = records
      .slice()
      .reverse()
      .map((r: any) => ({
        date: r.date,
        value: parseFloat(r[selectedMetric]) || 0,
      }))
      .filter((d) => d.value > 0);
    return addTrendline(data);
  }, [records, selectedMetric]);

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />;

  const currentOption = sleepMetrics.find((o) => o.value === selectedMetric);

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView>
        <Title style={styles.headerTitle}>Sleep Analysis</Title>

        <Card style={styles.chartCard}>
          <Card.Content>
            <Title style={{ fontSize: 16 }}>{currentOption?.label} Trend</Title>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: 8 }}
            >
              {sleepMetrics.map((opt) => (
                <Chip
                  key={opt.value}
                  selected={selectedMetric === opt.value}
                  onPress={() => setSelectedMetric(opt.value)}
                  style={styles.metricChip}
                >
                  {opt.label}
                </Chip>
              ))}
            </ScrollView>

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
                    },
                    {
                      data: chartData.map((d) => d.trend),
                      color: (opacity = 1) => `rgba(255, 112, 67, ${opacity})`,
                      withDots: false,
                    },
                  ],
                }}
                width={width - 64}
                height={180}
                chartConfig={{
                  backgroundGradientFrom: theme.colors.surface,
                  backgroundGradientTo: theme.colors.surface,
                  color: (opacity = 1) => theme.colors.onSurface,
                  labelColor: (opacity = 1) => theme.colors.onSurfaceVariant,
                  decimalPlaces: 0,
                }}
                bezier
                style={{ marginTop: 16, borderRadius: 12 }}
              />
            ) : (
              <View style={styles.noData}>
                <Text>Not enough data</Text>
              </View>
            )}
            <AiInsights data={records.slice(0, 14)} contextType="sleep" />
          </Card.Content>
        </Card>

        <Title style={styles.sectionTitle}>Overview</Title>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.sparkRow}
        >
          {sleepMetrics.map((opt) => {
            const vals = records
              .slice()
              .reverse()
              .map((r: any) => ({ value: parseFloat(r[opt.value]) }))
              .filter((d) => !isNaN(d.value));

            if (vals.length < 2) return null;

            return (
              <Card key={opt.value} style={styles.sparkCard}>
                <Card.Content>
                  <Text style={styles.sparkLabel}>{opt.label}</Text>
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
            <DataTable.Title numeric>Score</DataTable.Title>
            <DataTable.Title numeric>Recov</DataTable.Title>
            <DataTable.Title numeric>Deep</DataTable.Title>
          </DataTable.Header>

          {records.map((r: any) => (
            <DataTable.Row key={r.id}>
              <DataTable.Cell>
                {r.date.split('-').slice(1).join('/')}
              </DataTable.Cell>
              <DataTable.Cell numeric>
                <Text
                  style={{
                    color: getGradientColor(
                      r.sleep_score,
                      statsRanges.sleep_score?.max,
                      statsRanges.sleep_score?.min
                    ),
                    fontWeight: 'bold',
                  }}
                >
                  {r.sleep_score || '-'}
                </Text>
              </DataTable.Cell>
              <DataTable.Cell numeric>
                <Text
                  style={{
                    color: getGradientColor(
                      r.recovery_index,
                      statsRanges.recovery_index?.max,
                      statsRanges.recovery_index?.min
                    ),
                  }}
                >
                  {r.recovery_index || '-'}
                </Text>
              </DataTable.Cell>
              <DataTable.Cell numeric>
                {r.deep_sleep_minutes || '-'}
              </DataTable.Cell>
            </DataTable.Row>
          ))}
        </DataTable>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  chartCard: { marginBottom: 16, borderRadius: 12, elevation: 2 },
  metricChip: { marginRight: 8, height: 32 },
  noData: { height: 180, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  sparkRow: { flexDirection: 'row', marginBottom: 16 },
  sparkCard: { marginRight: 12, width: 130, borderRadius: 12 },
  sparkLabel: { fontSize: 10, opacity: 0.6 },
  sparkValue: { fontSize: 18, fontWeight: 'bold' },
  table: { backgroundColor: '#fff', borderRadius: 12, elevation: 1 },
});
