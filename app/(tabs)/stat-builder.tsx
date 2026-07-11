import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, ScrollView, View, ActivityIndicator, Alert,
} from 'react-native';
import {
  Card, Title, Text, Button, Portal, Dialog, TextInput,
  IconButton, useTheme, ProgressBar, SegmentedButtons, Chip, FAB,
} from 'react-native-paper';
import {
  getStatBuilderData,
  updateStatBuilderStats,
  createStatBuilderSkill,
  updateStatBuilderSkill,
  deleteStatBuilderSkill,
  toggleStatBuilderLog,
  getStatBuilderLogs,
  calculateStatBuilderWeek,
  resetStatBuilderWeek,
} from '@/src/services/api';

const STATS = [
  { key: 'strength', label: 'STR', color: '#e53935', icon: '💪' },
  { key: 'dexterity', label: 'DEX', color: '#43a047', icon: '⚡' },
  { key: 'constitution', label: 'CON', color: '#fb8c00', icon: '🛡️' },
  { key: 'intelligence', label: 'INT', color: '#1e88e5', icon: '🧠' },
  { key: 'wisdom', label: 'WIS', color: '#8e24aa', icon: '👁️' },
  { key: 'charisma', label: 'CHA', color: '#ec407a', icon: '⭐' },
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const getWeekDates = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return DAYS.map((_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });
};

