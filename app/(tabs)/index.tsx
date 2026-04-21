import React, { useEffect, useState, useCallback } from 'react';
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
  ActivityIndicator,
  Text,
  Button,
  Chip,
  IconButton,
  Divider,
  useTheme,
} from 'react-native-paper';
import { LineChart } from 'react-native-chart-kit';
import {
  getMeasurements,
  getSleepRecords,
  getWorkouts,
  getWorkoutStats,
  getLastTrainedMuscles,
  syncGoogleFitSleep,
  syncUltrahuman,
} from '@/src/services/api';
import {
  Measurement,
  SleepRecord,
  WorkoutSession,
  WorkoutStats,
} from '@/src/services/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [sleepRecords, setSleepRecords] = useState<SleepRecord[]>([]);
  const [recentWorkouts, setRecentWorkouts] = useState<WorkoutSession[]>([]);
  const [stats, setStats] = useState<WorkoutStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [mRes, sRes, wRes, stRes] = await Promise.all([
        getMeasurements(),
        getSleepRecords(),
        getWorkouts(5),
        getWorkoutStats(),
      ]);
      setMeasurements(mRes.data);
      setSleepRecords(sRes.data);
      setRecentWorkouts(wRes.data);
      setStats(stRes.data);
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

  const handleSync = async (type: 'google' | 'ultrahuman') => {
    setSyncing(true);
    try {
      if (type === 'google') {
        await syncGoogleFitSleep(2, 'UTC');
      } else {
        await syncUltrahuman(2);
      }
      fetchData();
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const todaySleep = sleepRecords.find((s) => s.date === today);
  const todayWeight = measurements.find((m) => m.date === today);
  const todayWorkout = recentWorkouts.find((w) => w.date === today);

  const weightChartData =
    measurements.length > 0
      ? {
          labels: measurements
            .slice(0, 7)
            .reverse()
            .map((m) => {
              const d = new Date(m.date);
              return `${d.getMonth() + 1}/${d.getDate()}`;
            }),
          datasets: [
            {
              data: measurements
                .slice(0, 7)
                .reverse()
                .map((m) => m.bodyweight || 0),
            },
          ],
        }
      : null;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Title style={styles.welcome}>Summary</Title>
        <View style={styles.syncButtons}>
          <IconButton
            icon="google"
            size={20}
            onPress={() => handleSync('google')}
            disabled={syncing}
          />
          <IconButton
            icon="sync"
            size={20}
            onPress={() => handleSync('ultrahuman')}
            disabled={syncing}
          />
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Button
          mode="contained"
          icon="play"
          onPress={() => router.push('/workouts')}
          style={styles.actionBtn}
        >
          Start
        </Button>
        <Button
          mode="outlined"
          icon="scale-bathroom"
          onPress={() => router.push('/measurements')}
          style={styles.actionBtn}
        >
          Weight
        </Button>
        <Button
          mode="outlined"
          icon="camera"
          onPress={() => router.push('/photos')}
          style={styles.actionBtn}
        >
          Photo
        </Button>
      </View>

      {/* Today's Status */}
      <View style={styles.statusGrid}>
        <Card style={styles.statusCard}>
          <Card.Content style={styles.statusContent}>
            <MaterialCommunityIcons
              name="bed-outline"
              size={24}
              color="#673ab7"
            />
            <Text style={styles.statusLabel}>Sleep</Text>
            <Text style={styles.statusValue}>
              {todaySleep?.sleep_score || '-'}
            </Text>
          </Card.Content>
        </Card>
        <Card style={styles.statusCard}>
          <Card.Content style={styles.statusContent}>
            <MaterialCommunityIcons name="dumbbell" size={24} color="#f44336" />
            <Text style={styles.statusLabel}>Workout</Text>
            <MaterialCommunityIcons
              name={todayWorkout ? 'check-circle' : 'circle-outline'}
              size={20}
              color={todayWorkout ? '#4caf50' : '#ccc'}
            />
          </Card.Content>
        </Card>
        <Card style={styles.statusCard}>
          <Card.Content style={styles.statusContent}>
            <MaterialCommunityIcons
              name="scale-bathroom"
              size={24}
              color="#2196f3"
            />
            <Text style={styles.statusLabel}>Weight</Text>
            <Text style={styles.statusValue}>
              {todayWeight?.bodyweight || '-'}
            </Text>
          </Card.Content>
        </Card>
      </View>

      {/* Weight Trend */}
      {weightChartData && (
        <Card style={styles.chartCard}>
          <Card.Content>
            <Title style={styles.chartTitle}>Weight Trend (kg)</Title>
            <LineChart
              data={weightChartData}
              width={width - 48}
              height={180}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
              }}
              bezier
              style={styles.chart}
            />
          </Card.Content>
        </Card>
      )}

      {/* Recent Activity */}
      <Title style={styles.sectionTitle}>Recent Activity</Title>
      {recentWorkouts.slice(0, 3).map((w, i) => (
        <Card
          key={i}
          style={styles.activityCard}
          onPress={() => router.push('/workouts')}
        >
          <Card.Content style={styles.activityContent}>
            <View style={styles.activityIcon}>
              <MaterialCommunityIcons name="run" size={24} color="#666" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.activityTitle}>
                {w.day_name || 'Workout'}
              </Text>
              <Text style={styles.activitySubtitle}>
                {w.date} • {w.plan_name}
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color="#ccc"
            />
          </Card.Content>
        </Card>
      ))}

      {/* Muscle Readiness Placeholder */}
      <Card style={styles.infoCard}>
        <Card.Content>
          <View style={styles.infoHeader}>
            <MaterialCommunityIcons name="arm-flex" size={24} color="#ff9800" />
            <Title style={styles.infoTitle}>Muscle Recovery</Title>
          </View>
          <Paragraph style={styles.infoText}>
            Go to the Workout tab to see detailed recovery status for your
            scheduled plan.
          </Paragraph>
          <Button mode="text" onPress={() => router.push('/workouts')}>
            View Readiness
          </Button>
        </Card.Content>
      </Card>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const chartConfig = {
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 1,
  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  style: {
    borderRadius: 16,
  },
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: '#fff',
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  welcome: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  syncButtons: {
    flexDirection: 'row',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  actionBtn: {
    flex: 1,
    marginHorizontal: 4,
  },
  statusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statusCard: {
    width: '31%',
    borderRadius: 12,
    elevation: 2,
  },
  statusContent: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  statusLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
  },
  chartCard: {
    marginBottom: 24,
    borderRadius: 12,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    marginBottom: 8,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  activityCard: {
    marginBottom: 8,
    borderRadius: 10,
  },
  activityContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  activitySubtitle: {
    fontSize: 12,
    color: '#888',
  },
  infoCard: {
    marginTop: 16,
    backgroundColor: '#fff3e0',
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoTitle: {
    marginLeft: 8,
    fontSize: 16,
    color: '#e65100',
  },
  infoText: {
    fontSize: 13,
    color: '#5d4037',
  },
});
