import React, { useEffect, useState } from 'react';
import { StyleSheet, FlatList, RefreshControl, View } from 'react-native';
import { List, Card, Title, Paragraph, FAB, ActivityIndicator, Divider } from 'react-native-paper';
import { getMeasurements } from '@/src/services/api';

export default function MeasurementsScreen() {
  const [measurements, setMeasurements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMeasurements = async () => {
    try {
      const response = await getMeasurements();
      setMeasurements(response.data);
    } catch (error) {
      console.error('Error fetching measurements:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMeasurements();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMeasurements();
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
        data={measurements}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => (
          <List.Item
            title={`Weight: ${item.bodyweight} kg`}
            description={`${new Date(item.date).toLocaleDateString()} - Body Fat: ${item.body_fat}%`}
            left={props => <List.Icon {...props} icon="scale-bathroom" />}
          />
        )}
        ItemSeparatorComponent={() => <Divider />}
      />
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => console.log('Add measurement')}
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