export default function StatBuilder() {
  const theme = useTheme();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [skillDialog, setSkillDialog] = useState(false);
  const [editingSkill, setEditingSkill] = useState<any>(null);
  const [skillName, setSkillName] = useState('');
  const [skillStat, setSkillStat] = useState('strength');
  const [skillDiff, setSkillDiff] = useState(1);

  const weekDates = getWeekDates();

  const fetchData = useCallback(async () => {
    try {
      const [dataRes, logsRes] = await Promise.all([
        getStatBuilderData(),
        getStatBuilderLogs(weekDates[0], weekDates[6]),
      ]);
      setProfile(dataRes.data.profile);
      setStats(dataRes.data.stats || []);
      setSkills((dataRes.data.skills || []).sort((a: any, b: any) => a.difficulty - b.difficulty));
      setLogs(logsRes.data || []);
    } catch (err: any) {
      console.error('StatBuilder fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [weekDates]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const statMap: Record<string, any> = {};
  stats.forEach((s) => { statMap[s.stat_name] = s; });

  const skillsByStat: Record<string, any[]> = {};
  STATS.forEach((sc) => { skillsByStat[sc.key] = []; });
  skills.forEach((sk) => {
    if (skillsByStat[sk.stat_name]) skillsByStat[sk.stat_name].push(sk);
  });

  const logMap: Record<string, Record<string, any>> = {};
  logs.forEach((l: any) => {
    if (!logMap[l.skill_id]) logMap[l.skill_id] = {};
    logMap[l.skill_id][l.date] = l;
  });

  const isLogged = (skillId: number, date: string) => {
    const entry = logMap[skillId]?.[date];
    return entry ? entry.completed === 1 : false;
  };

  const handleToggle = async (skillId: number, date: string) => {
    try {
      const res = await toggleStatBuilderLog(skillId, date);
      setStats(res.data.stats);
      setProfile(res.data.profile);
      if (res.data.leveledUp) {
        Alert.alert('Level Up!', '🎉 Congratulations!');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to toggle log');
    }
  };

  const handleStatChange = async (statName: string, delta: number) => {
    const current = statMap[statName]?.value || 1;
    const newVal = Math.max(1, Math.min(100, current + delta));
    try {
      await updateStatBuilderStats({ [statName]: newVal });
      fetchData();
    } catch (err) {
      Alert.alert('Error', 'Failed to update stat');
    }
  };

  const handleSaveSkill = async () => {
    if (!skillName.trim()) return;
    try {
      if (editingSkill) {
        await updateStatBuilderSkill(editingSkill.id, {
          name: skillName,
          stat_name: skillStat,
          difficulty: skillDiff,
        });
      } else {
        await createStatBuilderSkill({
          name: skillName,
          stat_name: skillStat,
          difficulty: skillDiff,
        });
      }
      setSkillDialog(false);
      setEditingSkill(null);
      setSkillName('');
      fetchData();
    } catch (err) {
      Alert.alert('Error', 'Failed to save skill');
    }
  };

  const handleDeleteSkill = (id: number) => {
    Alert.alert('Delete Skill', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteStatBuilderSkill(id);
            fetchData();
          } catch (err) {
            Alert.alert('Error', 'Failed to delete skill');
          }
        },
      },
    ]);
  };

  const handleCalculate = async () => {
    try {
      const res = await calculateStatBuilderWeek(weekDates[0], weekDates[6]);
      const data = res.data;
      Alert.alert('Week Calculated', `XP earned: ${data.totalWeekXp}${data.leveledUp ? '\n🎉 LEVEL UP!' : ''}`);
      fetchData();
    } catch (err) {
      Alert.alert('Error', 'Failed to calculate week');
    }
  };

  const handleReset = () => {
    Alert.alert('Reset Week', 'This will clear all logs for this week.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          try {
            await resetStatBuilderWeek();
            fetchData();
          } catch (err) {
            Alert.alert('Error', 'Failed to reset');
          }
        },
      },
    ]);
  };

  const xpForLevel = (lvl) => {
    if (lvl <= 1) return 0;
    let total = 0, inc = 150;
    for (let i = 2; i <= lvl; i++) {
      total += inc;
      inc = Math.floor(inc * 1.4);
    }
    return total;
  };
  const xpForNext = profile ? xpForLevel((profile.level || 1) + 1) : 150;
  const currentXp = profile?.total_xp || 0;
  const xpProgress = Math.min(1, currentXp / xpForNext);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
        <Card style={styles.levelCard}>
          <Card.Content>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.levelText}>Level {profile?.level || 1}</Text>
              <Text style={styles.xpText}>{currentXp} / {xpForNext} XP</Text>
            </View>
            <ProgressBar progress={xpProgress} color="#ffd700" style={{ height: 10, borderRadius: 5, marginTop: 8 }} />
          </Card.Content>
        </Card>

        <View style={styles.statsGrid}>
          {STATS.map((sc) => {
            const stat = statMap[sc.key];
            const val = stat?.value || 1;
            return (
              <Card key={sc.key} style={[styles.statCard, { borderLeftColor: sc.color }]}>
                <Card.Content style={styles.statContent}>
                  <Text style={styles.statIcon}>{sc.icon}</Text>
                  <Text style={[styles.statLabel, { color: sc.color }]}>{sc.label}</Text>
                  <View style={styles.statRow}>
                    <IconButton icon="minus" size={16} onPress={() => handleStatChange(sc.key, -1)} />
                    <Text style={styles.statValue}>{val}</Text>
                    <IconButton icon="plus" size={16} onPress={() => handleStatChange(sc.key, 1)} />
                  </View>
                </Card.Content>
              </Card>
            );
          })}
        </View>

        <View style={styles.actions}>
          <Button mode="contained" onPress={handleCalculate} style={styles.actionBtn} textColor="#fff">Calculate Week</Button>
          <Button mode="outlined" onPress={handleReset} textColor="#e53935" style={styles.actionBtn}>Reset Week</Button>
        </View>

        {STATS.map((sc) => {
          const statSkills = skillsByStat[sc.key] || [];
          if (statSkills.length === 0) return null;
          return (
            <Card key={sc.key} style={[styles.skillSection, { borderLeftColor: sc.color }]}>
              <Card.Content>
                <Text style={[styles.skillSectionTitle, { color: sc.color }]}>
                  {sc.icon} {sc.label}
                </Text>
                {statSkills.map((sk: any) => (
                  <View key={sk.id} style={styles.skillRow}>
                    <Chip
                      mode="flat"
                      compact
                      style={[styles.diffChip, { backgroundColor: sk.difficulty === 3 ? '#e53935' : sk.difficulty === 2 ? '#fb8c00' : '#43a047' }]}
                    >
                      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 11 }}>+{sk.difficulty}</Text>
                    </Chip>
                    <Text style={styles.skillName} numberOfLines={1}>{sk.name}</Text>
                    <View style={styles.dayRow}>
                      {weekDates.map((date, i) => (
                        <IconButton
                          key={date}
                          icon={isLogged(sk.id, date) ? 'check-circle' : 'circle-outline'}
                          iconColor={isLogged(sk.id, date) ? sc.color : '#888'}
                          size={22}
                          onPress={() => handleToggle(sk.id, date)}
                          style={{ margin: 0, width: 28, height: 28 }}
                        />
                      ))}
                    </View>
                    <IconButton icon="pencil" size={16} onPress={() => {
                      setEditingSkill(sk);
                      setSkillName(sk.name);
                      setSkillStat(sk.stat_name);
                      setSkillDiff(sk.difficulty);
                      setSkillDialog(true);
                    }} />
                    <IconButton icon="delete" size={16} onPress={() => handleDeleteSkill(sk.id)} />
                  </View>
                ))}
              </Card.Content>
            </Card>
          );
        })}
      </ScrollView>

      <Portal>
        <Dialog visible={skillDialog} onDismiss={() => { setSkillDialog(false); setEditingSkill(null); setSkillName(''); }}>
          <Dialog.Title>{editingSkill ? 'Edit Skill' : 'Add Skill'}</Dialog.Title>
          <Dialog.Content>
            <SegmentedButtons
              value={skillStat}
              onValueChange={setSkillStat}
              buttons={STATS.map((sc) => ({ value: sc.key, label: sc.label.substring(0, 3) }))}
              style={{ marginBottom: 12 }}
            />
            <TextInput label="Skill name" value={skillName} onChangeText={setSkillName} mode="outlined" />
            <SegmentedButtons
              value={String(skillDiff)}
              onValueChange={(v) => setSkillDiff(Number(v))}
              buttons={[
                { value: '1', label: '+1 Easy' },
                { value: '2', label: '+2 Med' },
                { value: '3', label: '+3 Hard' },
              ]}
              style={{ marginTop: 12 }}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => { setSkillDialog(false); setEditingSkill(null); setSkillName(''); }}>Cancel</Button>
            <Button onPress={handleSaveSkill} disabled={!skillName.trim()}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <FAB icon="plus" style={styles.fab} onPress={() => {
        setEditingSkill(null);
        setSkillName('');
        setSkillStat('strength');
        setSkillDiff(1);
        setSkillDialog(true);
      }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  levelCard: { marginBottom: 12, backgroundColor: '#1a1a2e' },
  levelText: { fontSize: 18, fontWeight: 'bold', color: '#ffd700' },
  xpText: { fontSize: 13, color: '#aaa' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  statCard: {
    width: '31%', borderLeftWidth: 3, marginBottom: 4,
  },
  statContent: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4 },
  statIcon: { fontSize: 22 },
  statLabel: { fontSize: 10, fontWeight: 'bold', marginTop: 2 },
  statRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  statValue: { fontSize: 20, fontWeight: 'bold', minWidth: 24, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  actionBtn: { flex: 1 },
  skillSection: { marginBottom: 8, borderLeftWidth: 3 },
  skillSectionTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  skillRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 4 },
  diffChip: { height: 24, borderRadius: 12, paddingHorizontal: 6 },
  skillName: { flex: 1, fontSize: 13 },
  dayRow: { flexDirection: 'row', alignItems: 'center' },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});
