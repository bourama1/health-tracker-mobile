import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  ActivityIndicator,
  Alert,
  Pressable,
} from 'react-native';
import {
  Card,
  Text,
  Button,
  Portal,
  Dialog,
  TextInput,
  IconButton,
  useTheme,
  ProgressBar,
  SegmentedButtons,
  Chip,
  Snackbar,
} from 'react-native-paper';
import {
  getStatBuilderData,
  createStatBuilderSkill,
  updateStatBuilderSkill,
  deleteStatBuilderSkill,
  toggleStatBuilderLog,
  toggleStatBuilderFreeze,
  getStatBuilderLogs,
  updateStatBuilderUnlock,
} from '@/src/services/api';

const STAT_CONFIG = [
  { key: 'strength', label: 'Strength', color: '#e53935', icon: '💪' },
  { key: 'dexterity', label: 'Dexterity', color: '#43a047', icon: '⚡' },
  { key: 'constitution', label: 'Constitution', color: '#fb8c00', icon: '🛡️' },
  { key: 'intelligence', label: 'Intelligence', color: '#1e88e5', icon: '🧠' },
  { key: 'wisdom', label: 'Wisdom', color: '#8e24aa', icon: '👁️' },
  { key: 'charisma', label: 'Charisma', color: '#ec407a', icon: '⭐' },
];

const FREEZE_COLOR = '#4fc3f7';
const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Local-date-safe YYYY-MM-DD formatting (avoids UTC-shift bugs from toISOString).
const toDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);

