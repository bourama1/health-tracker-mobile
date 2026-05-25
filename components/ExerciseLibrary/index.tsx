import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import {
  Text,
  TextInput,
  Searchbar,
  Chip,
  Card,
  Portal,
  Dialog,
  Button,
  Divider,
  IconButton,
  useTheme,
  SegmentedButtons,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Body from '@/components/BodyHighlighter';
import { BODY_MAP_MAPPING } from '@/src/constants/muscles';
import {
  getExercises,
  getExerciseFilters,
  getExerciseDetail,
} from '@/src/services/api';
// Need to add these to api.ts if missing

const MUSCLE_COLORS: Record<string, string> = {
  chest: '#e57373',
  shoulders: '#ff8a65',
  biceps: '#ffb74d',
  triceps: '#ffd54f',
  forearms: '#fff176',
  abdominals: '#aed581',
  lats: '#4fc3f7',
  'middle back': '#4dd0e1',
  'lower back': '#4db6ac',
  traps: '#81c784',
  quadriceps: '#9575cd',
  hamstrings: '#7986cb',
  glutes: '#f06292',
  calves: '#a1887f',
  neck: '#90a4ae',
  adductors: '#ce93d8',
  abductors: '#f48fb1',
};

// ─── Exercise Detail Component ───────────────────────────────────────────────

function ExerciseDetail({
  exerciseId,
  visible,
  onClose,
  onAdd,
}: {
  exerciseId: string | null;
  visible: boolean;
  onClose: () => void;
  onAdd?: (ex: any) => void;
}) {
  const [ex, setEx] = useState<any>(null);
  const theme = useTheme();

  useEffect(() => {
    if (!visible || !exerciseId) return;
    setEx(null);
    getExerciseDetail(exerciseId).then((res) => setEx(res.data));
  }, [visible, exerciseId]);

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onClose} style={styles.detailDialog}>
        <Dialog.Title>{ex?.name || 'Loading...'}</Dialog.Title>
        <Dialog.ScrollArea style={{ maxHeight: 400 }}>
          <ScrollView contentContainerStyle={{ paddingVertical: 10 }}>
            {!ex ? (
              <ActivityIndicator />
            ) : (
              <>
                <View style={styles.metaRow}>
                  {ex.level && <Chip style={styles.metaChip}>{ex.level}</Chip>}
                  {ex.category && (
                    <Chip style={styles.metaChip}>{ex.category}</Chip>
                  )}
                </View>

                <Text style={styles.sectionTitle}>Muscles</Text>
                <View style={styles.chipRow}>
                  {(ex.primary_muscles || '')
                    .split(',')
                    .map((m: string, i: number) => (
                      <Chip
                        key={i}
                        style={{
                          backgroundColor:
                            MUSCLE_COLORS[m.trim().toLowerCase()] || '#ccc',
                          marginRight: 4,
                          marginBottom: 4,
                        }}
                        textStyle={{ color: '#fff', fontSize: 10 }}
                      >
                        {m.trim()}
                      </Chip>
                    ))}
                </View>

                <Text style={styles.sectionTitle}>Instructions</Text>
                {(Array.isArray(ex.instructions)
                  ? ex.instructions
                  : [ex.instructions]
                ).map((step: string, i: number) => (
                  <Text key={i} style={styles.stepText}>
                    {i + 1}. {step}
                  </Text>
                ))}
              </>
            )}
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          {onAdd && (
            <Button
              onPress={() => {
                onAdd(ex);
                onClose();
              }}
            >
              Add
            </Button>
          )}
          <Button onPress={onClose}>Close</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ExerciseLibraryScreen({
  onAddExercise,
  showAdd = false,
}: {
  onAddExercise?: (ex: any) => void;
  showAdd?: boolean;
}) {
  const theme = useTheme();
  const [exercises, setExercises] = useState<any[]>([]);
  const [filters, setFilters] = useState<any>({});
  const [search, setSearch] = useState('');
  const [activeMuscle, setActiveMuscle] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [view, setView] = useState<'front' | 'back'>('front');

  useEffect(() => {
    getExerciseFilters().then((res) => setFilters(res.data));
  }, []);

  const fetchExercises = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getExercises({
        search,
        muscle: activeMuscle,
      });
      setExercises(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, activeMuscle]);

  useEffect(() => {
    const timer = setTimeout(fetchExercises, 300);
    return () => clearTimeout(timer);
  }, [fetchExercises]);

  const bodyData = activeMuscle
    ? Object.keys(BODY_MAP_MAPPING)
        .filter((slug) => BODY_MAP_MAPPING[slug] === activeMuscle.toLowerCase())
        .map((slug) => ({ slug, intensity: 1 }))
    : [];

  const handleBodyPartPress = (part: any) => {
    const mapped = BODY_MAP_MAPPING[part.slug];
    if (mapped) {
      setActiveMuscle(activeMuscle === mapped ? '' : mapped);
    }
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Searchbar
        placeholder="Search exercises..."
        onChangeText={setSearch}
        value={search}
        style={styles.searchBar}
      />

      <ScrollView>
        <Card style={styles.bodyCard}>
          <Card.Content style={styles.bodyContent}>
            <View style={styles.bodyWrapper}>
              <SegmentedButtons
                value={view}
                onValueChange={(v) => setView(v as any)}
                buttons={[
                  { value: 'front', label: 'Front' },
                  { value: 'back', label: 'Back' },
                ]}
                density="small"
                style={styles.viewToggle}
              />
              <View style={styles.bodyContainer}>
                <Body
                  side={view}
                  data={bodyData}
                  onBodyPartPress={handleBodyPartPress}
                  colors={[theme.colors.primary, theme.colors.primary]}
                  scale={0.7}
                  theme={theme.dark ? 'dark' : 'light'}
                />
              </View>
            </View>

            <View style={styles.muscleList}>
              <Text style={styles.filterTitle}>Muscles</Text>
              <View style={styles.chipRow}>
                {(filters.muscles || []).map((m: string) => (
                  <Chip
                    key={m}
                    selected={activeMuscle === m}
                    onPress={() => setActiveMuscle(activeMuscle === m ? '' : m)}
                    style={styles.muscleChip}
                    textStyle={{ fontSize: 10 }}
                    compact
                  >
                    {m}
                  </Chip>
                ))}
              </View>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>
            {exercises.length} Exercises found
          </Text>
          {activeMuscle !== '' && (
            <Button mode="text" onPress={() => setActiveMuscle('')} compact>
              Clear Filter
            </Button>
          )}
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 20 }} />
        ) : (
          <View style={styles.exerciseGrid}>
            {exercises.map((ex) => (
              <Card
                key={ex.id}
                style={styles.exerciseCard}
                onPress={() => setDetailId(ex.id)}
              >
                <Card.Content>
                  <Text style={styles.exerciseName} numberOfLines={2}>
                    {ex.name}
                  </Text>
                  <View style={styles.exerciseMeta}>
                    <Text style={styles.exerciseSub}>{ex.level}</Text>
                    {showAdd && (
                      <IconButton
                        icon="plus"
                        size={16}
                        onPress={() => onAddExercise?.(ex)}
                        style={{ margin: 0 }}
                      />
                    )}
                  </View>
                </Card.Content>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>

      <ExerciseDetail
        exerciseId={detailId}
        visible={!!detailId}
        onClose={() => setDetailId(null)}
        onAdd={showAdd ? onAddExercise : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  searchBar: {
    marginBottom: 16,
    elevation: 2,
  },
  bodyCard: {
    marginBottom: 16,
  },
  bodyContent: {
    flexDirection: 'row',
  },
  bodyWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  viewToggle: {
    marginBottom: 8,
    width: 120,
  },
  bodyContainer: {
    height: 250,
    width: 150,
  },
  muscleList: {
    flex: 1,
    paddingLeft: 12,
  },
  filterTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  muscleChip: {
    marginRight: 4,
    marginBottom: 4,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultsCount: {
    fontSize: 12,
    opacity: 0.6,
  },
  exerciseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  exerciseCard: {
    width: '48%',
    marginBottom: 12,
  },
  exerciseName: {
    fontWeight: 'bold',
    fontSize: 13,
    height: 36,
  },
  exerciseMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  exerciseSub: {
    fontSize: 10,
    opacity: 0.6,
  },
  detailDialog: {
    borderRadius: 12,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  metaChip: {
    marginRight: 6,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 6,
  },
  stepText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
});
