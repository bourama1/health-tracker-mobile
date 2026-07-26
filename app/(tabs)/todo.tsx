import React, { useState, useEffect, useCallback } from 'react';
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
  Button,
  Portal,
  Dialog,
  TextInput,
  IconButton,
  useTheme,
  Chip,
  FAB,
  SegmentedButtons,
  Divider,
} from 'react-native-paper';
import {
  getTodoTasks,
  createTodoTask,
  updateTodoTask,
  deleteTodoTask,
  completeTodoTask,
  uncompleteTodoTask,
} from '@/src/services/api';

const STATS = [
  { key: 'strength', label: 'STR', color: '#e53935', icon: '💪' },
  { key: 'dexterity', label: 'DEX', color: '#43a047', icon: '⚡' },
  { key: 'constitution', label: 'CON', color: '#fb8c00', icon: '🛡️' },
  { key: 'intelligence', label: 'INT', color: '#1e88e5', icon: '🧠' },
  { key: 'wisdom', label: 'WIS', color: '#8e24aa', icon: '👁️' },
  { key: 'charisma', label: 'CHA', color: '#ec407a', icon: '⭐' },
];

const PRIORITIES = [
  { value: 1, label: 'Low', color: '#888' },
  { value: 2, label: 'Med', color: '#fb8c00' },
  { value: 3, label: 'High', color: '#e53935' },
];

interface TaskReward {
  stat_name: string;
  bonus: number;
}

interface Task {
  id: number;
  title: string;
  description: string;
  xp_reward: number;
  priority: number;
  start_date: string | null;
  due_date: string | null;
  completed: number;
  completed_date: string | null;
  rewards: TaskReward[];
}

