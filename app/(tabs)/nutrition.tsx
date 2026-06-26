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
  SegmentedButtons,
  ProgressBar,
} from 'react-native-paper';
import { Dimensions } from 'react-native';
import {
  getNutritionDiary,
  getNutritionSummary,
  addNutritionMeal,
  deleteNutritionMeal,
} from '@/src/services/api';

const { width } = Dimensions.get('window');

const MEAL_NAMES = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

const todayStr = () => new Date().toISOString().split('T')[0];
const weekAgo = () => {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().split('T')[0];
};

const MacroBar = ({
  label,
  value,
  color,
  max = 100,
}: {
  label: string;
  value: number;
  color: string;
  max?: number;
}) => (
  <View style={{ marginBottom: 12 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ fontSize: 12 }}>{label}</Text>
      <Text style={{ fontSize: 12, fontWeight: 'bold', color }}>
        {Math.round(value)}g
      </Text>
    </View>
    <ProgressBar
      progress={Math.min(value / max, 1)}
      color={color}
      style={{ height: 8, borderRadius: 4, marginTop: 4 }}
    />
  </View>
);

export default function NutritionScreen() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [meals, setMeals] = useState<any[]>([]);
  const [diaries, setDiaries] = useState<any[]>([]);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [form, setForm] = useState({
    date: todayStr(),
    meal_name: 'Breakfast',
    food_name: '',
    energy_value: '',
    protein: '',
    carbohydrates: '',
    fat: '',
    fiber: '',
    sugar: '',
    serving_size: '',
    serving_unit: '',
  });

  const fetchData = useCallback(async () => {
    try {
      const [mealRes, summaryRes] = await Promise.all([
        getNutritionDiary(weekAgo(), todayStr()),
        getNutritionSummary(),
      ]);
      setMeals(mealRes.data.items || []);
      setDiaries(summaryRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const todayMeals = useMemo(
    () => meals.filter((m) => m.date === todayStr()),
    [meals]
  );

  const dailyTotals = useMemo(() => {
    const totals = {
      calories: 0,
      protein: 0,
      carbohydrates: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
    };
    todayMeals.forEach((m) => {
      const nc = m.nutritional_contents || {};
      totals.calories += nc.energy?.value || 0;
      totals.protein += nc.protein || 0;
      totals.carbohydrates += nc.carbohydrates || 0;
      totals.fat += nc.fat || 0;
      totals.fiber += nc.fiber || 0;
      totals.sugar += nc.sugar || 0;
    });
    return totals;
  }, [todayMeals]);

  const handleSave = async () => {
    try {
      await addNutritionMeal({
        date: form.date,
        meal_name: form.meal_name,
        food_name: form.food_name,
        energy_value: Number(form.energy_value) || 0,
        protein: Number(form.protein) || 0,
        carbohydrates: Number(form.carbohydrates) || 0,
        fat: Number(form.fat) || 0,
        fiber: Number(form.fiber) || 0,
        sugar: Number(form.sugar) || 0,
        serving_size: Number(form.serving_size) || 0,
        serving_unit: form.serving_unit,
      });
      setDialogVisible(false);
      setForm({
        ...form,
        food_name: '',
        energy_value: '',
        protein: '',
        carbohydrates: '',
        fat: '',
        fiber: '',
        sugar: '',
        serving_size: '',
        serving_unit: '',
      });
      fetchData();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to save meal');
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Delete', 'Delete this entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteNutritionMeal(id);
            fetchData();
          } catch (err) {
            console.error(err);
          }
        },
      },
    ]);
  };

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 40 }} />;
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView>
        <Title style={styles.headerTitle}>Nutrition</Title>

        {/* Today's Summary */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={{ fontSize: 16 }}>Today</Title>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-around',
                marginTop: 12,
              }}
            >
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 10, opacity: 0.7 }}>Calories</Text>
                <Text style={{ fontSize: 22, fontWeight: 'bold' }}>
                  {Math.round(dailyTotals.calories)}
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 10, opacity: 0.7 }}>Protein</Text>
                <Text
                  style={{ fontSize: 22, fontWeight: 'bold', color: '#8884d8' }}
                >
                  {Math.round(dailyTotals.protein)}g
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 10, opacity: 0.7 }}>Carbs</Text>
                <Text
                  style={{ fontSize: 22, fontWeight: 'bold', color: '#82ca9d' }}
                >
                  {Math.round(dailyTotals.carbohydrates)}g
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 10, opacity: 0.7 }}>Fat</Text>
                <Text
                  style={{ fontSize: 22, fontWeight: 'bold', color: '#ff7300' }}
                >
                  {Math.round(dailyTotals.fat)}g
                </Text>
              </View>
            </View>
            <View style={{ marginTop: 16 }}>
              <MacroBar
                label="Protein"
                value={dailyTotals.protein}
                color="#8884d8"
              />
              <MacroBar
                label="Carbs"
                value={dailyTotals.carbohydrates}
                color="#82ca9d"
              />
              <MacroBar label="Fat" value={dailyTotals.fat} color="#ff7300" />
              <MacroBar
                label="Fiber"
                value={dailyTotals.fiber}
                color="#ffc658"
                max={50}
              />
              <MacroBar
                label="Sugar"
                value={dailyTotals.sugar}
                color="#e91e63"
                max={50}
              />
            </View>
          </Card.Content>
        </Card>

        {/* Today's Meals */}
        {todayMeals.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Title style={{ fontSize: 16 }}>Today's Meals</Title>
              {MEAL_NAMES.map((name) => {
                const items = todayMeals.filter((m) => m.diary_meal === name);
                if (items.length === 0) return null;
                return (
                  <View key={name} style={{ marginTop: 12 }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: 'bold',
                        marginBottom: 4,
                      }}
                    >
                      {name}
                    </Text>
                    {items.map((m) => {
                      const nc = m.nutritional_contents || {};
                      return (
                        <View key={m.id} style={styles.mealRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: 'bold' }}>
                              {m.food_name}
                            </Text>
                            <Text style={{ fontSize: 11, opacity: 0.6 }}>
                              {Math.round(nc.energy?.value || 0)} kcal
                              {nc.protein
                                ? ` · P ${Math.round(nc.protein)}g`
                                : ''}
                              {nc.carbohydrates
                                ? ` · C ${Math.round(nc.carbohydrates)}g`
                                : ''}
                              {nc.fat ? ` · F ${Math.round(nc.fat)}g` : ''}
                            </Text>
                          </View>
                          <IconButton
                            icon="delete"
                            size={18}
                            onPress={() => handleDelete(m.id)}
                          />
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </Card.Content>
          </Card>
        )}

        {/* History Table */}
        <Title style={styles.sectionTitle}>Recent Entries</Title>
        <DataTable style={styles.table}>
          <DataTable.Header>
            <DataTable.Title>Date</DataTable.Title>
            <DataTable.Title>Food</DataTable.Title>
            <DataTable.Title numeric>Cal</DataTable.Title>
            <DataTable.Title numeric>P</DataTable.Title>
            <DataTable.Title numeric>C</DataTable.Title>
            <DataTable.Title numeric>F</DataTable.Title>
            <DataTable.Title numeric>Del</DataTable.Title>
          </DataTable.Header>
          {meals
            .slice()
            .reverse()
            .map((m: any) => {
              const nc = m.nutritional_contents || {};
              return (
                <DataTable.Row key={m.id}>
                  <DataTable.Cell>
                    {m.date.split('-').slice(1).join('/')}
                  </DataTable.Cell>
                  <DataTable.Cell>{m.food_name}</DataTable.Cell>
                  <DataTable.Cell numeric>
                    {Math.round(nc.energy?.value || 0)}
                  </DataTable.Cell>
                  <DataTable.Cell numeric>
                    {nc.protein ? Math.round(nc.protein) : '-'}
                  </DataTable.Cell>
                  <DataTable.Cell numeric>
                    {nc.carbohydrates ? Math.round(nc.carbohydrates) : '-'}
                  </DataTable.Cell>
                  <DataTable.Cell numeric>
                    {nc.fat ? Math.round(nc.fat) : '-'}
                  </DataTable.Cell>
                  <DataTable.Cell numeric>
                    <IconButton
                      icon="delete"
                      size={14}
                      onPress={() => handleDelete(m.id)}
                    />
                  </DataTable.Cell>
                </DataTable.Row>
              );
            })}
        </DataTable>

        <View style={{ height: 100 }} />
      </ScrollView>

      <IconButton
        icon="plus"
        mode="contained"
        size={28}
        onPress={() => setDialogVisible(true)}
        style={styles.fab}
      />

      <Portal>
        <Dialog
          visible={dialogVisible}
          onDismiss={() => setDialogVisible(false)}
        >
          <Dialog.Title>Log Meal</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Date"
              value={form.date}
              onChangeText={(v) => setForm({ ...form, date: v })}
              mode="outlined"
              style={{ marginBottom: 8 }}
            />
            <Text style={{ marginBottom: 4, fontWeight: 'bold', fontSize: 12 }}>
              Meal
            </Text>
            <SegmentedButtons
              value={form.meal_name}
              onValueChange={(v) => setForm({ ...form, meal_name: v })}
              buttons={MEAL_NAMES.map((m) => ({ value: m, label: m }))}
              style={{ marginBottom: 12 }}
            />
            <TextInput
              label="Food Name"
              value={form.food_name}
              onChangeText={(v) => setForm({ ...form, food_name: v })}
              mode="outlined"
              style={{ marginBottom: 8 }}
            />
            <TextInput
              label="Calories"
              value={form.energy_value}
              onChangeText={(v) => setForm({ ...form, energy_value: v })}
              mode="outlined"
              keyboardType="numeric"
              style={{ marginBottom: 8 }}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                label="Protein (g)"
                value={form.protein}
                onChangeText={(v) => setForm({ ...form, protein: v })}
                mode="outlined"
                keyboardType="numeric"
                style={{ flex: 1, marginBottom: 8 }}
              />
              <TextInput
                label="Carbs (g)"
                value={form.carbohydrates}
                onChangeText={(v) => setForm({ ...form, carbohydrates: v })}
                mode="outlined"
                keyboardType="numeric"
                style={{ flex: 1, marginBottom: 8 }}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                label="Fat (g)"
                value={form.fat}
                onChangeText={(v) => setForm({ ...form, fat: v })}
                mode="outlined"
                keyboardType="numeric"
                style={{ flex: 1, marginBottom: 8 }}
              />
              <TextInput
                label="Fiber (g)"
                value={form.fiber}
                onChangeText={(v) => setForm({ ...form, fiber: v })}
                mode="outlined"
                keyboardType="numeric"
                style={{ flex: 1, marginBottom: 8 }}
              />
            </View>
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

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  card: { marginBottom: 16, borderRadius: 12, elevation: 2 },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  table: { backgroundColor: '#fff', borderRadius: 12, elevation: 1 },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    borderRadius: 28,
    elevation: 4,
  },
});
