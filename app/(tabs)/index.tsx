import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Dimensions,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  ActivityIndicator,
  Text,
  Button,
  Chip,
  IconButton,
  Divider,
  useTheme,
  Portal,
  Dialog,
  TextInput,
} from 'react-native-paper';
import {
  getMeasurements,
  getSleepRecords,
  getWorkouts,
  getPlans,
  getPhotoDates,
  getLastTrainedMuscles,
  getMentalHealthEntries,
  syncGoogleFitSleep,
  syncUltrahuman,
  addMeasurement,
} from '@/src/services/api';
import {
  Measurement,
  SleepRecord,
  WorkoutSession,
  WorkoutPlan,
  MentalHealthEntry,
} from '@/src/services/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Body from '@/components/BodyHighlighter';
import { BODY_MAP_MAPPING } from '@/src/constants/muscles';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [allData, setAllData] = useState<any>({
    sleep: [],
    measurements: [],
    sessions: [],
    photoDates: [],
    lastTrainedMuscles: {},
    mentalHealth: [],
  });
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [activeDate, setActiveDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  // Quick Action Dialogs
  const [measureVisible, setMeasureVisible] = useState(false);
  const [weightInput, setWeightInput] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [mRes, sRes, wRes, pRes, phRes, ltRes, mhRes] = await Promise.all([
        getMeasurements(),
        getSleepRecords(),
        getWorkouts(20),
        getPlans(),
        getPhotoDates(),
        getLastTrainedMuscles(),
        getMentalHealthEntries(),
      ]);
      setAllData({
        measurements: mRes.data,
        sleep: sRes.data,
        sessions: wRes.data,
        photoDates: phRes.data.map((d: any) => d.date),
        lastTrainedMuscles: ltRes.data,
        mentalHealth: mhRes.data,
      });
      setPlans(pRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const activeData = useMemo(() => {
    const sleep = allData.sleep.find((s: any) => s.date === activeDate);
    const weight = allData.measurements.find((m: any) => m.date === activeDate);
    const workout = allData.sessions.find((w: any) => w.date === activeDate);
    const hasPhotos = allData.photoDates.includes(activeDate);
    const mentalHealth = allData.mentalHealth.find((m: any) => m.date === activeDate);

    // Muscle Heatmap Data for the specific workout
    const heatmap: any[] = [];
    if (workout) {
      const freq: any = {};
      workout.logs.forEach((log: any) => {
        (log.primary_muscles || '').split(',').forEach((m: string) => {
          const t = m.trim().toLowerCase();
          if (t) freq[t] = (freq[t] || 0) + 1;
        });
      });
      Object.keys(BODY_MAP_MAPPING).forEach((slug) => {
        const muscle = BODY_MAP_MAPPING[slug];
        if (freq[muscle])
          heatmap.push({ slug, intensity: Math.min(freq[muscle], 5) });
      });
    }

    return { sleep, weight, workout, hasPhotos, heatmap, mentalHealth };
  }, [allData, activeDate]);

  const handleQuickWeight = async () => {
    if (!weightInput) return;
    try {
      await addMeasurement({
        date: activeDate,
        bodyweight: parseFloat(weightInput),
      });
      setMeasureVisible(false);
      setWeightInput('');
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Title style={styles.welcome}>Health Tracker</Title>
        <Chip icon="calendar" onPress={() => {}} style={{ height: 32 }}>
          {activeDate}
        </Chip>
      </View>

      {/* Quick Summary Cards */}
      <View style={styles.statusGrid}>
        <Card style={styles.statusCard}>
          <Card.Content style={styles.statusContent}>
            <MaterialCommunityIcons name="bed" size={20} color="#673ab7" />
            <Text style={styles.statusVal}>
              {activeData.sleep?.sleep_score || '-'}
            </Text>
            <Text style={styles.statusLab}>Sleep</Text>
          </Card.Content>
        </Card>
        <Card style={styles.statusCard}>
          <Card.Content style={styles.statusContent}>
            <MaterialCommunityIcons name="dumbbell" size={20} color="#f44336" />
            <MaterialCommunityIcons
              name={activeData.workout ? 'check-circle' : 'circle-outline'}
              size={18}
              color={activeData.workout ? '#4caf50' : '#ccc'}
            />
            <Text style={styles.statusLab}>Workout</Text>
          </Card.Content>
        </Card>
        <Card style={styles.statusCard}>
          <Card.Content style={styles.statusContent}>
            <MaterialCommunityIcons
              name="scale-bathroom"
              size={20}
              color="#2196f3"
            />
            <Text style={styles.statusVal}>
              {activeData.weight?.bodyweight || '-'}
            </Text>
            <Text style={styles.statusLab}>Weight</Text>
          </Card.Content>
        </Card>
      </View>

      {/* Mental Health Section */}
      {activeData.mentalHealth && (
        <Card style={styles.heatmapCard}>
          <Card.Content>
            <View style={styles.heatmapHeader}>
              <MaterialCommunityIcons name="heart-pulse" size={20} color="#9c27b0" />
              <Title style={{ fontSize: 16, marginLeft: 8 }}>Mental Health</Title>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 }}>
              {[
                { key: 'energy', label: 'Energy' },
                { key: 'mood', label: 'Mood' },
                { key: 'composure', label: 'Composure' },
                { key: 'physicality', label: 'Physicality' },
                { key: 'connectivity', label: 'Connectivity' },
              ].map((m) => {
                const val = activeData.mentalHealth[m.key];
                const label = val === -1 ? 'Low' : val === 1 ? 'High' : 'Balanced';
                const color = val === -1 ? '#f44336' : val === 1 ? '#ff9800' : '#4caf50';
                return (
                  <View key={m.key} style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 10, opacity: 0.6 }}>{m.label}</Text>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color }}>{label}</Text>
                  </View>
                );
              })}
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Muscle Heatmap Section */}
      <Card style={styles.heatmapCard}>
        <Card.Content>
          <View style={styles.heatmapHeader}>
            <Title style={{ fontSize: 16 }}>Muscle Activity</Title>
            {activeData.workout && (
              <Chip textStyle={{ fontSize: 10 }}>
                {activeData.workout.day_name}
              </Chip>
            )}
          </View>
          <View style={styles.bodyContainer}>
            <View style={{ flex: 1, height: 200 }}>
              <Body
                side="front"
                data={activeData.heatmap}
                scale={0.8}
                theme={theme.dark ? 'dark' : 'light'}
              />
            </View>
            <View style={{ flex: 1, height: 200 }}>
              <Body
                side="back"
                data={activeData.heatmap}
                scale={0.8}
                theme={theme.dark ? 'dark' : 'light'}
              />
            </View>
          </View>
          {!activeData.workout && (
            <Text style={styles.emptyHeatmap}>
              No workout logged for this day
            </Text>
          )}
        </Card.Content>
      </Card>

      {/* Quick Actions */}
      <View style={styles.actionsRow}>
        <Button
          mode="contained"
          icon="plus"
          onPress={() => setMeasureVisible(true)}
          style={styles.actionBtn}
        >
          Measure
        </Button>
        <Button
          mode="contained-tonal"
          icon="play"
          onPress={() => router.push('/workouts')}
          style={styles.actionBtn}
        >
          Workout
        </Button>
      </View>

      {/* Plan Progress */}
      <Title style={styles.sectionTitle}>Active Plans</Title>
      {plans.length === 0 && (
        <Card style={{ marginBottom: 20 }}>
          <Card.Content>
            <Text>No active plans. Create one to get started!</Text>
            <Button onPress={() => router.push('/workouts/plan-builder')}>
              Create Plan
            </Button>
          </Card.Content>
        </Card>
      )}
      {plans.map((plan) => (
        <Card
          key={plan.id}
          style={styles.planCard}
          onPress={() => router.push(`/workouts/plan-builder?id=${plan.id}`)}
        >
          <Card.Content>
            <View style={styles.planHeader}>
              <Title style={{ fontSize: 15 }}>{plan.name}</Title>
              <Text style={{ fontSize: 12, opacity: 0.6 }}>
                {plan.days.length} Days
              </Text>
            </View>
            <Paragraph numberOfLines={1}>{plan.description}</Paragraph>
          </Card.Content>
        </Card>
      ))}

      <Portal>
        <Dialog
          visible={measureVisible}
          onDismiss={() => setMeasureVisible(false)}
        >
          <Dialog.Title>Log Weight</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Weight (kg)"
              value={weightInput}
              onChangeText={setWeightInput}
              keyboardType="numeric"
              autoFocus
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setMeasureVisible(false)}>Cancel</Button>
            <Button onPress={handleQuickWeight}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  welcome: { fontSize: 24, fontWeight: 'bold' },
  statusGrid: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  statusCard: { flex: 1, borderRadius: 12 },
  statusContent: { alignItems: 'center', gap: 4 },
  statusVal: { fontSize: 18, fontWeight: 'bold' },
  statusLab: { fontSize: 10, opacity: 0.6 },
  heatmapCard: { marginBottom: 20, borderRadius: 12 },
  heatmapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bodyContainer: { flexDirection: 'row', height: 200 },
  emptyHeatmap: { textAlign: 'center', opacity: 0.4, paddingVertical: 20 },
  actionsRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  actionBtn: { flex: 1 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  planCard: { marginBottom: 10, borderRadius: 12 },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
