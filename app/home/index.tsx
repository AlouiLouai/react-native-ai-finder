import { useState, useEffect } from 'react';
import { 
  Image, 
  Platform, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View, 
  ScrollView, 
  Linking, 
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
  StatusBar
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons, MaterialIcons } from '@expo/vector-icons'; 
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

const { height } = Dimensions.get('window');

export default function HomeScreen() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [placesData, setPlacesData] = useState<any[]>([]); 
  const [showPlaces, setShowPlaces] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [recordingStatus, setRecordingStatus] = useState<string>('');

  const startRecording = async () => {
    try {
      setRecordingStatus('Listening...');
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      if (recording) {
        await recording.stopAndUnloadAsync();
        setRecording(null);
      }

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
    } catch (err) {
      console.error('Failed to start recording', err);
      setRecordingStatus('');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    setRecordingStatus('Processing...');
    setIsLoading(true);
    
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      
      if (uri) {
        await uploadRecording(uri);
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      setIsLoading(false);
      setRecordingStatus('');
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
        throw new Error(await response.text());
      }
  
      const data = await response.json();
  
      if (Array.isArray(data)) {
        setPlacesData(data);
        setShowPlaces(true);
      } else {
        console.error('Expected an array but received:', data);
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsLoading(false);
      setRecordingStatus('');
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
    setShowPlaces(false);
    setPlacesData([]);
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<MaterialIcons key={`star-${i}`} name="star" size={16} color="#FFC107" />);
      } else if (i === fullStars && halfStar) {
        stars.push(<MaterialIcons key={`star-half-${i}`} name="star-half" size={16} color="#FFC107" />);
      } else {
        stars.push(<MaterialIcons key={`star-outline-${i}`} name="star-outline" size={16} color="#FFC107" />);
      }
    }
    
    return stars;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {!showPlaces ? (
        <View style={styles.mainContainer}>
          <View style={styles.searchContainer}>
            <ThemedText style={styles.searchText} type="subtitle">
              {recordingStatus || "Speak to search places"}
            </ThemedText>
            
            {isLoading && (
              <ActivityIndicator size="large" color="#4285F4" style={styles.loader} />
            )}
          </View>

          <View style={styles.recordButtonContainer}>
            <TouchableOpacity 
              onPress={handleRecordButton} 
              style={[
                styles.recordButton,
                recording && styles.recordingActive
              ]}
              disabled={isLoading}
            >
              <Ionicons 
                name={recording ? "stop" : "mic"} 
                size={80} 
                color={recording ? "#EA4335" : "#4285F4"} 
              />
            </TouchableOpacity>
            
            {recording && (
              <View style={styles.recordingIndicator}>
                <Text style={styles.recordingText}>Recording...</Text>
              </View>
            )}
          </View>
          
          <View style={styles.googleBranding}>
            <Text style={styles.poweredByText}>Voice Search</Text>
          </View>
        </View>
      ) : (
        <View style={styles.resultsContainer}>
          <View style={styles.searchHeader}>
            <TouchableOpacity 
              onPress={resetToRecordingView} 
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#4285F4" />
            </TouchableOpacity>
            
            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color="#5F6368" style={styles.searchIcon} />
              <Text style={styles.searchQuery}>Places near me</Text>
              <TouchableOpacity onPress={resetToRecordingView}>
                <Ionicons name="mic" size={20} color="#4285F4" />
              </TouchableOpacity>
            </View>
          </View>
          
          <Text style={styles.resultsCount}>{placesData.length} results found</Text>
          
          <ScrollView 
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.placesContainer}>
              {placesData.map((place, index) => (
                <View key={index} style={styles.card}>
                  <Image 
                    source={{ uri: place.image || 'https://maps.googleapis.com/maps/api/staticmap?center=Brooklyn+Bridge,New+York,NY&zoom=13&size=600x300&maptype=roadmap' }} 
                    style={styles.cardImage} 
                  />
                  
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{place.name}</Text>
                    
                    <View style={styles.ratingContainer}>
                      <View style={styles.starsContainer}>
                        {renderStars(place.rating)}
                      </View>
                      <Text style={styles.ratingText}>{place.rating}</Text>
                    </View>
                    
                    <View style={styles.addressContainer}>
                      <Ionicons name="location" size={14} color="#5F6368" />
                      <Text style={styles.cardAddress} numberOfLines={1}>{place.address}</Text>
                    </View>
                    
                    <View style={styles.hoursContainer}>
                      <Ionicons name="time-outline" size={14} color="#5F6368" />
                      <Text style={styles.cardWorkingHours} numberOfLines={1}>{place.working_hours}</Text>
                    </View>

                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => Linking.openURL(place.location_links.directions)}
                      >
                        <Ionicons name="navigate" size={16} color="#4285F4" />
                        <Text style={styles.actionButtonText}>Directions</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => Linking.openURL(`tel:${place.phone || ''}`)}
                      >
                        <Ionicons name="call" size={16} color="#4285F4" />
                        <Text style={styles.actionButtonText}>Call</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => Linking.openURL(place.website || '')}
                      >
                        <Ionicons name="globe-outline" size={16} color="#4285F4" />
                        <Text style={styles.actionButtonText}>Website</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mainContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  searchContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  searchText: {
    fontSize: 18,
    color: '#5F6368',
    textAlign: 'center',
  },
  loader: {
    marginTop: 20,
  },
  recordButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#F8F9FA',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  recordingActive: {
    backgroundColor: '#FCEEED',
  },
  recordingIndicator: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingText: {
    color: '#EA4335',
    fontSize: 16,
    fontWeight: '500',
  },
  googleBranding: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
  },
  poweredByText: {
    color: '#5F6368',
    fontSize: 16,
  },
  
  // Results Screen Styles
  resultsContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAED',
  },
  backButton: {
    marginRight: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F3F4',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchQuery: {
    flex: 1,
    fontSize: 16,
    color: '#202124',
  },
  resultsCount: {
    fontSize: 14,
    color: '#5F6368',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  scrollView: {
    flex: 1,
  },
  placesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    height: height / 3.5, // Approximately 3 items per screen
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '40%',
  },
  cardContent: {
    padding: 12,
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#202124',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 4,
  },
  ratingText: {
    fontSize: 14,
    color: '#5F6368',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  hoursContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardAddress: {
    fontSize: 14,
    color: '#5F6368',
    marginLeft: 4,
    flex: 1,
  },
  cardWorkingHours: {
    fontSize: 14,
    color: '#5F6368',
    marginLeft: 4,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  actionButtonText: {
    color: '#4285F4',
    fontSize: 14,
    marginLeft: 4,
  },
});