import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  IconButton,
  Divider,
  useTheme,
  Portal,
  Modal,
} from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getPlans, createPlan, updatePlan } from '@/src/services/api';
import ExerciseLibrary from '@/components/ExerciseLibrary';

export default function PlanBuilderScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [days, setDays] = useState<any[]>([]);
  const [libraryVisible, setLibraryVisible] = useState(false);
  const [activeDayIdx, setActiveDayIdx] = useState<number | null>(null);

  useEffect(() => {
    if (id) {
      getPlans().then((res) => {
        const plan = res.data.find((p) => p.id === parseInt(id as string));
        if (plan) {
          setName(plan.name);
          setDescription(plan.description || '');
          setDays(plan.days);
        }
      });
    }
  }, [id]);

  const addDay = () => {
    setDays([
      ...days,
      { name: `Day ${days.length + 1}`, exercises: [], scheduled_days: [] },
    ]);
  };

  const removeDay = (idx: number) => {
    setDays(days.filter((_, i) => i !== idx));
  };

  const addExercise = (exercise: any) => {
    if (activeDayIdx === null) return;
    const newDays = [...days];
    newDays[activeDayIdx].exercises.push({
      exercise_id: exercise.id,
      name: exercise.name,
      sets: 3,
      reps: 10,
      weight: 0,
    });
    setDays(newDays);
    setLibraryVisible(false);
  };

  const updateExercise = (
    dayIdx: number,
    exIdx: number,
    field: string,
    value: any
  ) => {
    const newDays = [...days];
    newDays[dayIdx].exercises[exIdx][field] = value;
    setDays(newDays);
  };

  const removeExercise = (dayIdx: number, exIdx: number) => {
    const newDays = [...days];
    newDays[dayIdx].exercises = newDays[dayIdx].exercises.filter(
      (_: any, i: number) => i !== exIdx
    );
    setDays(newDays);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a plan name');
      return;
    }
    try {
      if (id) {
        await updatePlan(parseInt(id as string), { name, description, days });
      } else {
        await createPlan({ name, description, days });
      }
      router.back();
    } catch (e) {
      Alert.alert('Error', 'Failed to save plan');
    }
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView>
        <TextInput
          label="Plan Name"
          value={name}
          onChangeText={setName}
          style={styles.input}
        />
        <TextInput
          label="Description (Optional)"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={2}
          style={styles.input}
        />

        <View style={styles.daysHeader}>
          <Text style={styles.sectionTitle}>Workout Days</Text>
          <Button icon="plus" onPress={addDay}>
            Add Day
          </Button>
        </View>

        {days.map((day, dIdx) => (
          <Card key={dIdx} style={styles.dayCard}>
            <Card.Content>
              <View style={styles.dayTitleRow}>
                <TextInput
                  value={day.name}
                  onChangeText={(t) => {
                    const newDays = [...days];
                    newDays[dIdx].name = t;
                    setDays(newDays);
                  }}
                  style={[styles.dayNameInput, { flex: 1 }]}
                  dense
                />
                <IconButton
                  icon="delete"
                  size={20}
                  onPress={() => removeDay(dIdx)}
                />
              </View>

              {day.exercises.map((ex: any, eIdx: number) => (
                <View key={eIdx} style={styles.exerciseRow}>
                  <View style={{ flex: 2 }}>
                    <Text style={styles.exerciseName}>{ex.name}</Text>
                    <View style={styles.exInputRow}>
                      <TextInput
                        label="Sets"
                        value={ex.sets?.toString()}
                        onChangeText={(v) =>
                          updateExercise(dIdx, eIdx, 'sets', parseInt(v) || 0)
                        }
                        keyboardType="numeric"
                        style={styles.smallInput}
                        dense
                      />
                      <TextInput
                        label="Reps"
                        value={ex.reps?.toString()}
                        onChangeText={(v) =>
                          updateExercise(dIdx, eIdx, 'reps', parseInt(v) || 0)
                        }
                        keyboardType="numeric"
                        style={styles.smallInput}
                        dense
                      />
                    </View>
                  </View>
                  <IconButton
                    icon="close-circle-outline"
                    size={20}
                    onPress={() => removeExercise(dIdx, eIdx)}
                  />
                </View>
              ))}

              <Button
                mode="outlined"
                icon="plus"
                onPress={() => {
                  setActiveDayIdx(dIdx);
                  setLibraryVisible(true);
                }}
                style={{ marginTop: 8 }}
              >
                Add Exercise
              </Button>
            </Card.Content>
          </Card>
        ))}

        <Button mode="contained" onPress={handleSave} style={styles.saveButton}>
          Save Plan
        </Button>
        <View style={{ height: 40 }} />
      </ScrollView>

      <Portal>
        <Modal
          visible={libraryVisible}
          onDismiss={() => setLibraryVisible(false)}
          contentContainerStyle={[
            styles.modalContent,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Exercise</Text>
            <IconButton icon="close" onPress={() => setLibraryVisible(false)} />
          </View>
          <Divider />
          <View style={{ flex: 1 }}>
            <ExerciseLibrary onAddExercise={addExercise} showAdd />
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  input: {
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  daysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  dayCard: {
    marginBottom: 16,
  },
  dayTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayNameInput: {
    backgroundColor: 'transparent',
    fontWeight: 'bold',
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  exInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  smallInput: {
    width: 60,
    height: 40,
    backgroundColor: 'transparent',
    fontSize: 12,
  },
  saveButton: {
    marginTop: 24,
    paddingVertical: 4,
  },
  modalContent: {
    margin: 20,
    borderRadius: 12,
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
