import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, View, Dimensions } from 'react-native';
import { Card, Title, ActivityIndicator, Text } from 'react-native-paper';
import { LineChart } from 'react-native-chart-kit';
import { getMeasurements, getSleepRecords } from '@/src/services/api';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const [measurements, setMeasurements] = useState([]);
  const [sleepRecords, setSleepRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [mRes, sRes] = await Promise.all([getMeasurements(), getSleepRecords()]);
        setMeasurements(mRes.data.slice(-7).reverse()); // Last 7 records
        setSleepRecords(sRes.data.slice(-7).reverse());
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const weightData = {
    labels: measurements.map(m => new Date(m.date).toLocaleDateString().split('/')[0] + '/' + new Date(m.date).toLocaleDateString().split('/')[1]),
    datasets: [{ data: measurements.map(m => m.bodyweight || 0) }]
  };

  const sleepData = {
    labels: sleepRecords.map(s => new Date(s.date).toLocaleDateString().split('/')[0] + '/' + new Date(s.date).toLocaleDateString().split('/')[1]),
    datasets: [{ data: sleepRecords.map(s => s.duration || 0) }]
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>Weight Trend (Last 7)</Title>
          {measurements.length > 0 ? (
            <LineChart
              data={weightData}
              width={width - 40}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          ) : <Text>No data available</Text>}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>Sleep Duration (Last 7)</Title>
          {sleepRecords.length > 0 ? (
            <LineChart
              data={sleepData}
              width={width - 40}
              height={220}
              chartConfig={chartConfig}
              style={styles.chart}
            />
          ) : <Text>No data available</Text>}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const chartConfig = {
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 1,
  color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  style: {
    borderRadius: 16
  },
  propsForDots: {
    r: '6',
    strokeWidth: '2',
    stroke: '#ffa726'
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    marginBottom: 20,
    elevation: 4,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16
  }
});
