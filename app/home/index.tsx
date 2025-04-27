import { useState } from 'react';
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View, ScrollView, Linking, SafeAreaView } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons'; 
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function HomeScreen() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [placesData, setPlacesData] = useState<any[]>([]); // State to hold parsed JSON data
  const [showPlaces, setShowPlaces] = useState<boolean>(false); // State to toggle between list and recording view

  const startRecording = async () => {
    try {
      console.log('Requesting permissions..');
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      if (recording) {
        console.log('Stopping previous recording first...');
        await recording.stopAndUnloadAsync();
        setRecording(null);
      }

      console.log('Starting recording..');
      const { recording: newRecording } = await Audio.Recording.createAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        }
      });

      setRecording(newRecording);
      console.log('Recording started');
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    console.log('Stopping recording..');
    if (!recording) return;

    setRecording(null);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    console.log('Recording stopped and stored at', uri);

    if (uri) {
      await uploadRecording(uri);
    }
  };

  const uploadRecording = async (uri: string) => {
    const formData = new FormData();
    
    formData.append('file', {
      uri,
      type: Platform.OS === 'ios' ? 'audio/wav' : 'audio/m4a',
      name: Platform.OS === 'ios' ? 'recording.wav' : 'recording.m4a',
    } as any);
  
    try {
      const response = await fetch('https://n8n-container.wittyforest-aed2327f.swedencentral.azurecontainerapps.io/webhook-test/record', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
  
      if (!response.ok) {
        console.error('Failed to upload recording:', await response.text());
        return;
      }
  
      const data = await response.json();
      console.log('Received data:', data); // Log the received data
  
      if (Array.isArray(data)) {
        setPlacesData(data); // Only set if data is an array
        setShowPlaces(true); // Show places instead of the recording interface
      } else {
        console.error('Expected an array but received:', data);
      }
    } catch (error) {
      console.error('Upload error:', error);
    }
  };
  
  const handleRecordButton = () => {
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const resetToRecordingView = () => {
    setShowPlaces(false); // Reset to the recording interface
    setPlacesData([]); // Clear the places data
  };

  return (
    <SafeAreaView style={styles.container}>
      {!showPlaces ? (
        <View style={styles.mainContainer}>
          <ThemedView style={styles.stepContainer}>
            <ThemedText type="subtitle">Start recording to search places</ThemedText>
          </ThemedView>

          {/* Record Button */}
          <View style={styles.recordButtonContainer}>
            <TouchableOpacity onPress={handleRecordButton} style={styles.recordButton}>
              <Ionicons name={recording ? 'stop-circle' : 'mic-circle'} size={150} color="#FF6D5A" />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <ScrollView style={styles.scrollView}>
          <ThemedView style={styles.titleContainer}>
            <ThemedText type="title">Places Found</ThemedText>
            <TouchableOpacity onPress={resetToRecordingView} style={styles.resetButton}>
              <Text style={styles.resetText}>Go back to Recording</Text>
            </TouchableOpacity>
          </ThemedView>
          
          {/* Display Places Data */}
          <View style={styles.placesContainer}>
            {placesData.map((place, index) => (
              <View key={index} style={styles.card}>
                <Image source={{ uri: place.image || 'https://via.placeholder.com/150' }} style={styles.cardImage} />
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{place.name}</Text>
                  <Text style={styles.cardRating}>Rating: {place.rating}</Text>
                  <Text style={styles.cardAddress}>{place.address}</Text>
                  <Text style={styles.cardWorkingHours}>{place.working_hours}</Text>

                  <TouchableOpacity
                    style={styles.directionsButton}
                    onPress={() => Linking.openURL(place.location_links.directions)}>
                    <Text style={styles.directionsText}>Get Directions</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  mainContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 50,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 16,
  },
  stepContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  recordButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  recordButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  // Styles for Places Display
  placesContainer: {
    marginTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  cardImage: {
    width: '100%',
    height: 150,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  cardRating: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
  },
  cardAddress: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
  },
  cardWorkingHours: {
    fontSize: 14,
    color: '#555',
    marginBottom: 12,
  },
  directionsButton: {
    backgroundColor: '#FF6D5A',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  directionsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  resetButton: {
    marginTop: 10,
    backgroundColor: '#FF6D5A',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  resetText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});