export default function TodoList() {
  const theme = useTheme();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [xpReward, setXpReward] = useState('5');
  const [priority, setPriority] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [rewards, setRewards] = useState<TaskReward[]>([
    { stat_name: 'strength', bonus: 1 },
  ]);

  const fetchTasks = useCallback(async () => {
    try {
      const status = filter === 'overdue' ? 'active' : filter;
      const res = await getTodoTasks(status);
      let data = res.data || [];
      if (filter === 'overdue') {
        const today = new Date().toISOString().split('T')[0];
        data = data.filter(
          (t: Task) => t.due_date && t.due_date < today && t.completed === 0
        );
      }
      setTasks(data);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const getDaysUntil = (dateStr: string | null) => {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dateStr + 'T00:00:00');
    return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getDueLabel = (dateStr: string | null) => {
    const days = getDaysUntil(dateStr);
    if (days === null) return null;
    if (days < 0) return `${Math.abs(days)}d overdue`;
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    return `${days}d left`;
  };

  const getDueColor = (dateStr: string | null, completed: number) => {
    if (completed) return '#888';
    const days = getDaysUntil(dateStr);
    if (days === null) return '#888';
    if (days < 0) return '#e53935';
    if (days <= 2) return '#fb8c00';
    return '#888';
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setXpReward('5');
    setPriority(1);
    setStartDate('');
    setDueDate('');
    setRewards([{ stat_name: 'strength', bonus: 1 }]);
    setEditingTask(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setDialogVisible(true);
  };

  const handleOpenEdit = (task: Task) => {
    setTitle(task.title);
    setDescription(task.description || '');
    setXpReward(String(task.xp_reward || 5));
    setPriority(task.priority || 1);
    setStartDate(task.start_date || '');
    setDueDate(task.due_date || '');
    setRewards(
      task.rewards?.length > 0
        ? task.rewards.map((r) => ({ stat_name: r.stat_name, bonus: r.bonus }))
        : [{ stat_name: 'strength', bonus: 1 }]
    );
    setEditingTask(task);
    setDialogVisible(true);
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        xp_reward: parseInt(xpReward) || 5,
        priority,
        start_date: startDate || null,
        due_date: dueDate || null,
        rewards: rewards.map((r) => ({
          ...r,
          bonus: parseInt(String(r.bonus)) || 1,
        })),
      };
      if (editingTask) {
        await updateTodoTask(editingTask.id, payload);
      } else {
        await createTodoTask(payload);
      }
      setDialogVisible(false);
      resetForm();
      fetchTasks();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to save task');
    }
  };

  const handleComplete = async (task: Task) => {
    try {
      const res = await completeTodoTask(task.id);
      const data = res.data;
      const statMsg =
        task.rewards
          ?.map((r) => {
            const cfg = STATS.find((s) => s.key === r.stat_name);
            return `${cfg?.icon || ''} +${r.bonus} ${cfg?.label || r.stat_name}`;
          })
          .join(', ') || '';
      Alert.alert(
        'Quest Complete!',
        `+${data.xpGained} XP${statMsg ? '\n' + statMsg : ''}${data.leveledUp ? '\n🎉 LEVEL UP!' : ''}`
      );
      fetchTasks();
    } catch (err: any) {
      Alert.alert(
        'Error',
        err.response?.data?.error || 'Failed to complete task'
      );
    }
  };

  const handleUncomplete = async (task: Task) => {
    try {
      await uncompleteTodoTask(task.id);
      fetchTasks();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed');
    }
  };

  const handleDelete = (task: Task) => {
    Alert.alert('Delete Quest', `Delete "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTodoTask(task.id);
            fetchTasks();
          } catch (err) {
            Alert.alert('Error', 'Failed to delete');
          }
        },
      },
    ]);
  };

  const addReward = () => {
    setRewards([...rewards, { stat_name: 'strength', bonus: 1 }]);
  };

  const updateReward = (index: number, field: keyof TaskReward, value: any) => {
    setRewards(
      rewards.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  };

  const removeReward = (index: number) => {
    if (rewards.length <= 1) return;
    setRewards(rewards.filter((_, i) => i !== index));
  };

  const renderTask = (task: Task) => {
    const priCfg =
      PRIORITIES.find((p) => p.value === task.priority) || PRIORITIES[0];
    const dueLabel = getDueLabel(task.due_date);
    const dueColor = getDueColor(task.due_date, task.completed);
    const statColor = task.rewards?.[0]
      ? STATS.find((s) => s.key === task.rewards[0].stat_name)?.color ||
        '#42a5f5'
      : '#42a5f5';

    return (
      <Card
        key={task.id}
        style={[
          styles.taskCard,
          { borderLeftColor: task.completed ? '#43a047' : statColor },
        ]}
      >
        <Card.Content style={{ paddingVertical: 10 }}>
          <View style={styles.taskHeader}>
            <IconButton
              icon={task.completed ? 'check-circle' : 'circle-outline'}
              iconColor={task.completed ? '#43a047' : '#888'}
              size={24}
              onPress={() =>
                task.completed ? handleUncomplete(task) : handleComplete(task)
              }
              style={{ margin: 0 }}
            />
            <Text
              style={[styles.taskTitle, task.completed && styles.taskTitleDone]}
              numberOfLines={1}
            >
              {task.title}
            </Text>
            {!task.completed && (
              <IconButton
                icon="pencil"
                size={18}
                onPress={() => handleOpenEdit(task)}
                style={{ margin: 0 }}
              />
            )}
            {!task.completed && (
              <IconButton
                icon="delete"
                size={18}
                onPress={() => handleDelete(task)}
                style={{ margin: 0 }}
              />
            )}
          </View>

          {task.description ? (
            <Text style={styles.taskDesc} numberOfLines={2}>
              {task.description}
            </Text>
          ) : null}

          <View style={styles.chipRow}>
            <Chip
              compact
              style={[
                styles.priorityChip,
                { backgroundColor: priCfg.color + '22' },
              ]}
              textStyle={{ color: priCfg.color, fontSize: 11 }}
            >
              {priCfg.label}
            </Chip>
            <Chip compact style={styles.xpChip} textStyle={styles.xpChipText}>
              ⭐ +{task.xp_reward} XP
            </Chip>
            {task.rewards?.map((r, i) => {
              const cfg = STATS.find((s) => s.key === r.stat_name);
              return (
                <Chip
                  key={i}
                  compact
                  style={[
                    styles.statChip,
                    { backgroundColor: (cfg?.color || '#666') + '22' },
                  ]}
                  textStyle={{ color: cfg?.color || '#666', fontSize: 11 }}
                >
                  {cfg?.icon} +{r.bonus} {cfg?.label}
                </Chip>
              );
            })}
            {dueLabel ? (
              <Chip
                compact
                style={[styles.dueChip, { backgroundColor: dueColor + '22' }]}
                textStyle={{ color: dueColor, fontSize: 11 }}
              >
                📅 {dueLabel}
              </Chip>
            ) : null}
          </View>
        </Card.Content>
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>📋 Quests</Text>
          <Button mode="contained" onPress={handleOpenCreate} compact>
            New
          </Button>
        </View>

        <SegmentedButtons
          value={filter}
          onValueChange={setFilter}
          buttons={[
            { value: 'active', label: 'Active' },
            { value: 'all', label: 'All' },
            { value: 'overdue', label: 'Overdue' },
            { value: 'completed', label: 'Done' },
          ]}
          style={{ marginBottom: 12 }}
        />

        {tasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {filter === 'active'
                ? 'No active quests. Create one to start earning XP!'
                : filter === 'overdue'
                  ? 'No overdue quests. Nice work!'
                  : filter === 'completed'
                    ? 'No completed quests yet.'
                    : 'No quests yet. Create your first!'}
            </Text>
          </View>
        ) : (
          tasks.map(renderTask)
        )}
      </ScrollView>

      <Portal>
        <Dialog
          visible={dialogVisible}
          onDismiss={() => {
            setDialogVisible(false);
            resetForm();
          }}
          style={{ maxHeight: '80%' }}
        >
          <Dialog.Title>
            {editingTask ? 'Edit Quest' : 'New Quest'}
          </Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 500 }}>
            <ScrollView>
              <View style={{ padding: 16 }}>
                <TextInput
                  label="Quest title"
                  value={title}
                  onChangeText={setTitle}
                  mode="outlined"
                />
                <TextInput
                  label="Description (optional)"
                  value={description}
                  onChangeText={setDescription}
                  mode="outlined"
                  multiline
                  numberOfLines={2}
                  style={{ marginTop: 10 }}
                />

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <TextInput
                    label="XP Reward"
                    value={xpReward}
                    onChangeText={setXpReward}
                    mode="outlined"
                    keyboardType="numeric"
                    style={{ flex: 1 }}
                  />
                </View>

                <Text
                  style={{ marginTop: 12, fontWeight: 'bold', fontSize: 13 }}
                >
                  Priority
                </Text>
                <SegmentedButtons
                  value={String(priority)}
                  onValueChange={(v) => setPriority(Number(v))}
                  buttons={PRIORITIES.map((p) => ({
                    value: String(p.value),
                    label: p.label,
                  }))}
                  style={{ marginTop: 6 }}
                />

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                  <TextInput
                    label="Start Date"
                    value={startDate}
                    onChangeText={setStartDate}
                    mode="outlined"
                    placeholder="YYYY-MM-DD"
                    style={{ flex: 1 }}
                  />
                  <TextInput
                    label="Due Date"
                    value={dueDate}
                    onChangeText={setDueDate}
                    mode="outlined"
                    placeholder="YYYY-MM-DD"
                    style={{ flex: 1 }}
                  />
                </View>

                <Divider style={{ marginVertical: 14 }} />
                <Text
                  style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 8 }}
                >
                  Stat Rewards
                </Text>

                {rewards.map((r, i) => (
                  <View key={i} style={styles.rewardRow}>
                    <SegmentedButtons
                      value={r.stat_name}
                      onValueChange={(v) => updateReward(i, 'stat_name', v)}
                      buttons={STATS.map((sc) => ({
                        value: sc.key,
                        label: sc.label,
                      }))}
                      style={{ flex: 3 }}
                    />
                    <TextInput
                      label="+"
                      value={String(r.bonus)}
                      onChangeText={(v) =>
                        updateReward(i, 'bonus', Number(v) || 1)
                      }
                      mode="outlined"
                      keyboardType="numeric"
                      style={{ flex: 1 }}
                    />
                    <IconButton
                      icon="close"
                      size={20}
                      onPress={() => removeReward(i)}
                      disabled={rewards.length <= 1}
                    />
                  </View>
                ))}

                <Button
                  mode="text"
                  onPress={addReward}
                  icon="plus"
                  style={{ marginTop: 4 }}
                >
                  Add Stat Reward
                </Button>
              </View>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setDialogVisible(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onPress={handleSave}
              disabled={!title.trim() || rewards.length === 0}
            >
              {editingTask ? 'Update' : 'Create'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <FAB icon="plus" style={styles.fab} onPress={handleOpenCreate} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: '#888', textAlign: 'center' },
  taskCard: { marginBottom: 8, borderLeftWidth: 4 },
  taskHeader: { flexDirection: 'row', alignItems: 'center' },
  taskTitle: { flex: 1, fontSize: 15, fontWeight: 'bold' },
  taskTitleDone: { textDecorationLine: 'line-through', color: '#888' },
  taskDesc: { fontSize: 12, color: '#aaa', marginLeft: 40, marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginLeft: 40 },
  priorityChip: { height: 24 },
  xpChip: { height: 24, backgroundColor: 'rgba(255,215,0,0.15)' },
  xpChipText: { color: '#b8860b', fontSize: 11 },
  statChip: { height: 24 },
  dueChip: { height: 24 },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});
