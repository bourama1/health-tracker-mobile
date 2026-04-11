import React, { useEffect, useState } from 'react';
import { StyleSheet, FlatList, RefreshControl, View } from 'react-native';
import { List, FAB, ActivityIndicator, Divider, Text } from 'react-native-paper';
import { getSleepRecords } from '@/src/services/api';

export default function SleepScreen() {
  const [sleepRecords, setSleepRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSleepRecords = async () => {
    try {
      const response = await getSleepRecords();
      setSleepRecords(response.data);
    } catch (error) {
      console.error('Error fetching sleep records:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSleepRecords();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSleepRecords();
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={sleepRecords}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => (
          <List.Item
            title={`${item.duration} hours`}
            description={`${new Date(item.date).toLocaleDateString()} - Quality: ${item.quality}/5`}
            left={props => <List.Icon {...props} icon="bed" />}
          />
        )}
        ItemSeparatorComponent={() => <Divider />}
      />
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => console.log('Add sleep record')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
