import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  TextInput,
  Chip,
  IconButton,
  ProgressBar,
  ActivityIndicator,
  Text,
  Portal,
  Dialog,
  Divider,
  List,
  DataTable,
  SegmentedButtons,
  useTheme,
} from 'react-native-paper';
import {
  getPlans,
  getWorkouts,
  getWorkoutStats,
  getLastTrainedMuscles,
  getLastSessionForDay,
  getLastPerformance,
  getExerciseSuggestion,
  addWorkout,
  updateDayExercises,
} from '@/src/services/api';
import {
  WorkoutPlan,
  WorkoutDay,
  WorkoutSession,
  WorkoutLog,
  WorkoutStats,
} from '@/src/services/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// ─── Rest Timer ──────────────────────────────────────────────────────────────

function RestTimer({
  seconds,
  onDone,
}: {
  seconds: number;
  onDone: () => void;
}) {
  const [remaining, setRemaining] = useState(seconds);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (remaining <= 0) {
      onDone();
      return;
    }
    timerRef.current = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [remaining]);

  const progress = remaining / seconds;

  return (
    <Card style={styles.timerCard}>
      <Card.Content style={styles.timerContent}>
        <View style={styles.timerHeader}>
          <MaterialCommunityIcons
            name="timer-outline"
            size={24}
            color="#6200ee"
          />
          <Text style={styles.timerText}>Rest Timer: {remaining}s</Text>
          <Button mode="text" onPress={onDone} compact>
            Skip
          </Button>
        </View>
        <ProgressBar
          progress={progress}
          color="#6200ee"
          style={styles.progressBar}
        />
      </Card.Content>
    </Card>
  );
}

// ─── Muscle Readiness ─────────────────────────────────────────────────────────

