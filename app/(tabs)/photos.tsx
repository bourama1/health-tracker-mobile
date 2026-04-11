import React, { useEffect, useState } from 'react';
import { StyleSheet, FlatList, RefreshControl, View, Image, Dimensions } from 'react-native';
import { FAB, ActivityIndicator, Text, List, Divider } from 'react-native-paper';
import { getPhotoDates } from '@/src/services/api';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');

export default function PhotosScreen() {
  const [dates, setDates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDates = async () => {
    try {
      const response = await getPhotoDates();
      setDates(response.data);
    } catch (error) {
      console.error('Error fetching photo dates:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDates();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDates();
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      console.log('Image picked:', result.assets[0].uri);
      // Logic to upload to backend would go here
    }
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
        data={dates}
        keyExtractor={(item) => item.date}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => (
          <List.Item
            title={new Date(item.date).toLocaleDateString()}
            description="Tap to view photos"
            left={props => <List.Icon {...props} icon="calendar" />}
            onPress={() => console.log('View photos for', item.date)}
          />
        )}
        ItemSeparatorComponent={() => <Divider />}
      />
      <FAB
        style={styles.fab}
        icon="camera"
        onPress={pickImage}
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
