import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Image,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  TextInput,
  IconButton,
  ActivityIndicator,
  Portal,
  Dialog,
  Text,
  Divider,
} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import api from '@/src/services/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function PhotosScreen() {
  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate1, setSelectedDate1] = useState('');
  const [selectedDate2, setSelectedDate2] = useState('');
  const [photos1, setPhotos1] = useState<any>(null);
  const [photos2, setPhotos2] = useState<any>(null);
  const [uploadDate, setUploadDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  const [selectedFiles, setSelectedFiles] = useState<any>({
    front: null,
    side: null,
    back: null,
  });

  const fetchDates = useCallback(async () => {
    try {
      const response = await api.get('/photos/dates');
      setDates(response.data.map((d: any) => d.date));
    } catch (error) {
      console.error('Error fetching dates:', error);
    }
  }, []);

  const fetchPhotos = useCallback(async (date: string, setPhotos: any) => {
    if (!date) {
      setPhotos(null);
      return;
    }
    setLoading(true);
    try {
      const response = await api.get(`/photos/${date}`);
      setPhotos(response.data);
    } catch (error) {
      console.error('Error fetching photos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDates();
  }, [fetchDates]);

  useEffect(() => {
    fetchPhotos(selectedDate1, setPhotos1);
  }, [selectedDate1, fetchPhotos]);

  useEffect(() => {
    fetchPhotos(selectedDate2, setPhotos2);
  }, [selectedDate2, fetchPhotos]);

  const pickImage = async (target: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setSelectedFiles((prev: any) => ({
        ...prev,
        [target]: result.assets[0],
      }));
    }
  };

  const handleUpload = async () => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('date', uploadDate);

    ['front', 'side', 'back'].forEach((side) => {
      if (selectedFiles[side]) {
        const file = selectedFiles[side];
        const uriParts = file.uri.split('.');
        const fileType = uriParts[uriParts.length - 1];

        formData.append(side, {
          uri: file.uri,
          name: `${side}.${fileType}`,
          type: `image/${fileType}`,
        } as any);
      }
    });

    try {
      await api.post('/photos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      Alert.alert('Success', 'Photos uploaded successfully');
      fetchDates();
      setVisible(false);
      setSelectedFiles({ front: null, side: null, back: null });
    } catch (error) {
      console.error('Upload failed:', error);
      Alert.alert('Error', 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const ImageBox = ({
    path,
    side,
    label,
  }: {
    path?: string;
    side: string;
    label: string;
  }) => (
    <View style={styles.imageBox}>
      <Text style={styles.imageLabel}>{label}</Text>
      {path ? (
        <Image
          source={{ uri: path }}
          style={styles.image}
          resizeMode="contain"
        />
      ) : (
        <View style={styles.placeholderBox}>
          <MaterialCommunityIcons
            name="image-off-outline"
            size={32}
            color="#ccc"
          />
          <Text style={{ fontSize: 10, color: '#aaa' }}>No Image</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
        <Title style={styles.mainTitle}>Progress Photos</Title>

        <View style={styles.selectorContainer}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.selectLabel}>Date 1</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {dates.map((d) => (
                <Chip
                  key={d}
                  selected={selectedDate1 === d}
                  onPress={() => setSelectedDate1(d)}
                  style={styles.dateChip}
                  compact
                >
                  {d}
                </Chip>
              ))}
            </ScrollView>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.selectLabel}>Date 2 (Compare)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Chip
                selected={selectedDate2 === ''}
                onPress={() => setSelectedDate2('')}
                style={styles.dateChip}
                compact
              >
                None
              </Chip>
              {dates.map((d) => (
                <Chip
                  key={d}
                  selected={selectedDate2 === d}
                  onPress={() => setSelectedDate2(d)}
                  style={styles.dateChip}
                  disabled={selectedDate1 === d}
                  compact
                >
                  {d}
                </Chip>
              ))}
            </ScrollView>
          </View>
        </View>

        <Divider style={{ marginVertical: 16 }} />

        {loading ? (
          <ActivityIndicator style={{ marginTop: 50 }} />
        ) : !selectedDate1 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="image-multiple-outline"
              size={64}
              color="#ddd"
            />
            <Text style={styles.emptyText}>Select a date to view photos</Text>
          </View>
        ) : (
          <View>
            <View style={styles.photoGrid}>
              {['front', 'side', 'back'].map((side) => (
                <View
                  key={side}
                  style={
                    selectedDate2 ? styles.comparisonRow : styles.singleRow
                  }
                >
                  <ImageBox
                    path={photos1?.[`${side}_path`]}
                    side={side}
                    label={`${side.toUpperCase()} (${selectedDate1})`}
                  />
                  {selectedDate2 && (
                    <ImageBox
                      path={photos2?.[`${side}_path`]}
                      side={side}
                      label={`${side.toUpperCase()} (${selectedDate2})`}
                    />
                  )}
                </View>
              ))}
            </View>
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <Portal>
        <Dialog
          visible={visible}
          onDismiss={() => setVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title>Upload Photos</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Date"
              value={uploadDate}
              onChangeText={setUploadDate}
              mode="outlined"
              style={{ marginBottom: 16 }}
            />
            <View style={styles.uploadRow}>
              {['front', 'side', 'back'].map((side) => (
                <TouchableOpacity
                  key={side}
                  onPress={() => pickImage(side)}
                  style={styles.uploadBox}
                >
                  {selectedFiles[side] ? (
                    <Image
                      source={{ uri: selectedFiles[side].uri }}
                      style={styles.uploadPreview}
                    />
                  ) : (
                    <View style={styles.uploadPlaceholder}>
                      <MaterialCommunityIcons
                        name="camera-plus-outline"
                        size={24}
                        color="#666"
                      />
                      <Text style={{ fontSize: 10 }}>{side}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setVisible(false)}>Cancel</Button>
            <Button
              mode="contained"
              onPress={handleUpload}
              loading={isUploading}
              disabled={
                isUploading ||
                (!selectedFiles.front &&
                  !selectedFiles.side &&
                  !selectedFiles.back)
              }
            >
              Upload
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <FAB
        style={styles.fab}
        icon="camera"
        label="Upload"
        onPress={() => setVisible(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  selectorContainer: {
    flexDirection: 'row',
  },
  selectLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: 'bold',
  },
  dateChip: {
    marginRight: 4,
    backgroundColor: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
  },
  emptyText: {
    color: '#999',
    marginTop: 12,
  },
  photoGrid: {
    flexDirection: 'column',
  },
  singleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  imageBox: {
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  imageLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#777',
    marginBottom: 4,
  },
  image: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  placeholderBox: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 8,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#1976d2',
  },
  dialog: {
    borderRadius: 12,
  },
  uploadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  uploadBox: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  uploadPreview: {
    width: '100%',
    height: '100%',
  },
  uploadPlaceholder: {
    alignItems: 'center',
  },
});