function MuscleReadiness({
  day,
  lastTrainedMuscles,
}: {
  day: WorkoutDay;
  lastTrainedMuscles: Record<string, string> | null;
}) {
  if (!lastTrainedMuscles) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const muscles = new Set<string>();
  day.exercises.forEach((ex) => {
    (ex.primary_muscles || '').split(',').forEach((m) => {
      const t = m.trim().toLowerCase();
      if (t) muscles.add(t);
    });
  });

  const muscleStatus = Array.from(muscles).map((m) => {
    const lastDateStr = lastTrainedMuscles[m];
    if (!lastDateStr) return { muscle: m, status: 'ready', days: Infinity };

    const lastDate = new Date(lastDateStr);
    lastDate.setHours(0, 0, 0, 0);
    const diffDays = Math.floor(
      (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays >= 2) return { muscle: m, status: 'ready', days: diffDays };
    if (diffDays >= 1)
      return { muscle: m, status: 'recovering', days: diffDays };
    return { muscle: m, status: 'needs_rest', days: diffDays };
  });

  if (muscleStatus.length === 0) return null;

  const overallStatus = muscleStatus.reduce((acc, curr) => {
    if (curr.status === 'needs_rest') return 'needs_rest';
    if (curr.status === 'recovering' && acc !== 'needs_rest')
      return 'recovering';
    return acc;
  }, 'ready');

  const statusColors = {
    ready: '#4caf50',
    recovering: '#ff9800',
    needs_rest: '#f44336',
  };

  const statusLabels = {
    ready: 'Ready',
    recovering: 'Recovering',
    needs_rest: 'Needs Rest',
  };

  return (
    <Chip
      style={{
        backgroundColor:
          statusColors[overallStatus as keyof typeof statusColors] + '22',
      }}
      textStyle={{
        color: statusColors[overallStatus as keyof typeof statusColors],
        fontSize: 10,
      }}
      compact
    >
      {statusLabels[overallStatus as keyof typeof statusLabels]}
    </Chip>
  );
}

// ─── Active Workout ───────────────────────────────────────────────────────────

function ActiveWorkout({
  day,
  onSaved,
  onCancel,
}: {
  day: WorkoutDay;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [logs, setLogs] = useState<Record<string, any[]>>({});
  const [prevSession, setPrevSession] = useState<WorkoutSession | null>(null);
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [sessionNotes, setSessionNotes] = useState('');
  const [suggestions, setSuggestions] = useState<Record<string, any>>({});
  const [templateUpdate, setTemplateUpdate] = useState<any[] | null>(null);

  useEffect(() => {
    // Initial logs setup
    const init: Record<string, any[]> = {};
    day.exercises.forEach((ex) => {
      init[ex.exercise_id] = Array.from({ length: ex.sets || 3 }, () => ({
        weight: ex.weight ? ex.weight.toString() : '',
        reps: ex.reps ? ex.reps.toString() : '',
        rpe: '',
        notes: '',
        completed: false,
      }));
    });
    setLogs(init);

    // Fetch previous data
    getLastSessionForDay(day.id).then((res) => {
      if (res.data) {
        setPrevSession(res.data);
        if (res.data.notes) setSessionNotes(res.data.notes);
      }
    });

    const exerciseIds = day.exercises.map((ex) => ex.exercise_id).join(',');
    getLastPerformance(exerciseIds).then((res) => {
      const lastPerf = res.data;
      setLogs((prev) => {
        const newLogs = { ...prev };
        day.exercises.forEach((ex) => {
          const perf = lastPerf[ex.exercise_id];
          if (perf && perf.length > 0) {
            const numSets = Math.max(perf.length, ex.sets || 0);
            newLogs[ex.exercise_id] = Array.from(
              { length: numSets },
              (_, i) => ({
                weight:
                  perf[i]?.weight?.toString() ??
                  (ex.weight ? ex.weight.toString() : ''),
                reps:
                  perf[i]?.reps?.toString() ??
                  (ex.reps ? ex.reps.toString() : ''),
                rpe: perf[i]?.rpe?.toString() ?? '',
                notes: perf[i]?.notes ?? '',
                completed: false,
              })
            );
          }
        });
        return newLogs;
      });
    });

    day.exercises.forEach((ex) => {
      const targetReps = ex.reps_max || ex.reps_min || ex.reps || 8;
      const targetRPE = ex.target_rpe || 8;
      getExerciseSuggestion(ex.exercise_id, targetReps, targetRPE).then(
        (res) => {
          setSuggestions((prev) => ({ ...prev, [ex.exercise_id]: res.data }));
        }
      );
    });
  }, [day]);

  const handleChange = (
    exId: string,
    setIdx: number,
    field: string,
    value: string
  ) => {
    setLogs((prev) => ({
      ...prev,
      [exId]: prev[exId].map((s, i) =>
        i === setIdx ? { ...s, [field]: value } : s
      ),
    }));
  };

  const toggleSetComplete = (exId: string, setIdx: number) => {
    setLogs((prev) => {
      const isCompleted = !prev[exId][setIdx].completed;
      if (isCompleted) {
        setRestTimer(90);
      }
      return {
        ...prev,
        [exId]: prev[exId].map((s, i) =>
          i === setIdx ? { ...s, completed: isCompleted } : s
        ),
      };
    });
  };

  const addSet = (exId: string) => {
    setLogs((prev) => ({
      ...prev,
      [exId]: [
        ...prev[exId],
        { weight: '', reps: '', rpe: '', notes: '', completed: false },
      ],
    }));
  };

  const removeSet = (exId: string, setIdx: number) => {
    setLogs((prev) => ({
      ...prev,
      [exId]: prev[exId].filter((_, i) => i !== setIdx),
    }));
  };

  const handleSave = async () => {
    const flatLogs: any[] = [];
    Object.keys(logs).forEach((exId) => {
      logs[exId].forEach((set, i) => {
        if (set.weight !== '' || set.reps !== '') {
          flatLogs.push({
            exercise_id: exId,
            set_number: i + 1,
            weight: set.weight !== '' ? parseFloat(set.weight) : null,
            reps: set.reps !== '' ? parseInt(set.reps) : null,
            rpe: set.rpe !== '' ? parseFloat(set.rpe) : null,
            notes: set.notes || null,
          });
        }
      });
    });

    try {
      await addWorkout({
        day_id: day.id,
        date: new Date().toISOString().split('T')[0],
        notes: sessionNotes || null,
        logs: flatLogs,
      });

      // Template update suggestion logic
      const newDayExercises = day.exercises.map((ex) => {
        const sessionSets = logs[ex.exercise_id].filter(
          (s) => s.weight !== '' || s.reps !== ''
        );
        if (sessionSets.length === 0) return ex;
        const firstSet = sessionSets[0];
        return {
          ...ex,
          sets: sessionSets.length,
          weight:
            firstSet.weight !== '' ? parseFloat(firstSet.weight) : ex.weight,
          reps: firstSet.reps !== '' ? parseInt(firstSet.reps) : ex.reps,
        };
      });

      const hasChanges = newDayExercises.some((ex, i) => {
        const orig = day.exercises[i];
        return (
          ex.sets !== orig.sets ||
          ex.weight !== orig.weight ||
          ex.reps !== orig.reps
        );
      });

      if (hasChanges) {
        setTemplateUpdate(newDayExercises);
      } else {
        onSaved();
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to save session');
    }
  };

  const handleUpdateTemplate = async () => {
    try {
      await updateDayExercises(day.id, templateUpdate!);
      onSaved();
    } catch (err) {
      onSaved();
    }
  };

  const prevMap = (exerciseId: string) => {
    if (!prevSession) return {};
    const sets = prevSession.logs.filter((l) => l.exercise_id === exerciseId);
    const bySet: Record<number, WorkoutLog> = {};
    sets.forEach((s) => {
      bySet[s.set_number] = s;
    });
    return bySet;
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Title style={{ color: '#6200ee' }}>
            {day.name} — {new Date().toLocaleDateString()}
          </Title>
          {prevSession && (
            <Chip mode="outlined" style={{ height: 32 }}>
              Prev: {prevSession.date}
            </Chip>
          )}
        </View>

        {restTimer && (
          <RestTimer seconds={restTimer} onDone={() => setRestTimer(null)} />
        )}

        {day.exercises.map((ex) => {
          const prev = prevMap(ex.exercise_id);
          const suggestion = suggestions[ex.exercise_id];

          return (
            <Card key={ex.exercise_id} style={styles.exerciseCard}>
              <Card.Content>
                <View style={styles.exerciseHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exerciseTitle}>{ex.name}</Text>
                    <View style={styles.targetsContainer}>
                      {ex.reps_min && (
                        <Chip style={styles.targetChip} compact>
                          Target: {ex.reps_min}
                          {ex.reps_max ? `-${ex.reps_max}` : ''}
                        </Chip>
                      )}
                      {suggestion?.suggested_weight && (
                        <Chip
                          style={[
                            styles.targetChip,
                            { backgroundColor: '#e3f2fd' },
                          ]}
                          compact
                        >
                          Sug: {suggestion.suggested_weight}kg
                        </Chip>
                      )}
                    </View>
                  </View>
                </View>

                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderText, { width: 35 }]}>
                      Set
                    </Text>
                    <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>
                      Prev
                    </Text>
                    <Text style={[styles.tableHeaderText, { flex: 1 }]}>
                      kg
                    </Text>
                    <Text style={[styles.tableHeaderText, { flex: 1 }]}>
                      Reps
                    </Text>
                    <Text style={[styles.tableHeaderText, { flex: 0.8 }]}>
                      RPE
                    </Text>
                    <View style={{ width: 30 }} />
                  </View>

                  {logs[ex.exercise_id]?.map((set, i) => {
                    const p = prev[i + 1];
                    const isCompleted = set.completed;

                    return (
                      <View
                        key={i}
                        style={[
                          styles.tableRow,
                          isCompleted && { backgroundColor: '#e8f5e9' },
                        ]}
                      >
                        <TouchableOpacity
                          onPress={() => toggleSetComplete(ex.exercise_id, i)}
                          style={[
                            styles.setNumber,
                            isCompleted && { backgroundColor: '#4caf50' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.setNumberText,
                              isCompleted && { color: '#fff' },
                            ]}
                          >
                            {i + 1}
                          </Text>
                        </TouchableOpacity>

                        <View style={{ flex: 1.5, justifyContent: 'center' }}>
                          <Text style={styles.prevText}>
                            {p ? `${p.weight ?? '—'}kg×${p.reps ?? '—'}` : '—'}
                          </Text>
                        </View>

                        <TextInput
                          style={[styles.input, { flex: 1 }]}
                          dense
                          keyboardType="numeric"
                          value={set.weight}
                          onChangeText={(v) =>
                            handleChange(ex.exercise_id, i, 'weight', v)
                          }
                        />
                        <TextInput
                          style={[styles.input, { flex: 1 }]}
                          dense
                          keyboardType="numeric"
                          value={set.reps}
                          onChangeText={(v) =>
                            handleChange(ex.exercise_id, i, 'reps', v)
                          }
                        />
                        <TextInput
                          style={[styles.input, { flex: 0.8 }]}
                          dense
                          keyboardType="numeric"
                          value={set.rpe}
                          onChangeText={(v) =>
                            handleChange(ex.exercise_id, i, 'rpe', v)
                          }
                        />

                        <IconButton
                          icon="delete-outline"
                          size={18}
                          onPress={() => removeSet(ex.exercise_id, i)}
                        />
                      </View>
                    );
                  })}
                </View>

                <Button
                  icon="plus"
                  mode="text"
                  onPress={() => addSet(ex.exercise_id)}
                  style={{ alignSelf: 'flex-start', marginTop: 8 }}
                  compact
                >
                  Add Set
                </Button>
              </Card.Content>
            </Card>
          );
        })}

        <TextInput
          label="Session notes (optional)"
          value={sessionNotes}
          onChangeText={setSessionNotes}
          multiline
          numberOfLines={2}
          style={styles.sessionNotes}
        />

        <View style={styles.footer}>
          <Button
            mode="contained"
            onPress={handleSave}
            style={{ flex: 1, marginRight: 8 }}
          >
            Finish & Save
          </Button>
          <Button mode="outlined" onPress={onCancel} style={{ flex: 1 }}>
            Cancel
          </Button>
        </View>
      </ScrollView>

      <Portal>
        <Dialog visible={!!templateUpdate} onDismiss={onSaved}>
          <Dialog.Title>Update Template?</Dialog.Title>
          <Dialog.Content>
            <Paragraph>
              You made changes to your weights or reps. Would you like to save
              these as the new template for this day?
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={onSaved}>No</Button>
            <Button onPress={handleUpdateTemplate}>Yes, Update</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

// ─── History Panel ───────────────────────────────────────────────────────────

function HistoryPanel() {
  const [history, setHistory] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWorkouts(30)
      .then((res) => {
        const sorted = res.data.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setHistory(sorted);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <ActivityIndicator style={{ marginTop: 20 }} />;

  return (
    <ScrollView style={styles.container}>
      {history.length === 0 && (
        <Text style={{ textAlign: 'center', marginTop: 20, color: '#666' }}>
          No history yet.
        </Text>
      )}
      {history.map((session) => (
        <List.Accordion
          key={session.id}
          title={`${session.date} — ${session.day_name}`}
          description={session.plan_name}
          left={(props) => <List.Icon {...props} icon="calendar-check" />}
          style={styles.historyAccordion}
        >
          <View style={styles.historyDetails}>
            {session.notes && (
              <Text style={styles.historyNotes}>"{session.notes}"</Text>
            )}
            <DataTable>
              <DataTable.Header>
                <DataTable.Title>Exercise</DataTable.Title>
                <DataTable.Title numeric>Sets</DataTable.Title>
                <DataTable.Title numeric>Volume</DataTable.Title>
              </DataTable.Header>

              {Object.values(
                session.logs.reduce((acc: any, log) => {
                  if (!acc[log.exercise_id]) {
                    acc[log.exercise_id] = {
                      name: log.exercise_name,
                      sets: 0,
                      volume: 0,
                    };
                  }
                  acc[log.exercise_id].sets += 1;
                  acc[log.exercise_id].volume +=
                    (log.weight || 0) * (log.reps || 0);
                  return acc;
                }, {})
              ).map((ex: any, i) => (
                <DataTable.Row key={i}>
                  <DataTable.Cell>{ex.name}</DataTable.Cell>
                  <DataTable.Cell numeric>{ex.sets}</DataTable.Cell>
                  <DataTable.Cell numeric>
                    {Math.round(ex.volume)}kg
                  </DataTable.Cell>
                </DataTable.Row>
              ))}
            </DataTable>
          </View>
        </List.Accordion>
      ))}
    </ScrollView>
  );
}

// ─── Stats Panel ──────────────────────────────────────────────────────────────

function StatsPanel() {
  const [stats, setStats] = useState<WorkoutStats | null>(null);

  useEffect(() => {
    getWorkoutStats().then((res) => setStats(res.data));
  }, []);

  if (!stats) return <ActivityIndicator style={{ marginTop: 20 }} />;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.statsGrid}>
        <Card style={styles.statsCard}>
          <Card.Content>
            <Title style={styles.statsValue}>{stats.totalSessions}</Title>
            <Paragraph style={styles.statsLabel}>Sessions</Paragraph>
          </Card.Content>
        </Card>
        <Card style={styles.statsCard}>
          <Card.Content>
            <Title style={styles.statsValue}>{stats.totalSets}</Title>
            <Paragraph style={styles.statsLabel}>Total Sets</Paragraph>
          </Card.Content>
        </Card>
        <Card style={styles.statsCard}>
          <Card.Content>
            <Title style={styles.statsValue}>{stats.totalPRs}</Title>
            <Paragraph style={styles.statsLabel}>PRs</Paragraph>
          </Card.Content>
        </Card>
      </View>

      {stats.recentPRs.length > 0 && (
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>
              <MaterialCommunityIcons name="trophy" color="#ffc107" size={20} />{' '}
              Recent PRs
            </Title>
            {stats.recentPRs.map((pr, i) => (
              <View key={i} style={styles.prRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.prExercise}>{pr.name}</Text>
                  <Text style={styles.prDate}>{pr.date}</Text>
                </View>
                <Text style={styles.prValue}>
                  {pr.weight}kg × {pr.reps}
                </Text>
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      {stats.muscleVolume.length > 0 && (
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Volume by Muscle</Title>
            {stats.muscleVolume.slice(0, 10).map((m, i) => {
              const max = stats.muscleVolume[0].volume;
              return (
                <View key={i} style={{ marginBottom: 10 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      marginBottom: 2,
                    }}
                  >
                    <Text style={{ fontSize: 12, textTransform: 'capitalize' }}>
                      {m.muscle}
                    </Text>
                    <Text style={{ fontSize: 12 }}>
                      {Math.round(m.volume)}kg
                    </Text>
                  </View>
                  <ProgressBar
                    progress={m.volume / max}
                    color="#6200ee"
                    style={{ height: 6, borderRadius: 3 }}
                  />
                </View>
              );
            })}
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function WorkoutsScreen() {
  const theme = useTheme();
  const [tab, setTab] = useState('start');
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<WorkoutPlan | null>(null);
  const [activeDay, setActiveDay] = useState<WorkoutDay | null>(null);
  const [lastTrainedMuscles, setLastTrainedMuscles] = useState<Record<
    string,
    string
  > | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [plansRes, musclesRes] = await Promise.all([
        getPlans(),
        getLastTrainedMuscles(),
      ]);
      setPlans(plansRes.data);
      setLastTrainedMuscles(musclesRes.data);
    } catch (error) {
      console.error('Error fetching workout data:', error);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (activeDay) {
    return (
      <ActiveWorkout
        day={activeDay}
        onSaved={() => {
          setActiveDay(null);
          setTab('history');
          fetchData();
        }}
        onCancel={() => setActiveDay(null)}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View
        style={[
          styles.tabContainer,
          { backgroundColor: theme.colors.surfaceVariant },
        ]}
      >
        <SegmentedButtons
          value={tab}
          onValueChange={setTab}
          buttons={[
            { value: 'start', label: 'Start', icon: 'play' },
            { value: 'history', label: 'History', icon: 'history' },
            { value: 'stats', label: 'Stats', icon: 'chart-bar' },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      {tab === 'start' && (
        <ScrollView style={styles.container}>
          <Title
            style={[styles.mainTitle, { color: theme.colors.onBackground }]}
          >
            Select a Plan
          </Title>
          {plans.length === 0 && (
            <Text style={styles.emptyText}>
              No plans found. Create one on the web app!
            </Text>
          )}
          <View style={styles.planList}>
            {plans.map((plan) => (
              <Card
                key={plan.id}
                style={[
                  styles.planCard,
                  { backgroundColor: theme.colors.surface },
                  selectedPlan?.id === plan.id && {
                    borderColor: theme.colors.primary,
                    borderWidth: 1.5,
                  },
                ]}
                onPress={() => setSelectedPlan(plan)}
              >
                <Card.Content>
                  <Title style={styles.planName}>{plan.name}</Title>
                  {plan.description && (
                    <Paragraph numberOfLines={1}>{plan.description}</Paragraph>
                  )}
                  <Text
                    style={[
                      styles.planMeta,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {plan.days.length} Days
                  </Text>
                </Card.Content>
              </Card>
            ))}
          </View>

          {selectedPlan && (
            <>
              <Divider style={{ marginVertical: 20 }} />
              <Title
                style={[styles.mainTitle, { color: theme.colors.onBackground }]}
              >
                {selectedPlan.name} Days
              </Title>
              <View style={styles.dayList}>
                {selectedPlan.days.map((day) => (
                  <Card
                    key={day.id}
                    style={[
                      styles.dayCard,
                      { backgroundColor: theme.colors.surface },
                    ]}
                    onPress={() => setActiveDay(day)}
                  >
                    <Card.Content>
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Title style={styles.dayName}>{day.name}</Title>
                          {day.scheduled_days.length > 0 && (
                            <Text
                              style={[
                                styles.scheduledDays,
                                { color: theme.colors.primary },
                              ]}
                            >
                              {day.scheduled_days
                                .map((d) => d.slice(0, 3))
                                .join(', ')}
                            </Text>
                          )}
                        </View>
                        <MuscleReadiness
                          day={day}
                          lastTrainedMuscles={lastTrainedMuscles}
                        />
                      </View>
                      <View style={styles.exerciseChips}>
                        {day.exercises.slice(0, 4).map((ex, i) => (
                          <Chip
                            key={i}
                            style={[
                              styles.exerciseChip,
                              { backgroundColor: theme.colors.surfaceVariant },
                            ]}
                            textStyle={{ fontSize: 10 }}
                            compact
                          >
                            {ex.name}
                          </Chip>
                        ))}
                        {day.exercises.length > 4 && (
                          <Chip
                            style={[
                              styles.exerciseChip,
                              { backgroundColor: theme.colors.surfaceVariant },
                            ]}
                            textStyle={{ fontSize: 10 }}
                            compact
                          >
                            +{day.exercises.length - 4} more
                          </Chip>
                        )}
                      </View>
                    </Card.Content>
                  </Card>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      )}

      {tab === 'history' && <HistoryPanel />}
      {tab === 'stats' && <StatsPanel />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  tabContainer: {
    padding: 16,
  },
  segmentedButtons: {},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
  },
  planList: {
    marginBottom: 16,
  },
  planCard: {
    marginBottom: 12,
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  planMeta: {
    fontSize: 12,
    marginTop: 4,
  },
  dayList: {
    marginBottom: 32,
  },
  dayCard: {
    marginBottom: 12,
  },
  dayName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  scheduledDays: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  exerciseChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  exerciseChip: {
    marginRight: 4,
    marginBottom: 4,
  },
  timerCard: {
    marginBottom: 16,
    backgroundColor: '#f3e5f5',
    borderColor: '#ce93d8',
    borderWidth: 1,
  },
  timerContent: {
    paddingBottom: 8,
  },
  timerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timerText: {
    flex: 1,
    marginLeft: 8,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  exerciseCard: {
    marginBottom: 16,
    elevation: 2,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  exerciseTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  targetsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  targetChip: {
    marginRight: 6,
    marginBottom: 4,
    height: 24,
  },
  table: {
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableHeaderText: {
    fontSize: 11,
    color: '#777',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  setNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  setNumberText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  prevText: {
    fontSize: 10,
    color: '#888',
    textAlign: 'center',
  },
  input: {
    height: 35,
    marginHorizontal: 2,
    fontSize: 13,
    backgroundColor: 'transparent',
  },
  sessionNotes: {
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  footer: {
    flexDirection: 'row',
    marginBottom: 40,
  },
  historyAccordion: {
    backgroundColor: '#fff',
    marginBottom: 4,
  },
  historyDetails: {
    padding: 16,
    backgroundColor: '#fafafa',
  },
  historyNotes: {
    fontStyle: 'italic',
    color: '#666',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statsCard: {
    width: '31%',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  statsValue: {
    color: '#6200ee',
    textAlign: 'center',
    fontSize: 22,
  },
  statsLabel: {
    fontSize: 10,
    textAlign: 'center',
    color: '#666',
  },
  sectionCard: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  prRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  prExercise: {
    fontSize: 14,
    fontWeight: '500',
  },
  prDate: {
    fontSize: 11,
    color: '#888',
  },
  prValue: {
    fontSize: 14,
    color: '#6200ee',
    fontWeight: 'bold',
  },
});