export default function StatBuilder() {
  const theme = useTheme();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [unlocks, setUnlocks] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [snackbar, setSnackbar] = useState({
    visible: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });
  const showSnackbar = (message: string, severity: 'success' | 'error' = 'success') =>
    setSnackbar({ visible: true, message, severity });

  const todayStr = useMemo(() => toDateStr(new Date()), []);
  const [currentMonth, setCurrentMonth] = useState(() =>
    startOfMonth(new Date())
  );
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const [skillDialog, setSkillDialog] = useState<{
    open: boolean;
    edit: any | null;
  }>({ open: false, edit: null });
  const [skillForm, setSkillForm] = useState({
    stat_name: 'strength',
    name: '',
    difficulty: 1,
  });

  const [unlockDialog, setUnlockDialog] = useState(false);
  const [unlockForm, setUnlockForm] = useState({
    xp_threshold: 150,
    reward_text: '',
  });

  const monthRange = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    return {
      from: toDateStr(new Date(year, month, 1)),
      to: toDateStr(new Date(year, month, lastDay)),
    };
  }, [currentMonth]);

  const fetchData = useCallback(async () => {
    try {
      const dataRes = await getStatBuilderData();
      setProfile(dataRes.data.profile);
      setStats(dataRes.data.stats || []);
      setSkills(
        (dataRes.data.skills || []).sort(
          (a: any, b: any) => a.difficulty - b.difficulty
        )
      );
      setUnlocks(dataRes.data.unlocks || []);
    } catch (err) {
      console.error('StatBuilder fetch error:', err);
      showSnackbar('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const logsRes = await getStatBuilderLogs(monthRange.from, monthRange.to);
      setLogs(logsRes.data || []);
    } catch (err) {
      showSnackbar('Failed to load calendar data', 'error');
    }
  }, [monthRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const refreshAfterAction = () => Promise.all([fetchData(), fetchLogs()]);

  const statMap: Record<string, any> = {};
  stats.forEach((s) => {
    statMap[s.stat_name] = s;
  });

  const skillsByStat: Record<string, any[]> = {};
  STAT_CONFIG.forEach((sc) => {
    skillsByStat[sc.key] = [];
  });
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

  const isFrozen = (skillId: number, date: string) => {
    const entry = logMap[skillId]?.[date];
    return entry ? entry.frozen === 1 : false;
  };

  const handleToggle = async (skillId: number, date: string) => {
    try {
      const res = await toggleStatBuilderLog(skillId, date);
      setProfile(res.data.profile);
      if (res.data.leveledUp) showSnackbar('Level Up! 🎉', 'success');
      fetchLogs();
      fetchData();
    } catch (err) {
      showSnackbar('Failed to toggle log', 'error');
    }
  };

  const handleToggleFreeze = async (skillId: number, date: string) => {
    try {
      const res = await toggleStatBuilderFreeze(skillId, date);
      showSnackbar(res.data.message);
      refreshAfterAction();
    } catch (err: any) {
      showSnackbar(
        err?.response?.data?.error || 'Failed to toggle freeze',
        'error'
      );
    }
  };

  const handleSaveSkill = async () => {
    if (!skillForm.name.trim()) return;
    try {
      if (skillDialog.edit) {
        await updateStatBuilderSkill(skillDialog.edit.id, skillForm);
      } else {
        await createStatBuilderSkill(skillForm);
      }
      setSkillDialog({ open: false, edit: null });
      setSkillForm({ stat_name: 'strength', name: '', difficulty: 1 });
      fetchData();
      showSnackbar(skillDialog.edit ? 'Skill updated' : 'Skill created');
    } catch (err: any) {
      showSnackbar(
        `Failed to save skill: ${err?.response?.data?.error || err.message}`,
        'error'
      );
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
            showSnackbar('Skill deleted');
          } catch (err) {
            showSnackbar('Failed to delete skill', 'error');
          }
        },
      },
    ]);
  };

  const handleSaveUnlock = async () => {
    try {
      await updateStatBuilderUnlock(unlockForm);
      setUnlockDialog(false);
      fetchData();
      showSnackbar('Unlock reward saved');
    } catch (err) {
      showSnackbar('Failed to save unlock', 'error');
    }
  };

  const xpForLevel = (lvl: number) => {
    if (lvl <= 1) return 0;
    let total = 0,
      inc = 150;
    for (let i = 2; i <= lvl; i++) {
      total += inc;
      inc = Math.floor(inc * 1.4);
    }
    return total;
  };
  const xpForNext = profile ? xpForLevel((profile.level || 1) + 1) : 150;
  const currentXp = profile?.total_xp || 0;
  const xpProgress = Math.min(1, currentXp / xpForNext);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayRaw = new Date(year, month, 1).getDay(); // 0=Sun..6=Sat
    const firstDay = (firstDayRaw + 6) % 7; // 0=Mon..6=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: Array<null | {
      day: number;
      dateStr: string;
      frozenCount: number;
      statPoints: Record<string, number>;
      totalPoints: number;
    }> = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = toDateStr(new Date(year, month, i));
      const dayLogs = logs.filter((l: any) => l.date === dateStr);
      const completedLogs = dayLogs.filter((l: any) => l.completed === 1);
      const frozenCount = dayLogs.filter((l: any) => l.frozen === 1).length;

      const statPoints: Record<string, number> = {};
      STAT_CONFIG.forEach((sc) => {
        statPoints[sc.key] = 0;
      });
      let totalPoints = 0;
      completedLogs.forEach((l: any) => {
        const pts = l.difficulty || 1;
        if (statPoints[l.stat_name] !== undefined) {
          statPoints[l.stat_name] += pts;
        }
        totalPoints += pts;
      });

      days.push({ day: i, dateStr, frozenCount, statPoints, totalPoints });
    }
    return days;
  }, [currentMonth, logs]);

  const changeMonth = (offset: number) => {
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth() + offset);
    setCurrentMonth(startOfMonth(d));
  };

  const shiftSelectedDay = (delta: number) => {
    const d = new Date(`${selectedDate}T00:00:00`);
    d.setDate(d.getDate() + delta);
    const newDateStr = toDateStr(d);
    setSelectedDate(newDateStr);
    const newMonth = startOfMonth(d);
    if (newMonth.getTime() !== currentMonth.getTime()) setCurrentMonth(newMonth);
  };

  const selectedDateLabel = useMemo(() => {
    const d = new Date(`${selectedDate}T00:00:00`);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }, [selectedDate]);

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
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Header: level + xp, mirrors the web header bar */}
        <Card style={styles.levelCard}>
          <Card.Content>
            <View style={styles.levelHeaderRow}>
              <Text style={styles.headerIcon}>🎲</Text>
              <Text style={styles.headerTitle}>Stat Builder</Text>
            </View>
            <View style={styles.levelRow}>
              <Text style={styles.levelText}>Level {profile?.level || 1}</Text>
              <Text style={styles.xpText}>
                {currentXp} / {xpForNext} XP
              </Text>
            </View>
            <ProgressBar
              progress={xpProgress}
              color="#ffd700"
              style={{ height: 8, borderRadius: 4, marginTop: 8 }}
            />
          </Card.Content>
        </Card>

        {unlocks[0]?.reward_text && (
          <View style={styles.rewardBanner}>
            <Text style={styles.rewardBannerText}>
              {unlocks[0].reward_text}
            </Text>
          </View>
        )}

        {/* Calendar */}
        <Card style={styles.calendarCard}>
          <Card.Content>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarMonthLabel}>
                {currentMonth.toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
              <View style={{ flexDirection: 'row' }}>
                <IconButton
                  icon="chevron-left"
                  size={20}
                  onPress={() => changeMonth(-1)}
                  style={{ margin: 0 }}
                />
                <IconButton
                  icon="chevron-right"
                  size={20}
                  onPress={() => changeMonth(1)}
                  style={{ margin: 0 }}
                />
              </View>
            </View>

            <View style={styles.calendarWeekRow}>
              {WEEKDAY_HEADERS.map((d, i) => (
                <Text key={i} style={styles.calendarWeekHeader}>
                  {d.charAt(0)}
                </Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {calendarDays.map((d, idx) => {
                if (!d) {
                  return (
                    <View key={`empty-${idx}`} style={styles.calendarCell} />
                  );
                }
                const isSelected = d.dateStr === selectedDate;
                const isToday = d.dateStr === todayStr;
                const statSegments = STAT_CONFIG.filter(
                  (sc) => d.statPoints[sc.key] > 0
                );
                return (
                  <Pressable
                    key={d.dateStr}
                    onPress={() => setSelectedDate(d.dateStr)}
                    style={[
                      styles.calendarCell,
                      isSelected && {
                        borderColor: theme.colors.primary,
                        backgroundColor: `${theme.colors.primary}1a`,
                      },
                    ]}
                  >
                    {d.frozenCount > 0 && (
                      <Text style={styles.calendarFreezeMark}>❄</Text>
                    )}
                    <Text
                      style={[
                        styles.calendarDayNum,
                        isToday && {
                          color: theme.colors.primary,
                          fontWeight: 'bold',
                        },
                      ]}
                    >
                      {d.day}
                    </Text>
                    {statSegments.length > 0 && (
                      <View style={styles.calendarBar}>
                        {statSegments.map((sc) => (
                          <View
                            key={sc.key}
                            style={{
                              flex: d.statPoints[sc.key],
                              backgroundColor: sc.color,
                            }}
                          />
                        ))}
                      </View>
                    )}
                    {d.totalPoints > 0 && (
                      <Text style={styles.calendarPoints}>
                        +{d.totalPoints}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>

            <Button
              compact
              icon="calendar-today"
              onPress={() => {
                setSelectedDate(todayStr);
                setCurrentMonth(startOfMonth(new Date()));
              }}
              style={{ alignSelf: 'flex-start', marginTop: 8 }}
              labelStyle={{ fontSize: 12 }}
            >
              Jump to today
            </Button>
          </Card.Content>
        </Card>

        {/* Skills for selected day */}
        <View style={styles.selectedDayHeader}>
          <IconButton
            icon="chevron-left"
            size={20}
            onPress={() => shiftSelectedDay(-1)}
            style={{ margin: 0 }}
          />
          <View style={styles.selectedDayLabelRow}>
            <Text style={styles.selectedDayLabel}>{selectedDateLabel}</Text>
            {selectedDate === todayStr && (
              <Chip compact style={styles.todayChip} textStyle={{ fontSize: 11 }}>
                Today
              </Chip>
            )}
          </View>
          <IconButton
            icon="chevron-right"
            size={20}
            onPress={() => shiftSelectedDay(1)}
            style={{ margin: 0 }}
          />
        </View>

        {STAT_CONFIG.map((sc) => {
          const stat = statMap[sc.key];
          const val = stat?.value || 1;
          const statSkills = skillsByStat[sc.key] || [];
          return (
            <Card
              key={sc.key}
              style={[styles.skillSection, { borderLeftColor: sc.color }]}
            >
              <Card.Content>
                <View style={styles.skillSectionHeader}>
                  <Text style={styles.skillSectionIcon}>{sc.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.skillSectionTitle, { color: sc.color }]}>
                      {sc.label}
                    </Text>
                  </View>
                  <Text style={[styles.skillSectionValue, { color: sc.color }]}>
                    {val}
                  </Text>
                </View>

                {statSkills.length === 0 ? (
                  <Text style={styles.noSkillsText}>No skills</Text>
                ) : (
                  statSkills.map((sk: any) => {
                    const logged = isLogged(sk.id, selectedDate);
                    const frozen = isFrozen(sk.id, selectedDate);
                    return (
                      <View key={sk.id} style={styles.skillRow}>
                        <Chip
                          mode="flat"
                          compact
                          style={[
                            styles.diffChip,
                            {
                              backgroundColor:
                                sk.difficulty === 3
                                  ? '#e53935'
                                  : sk.difficulty === 2
                                    ? '#fb8c00'
                                    : '#43a047',
                            },
                          ]}
                        >
                          <Text
                            style={{
                              color: '#fff',
                              fontWeight: 'bold',
                              fontSize: 11,
                            }}
                          >
                            +{sk.difficulty}
                          </Text>
                        </Chip>

                        <Pressable
                          onPress={() =>
                            frozen
                              ? handleToggleFreeze(sk.id, selectedDate)
                              : handleToggle(sk.id, selectedDate)
                          }
                          style={[
                            styles.toggleDot,
                            {
                              borderColor: frozen ? FREEZE_COLOR : sc.color,
                              backgroundColor: logged
                                ? sc.color
                                : frozen
                                  ? `${FREEZE_COLOR}40`
                                  : 'transparent',
                            },
                          ]}
                        >
                          {logged && (
                            <Text style={styles.toggleDotCheck}>✓</Text>
                          )}
                          {!logged && frozen && (
                            <Text style={styles.toggleDotCheck}>❄</Text>
                          )}
                        </Pressable>

                        <Text style={styles.skillName} numberOfLines={1}>
                          {sk.name}
                        </Text>

                        {sk.current_streak > 0 && (
                          <Chip
                            compact
                            style={styles.streakChip}
                            textStyle={styles.streakChipText}
                          >
                            {`🔥${sk.current_streak}`}
                          </Chip>
                        )}

                        {!logged && (
                          <IconButton
                            icon="snowflake"
                            size={16}
                            iconColor={frozen ? FREEZE_COLOR : undefined}
                            onPress={() =>
                              handleToggleFreeze(sk.id, selectedDate)
                            }
                          />
                        )}
                        <IconButton
                          icon="pencil"
                          size={16}
                          onPress={() => {
                            setSkillDialog({ open: true, edit: sk });
                            setSkillForm({
                              stat_name: sk.stat_name,
                              name: sk.name,
                              difficulty: sk.difficulty,
                            });
                          }}
                        />
                        <IconButton
                          icon="delete"
                          size={16}
                          onPress={() => handleDeleteSkill(sk.id)}
                        />
                      </View>
                    );
                  })
                )}
              </Card.Content>
            </Card>
          );
        })}

        {/* Bottom actions, mirrors the web's Add Skill / Set Reward row */}
        <View style={styles.actions}>
          <Button
            mode="contained"
            icon="plus"
            style={styles.actionBtn}
            onPress={() => {
              setSkillDialog({ open: true, edit: null });
              setSkillForm({ stat_name: 'strength', name: '', difficulty: 1 });
            }}
          >
            Add Skill
          </Button>
          <Button
            mode="outlined"
            style={styles.actionBtn}
            onPress={() => {
              setUnlockForm({
                xp_threshold: unlocks[0]?.xp_threshold || 150,
                reward_text: unlocks[0]?.reward_text || '',
              });
              setUnlockDialog(true);
            }}
          >
            {unlocks[0]?.reward_text ? 'Edit Reward' : 'Set Reward'}
          </Button>
        </View>
      </ScrollView>

      <Portal>
        <Dialog
          visible={skillDialog.open}
          onDismiss={() => setSkillDialog({ open: false, edit: null })}
        >
          <Dialog.Title>
            {skillDialog.edit ? 'Edit Skill' : 'Add Skill'}
          </Dialog.Title>
          <Dialog.Content>
            <SegmentedButtons
              value={skillForm.stat_name}
              onValueChange={(v) =>
                setSkillForm({ ...skillForm, stat_name: v })
              }
              buttons={STAT_CONFIG.map((sc) => ({
                value: sc.key,
                label: sc.label.substring(0, 3),
              }))}
              style={{ marginBottom: 12 }}
            />
            <TextInput
              label="Skill name"
              value={skillForm.name}
              onChangeText={(v) => setSkillForm({ ...skillForm, name: v })}
              mode="outlined"
            />
            <SegmentedButtons
              value={String(skillForm.difficulty)}
              onValueChange={(v) =>
                setSkillForm({ ...skillForm, difficulty: Number(v) })
              }
              buttons={[
                { value: '1', label: '+1 Easy' },
                { value: '2', label: '+2 Med' },
                { value: '3', label: '+3 Hard' },
              ]}
              style={{ marginTop: 12 }}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSkillDialog({ open: false, edit: null })}>
              Cancel
            </Button>
            <Button
              onPress={handleSaveSkill}
              disabled={!skillForm.name.trim()}
            >
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={unlockDialog} onDismiss={() => setUnlockDialog(false)}>
          <Dialog.Title>Level Up Reward</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="XP Threshold"
              value={String(unlockForm.xp_threshold)}
              onChangeText={(v) =>
                setUnlockForm({
                  ...unlockForm,
                  xp_threshold: parseInt(v, 10) || 150,
                })
              }
              keyboardType="numeric"
              mode="outlined"
            />
            <TextInput
              label="Reward Description"
              value={unlockForm.reward_text}
              onChangeText={(v) =>
                setUnlockForm({ ...unlockForm, reward_text: v })
              }
              mode="outlined"
              multiline
              numberOfLines={2}
              placeholder="e.g., Date night, new purchase, stay-cation..."
              style={{ marginTop: 12 }}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setUnlockDialog(false)}>Cancel</Button>
            <Button onPress={handleSaveUnlock}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
        duration={4000}
        style={
          snackbar.severity === 'error'
            ? { backgroundColor: '#c62828' }
            : undefined
        }
      >
        {snackbar.message}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  levelCard: { marginBottom: 12, backgroundColor: '#1a1a2e' },
  levelHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIcon: { fontSize: 22 },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  levelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  levelText: { fontSize: 18, fontWeight: 'bold', color: '#ffd700' },
  xpText: { fontSize: 13, color: '#aaa' },
  rewardBanner: {
    marginBottom: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,215,0,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
    alignItems: 'center',
  },
  rewardBannerText: { color: '#b8860b', fontWeight: 'bold', fontSize: 13 },
  calendarCard: { marginBottom: 12 },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  calendarMonthLabel: { fontSize: 16, fontWeight: 'bold' },
  calendarWeekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  calendarWeekHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: 'bold',
    color: '#888',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCell: {
    width: `${100 / 7}%`,
    minHeight: 58,
    alignItems: 'center',
    paddingTop: 4,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
    position: 'relative',
  },
  calendarDayNum: { fontSize: 12 },
  calendarBar: {
    flexDirection: 'row',
    width: '80%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 4,
    gap: 1,
  },
  calendarPoints: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#888',
    marginTop: 2,
  },
  calendarFreezeMark: {
    position: 'absolute',
    top: 2,
    right: 4,
    fontSize: 10,
  },
  selectedDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  selectedDayLabelRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  selectedDayLabel: { fontSize: 15, fontWeight: 'bold' },
  todayChip: { height: 22 },
  skillSection: { marginBottom: 8, borderLeftWidth: 3 },
  skillSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  skillSectionIcon: { fontSize: 20 },
  skillSectionTitle: { fontSize: 14, fontWeight: 'bold' },
  skillSectionValue: { fontSize: 18, fontWeight: 'bold' },
  noSkillsText: { color: '#999', textAlign: 'center', paddingVertical: 6 },
  skillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 4,
  },
  diffChip: { height: 24, borderRadius: 12, paddingHorizontal: 6 },
  toggleDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleDotCheck: { fontSize: 12, color: '#fff', lineHeight: 14 },
  skillName: { flex: 1, fontSize: 13 },
  streakChip: { height: 20, backgroundColor: 'transparent' },
  streakChipText: { fontSize: 11, marginVertical: 0, marginHorizontal: 4 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 12 },
  actionBtn: { flex: 1 },
});
