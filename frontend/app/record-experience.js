import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function RecordExperience() {
  const [dish, setDish] = useState('');
  const [venue, setVenue] = useState('');
  const [city, setCity] = useState('');
  const [sensoryNotes, setSensoryNotes] = useState('');
  const [isRestaurant, setIsRestaurant] = useState(true);
  const [rating, setRating] = useState(4);

  const [uploading, setUploading] = useState(false);
  const [imageUri, setImageUri] = useState(null);
  const [containerWidth, setContainerWidth] = useState(0);
  
  const API_BASE_URL = Platform.OS === 'web'
  ? 'http://localhost:8000'
  : 'https://unossified-impressively-arya.ngrok-free.dev';

  const slideAnim = useRef(new Animated.Value(0)).current;
  const sliderWidth = containerWidth / 2;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isRestaurant ? 0 : 1,
      useNativeDriver: true,
      tension: 60,
      friction: 9,
    }).start();
  }, [isRestaurant]);

  const handleUpload = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
      exif: true,
    });

    if (result.canceled) return;
    setUploading(true);

    try {
      const asset = result.assets[0];
      const exifData = asset.exif;
      let latitude = exifData?.GPSLatitude ?? null;
      let longitude = exifData?.GPSLongitude ?? null;

      if (latitude != null && exifData?.GPSLatitudeRef === 'S') latitude = -latitude;
      if (longitude != null && exifData?.GPSLongitudeRef === 'W') longitude = -longitude;

      const manipResult = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.WEBP }
      );

      const formData = new FormData();
      formData.append('file', {
        uri: manipResult.uri,
        name: 'upload.webp',
        type: 'image/webp',
      });

      if (latitude != null && longitude != null) {
        formData.append('latitude', latitude.toString());
        formData.append('longitude', longitude.toString());
      }

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
        headers: { 'ngrok-skip-browser-warning': 'true' },
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      if (data.restaurant_name) {
       setVenue(data.restaurant_name);
       setCity(data.location || '');
      }
      setImageUri(data.url); 
      alert('Upload Successful!');
    } catch (error) {
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => setRating(star)}>
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={38}
              color={star <= rating ? '#FF6B4A' : 'rgba(0,0,0,0.1)'}
              style={styles.star}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" />
      
      {/* Background Gradient for Glass Effect */}
      <LinearGradient
        colors={['#FFF0EA', '#F3F6F8', '#EAF2F8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.draftButton}>
              <Text style={styles.saveDraft}>SAVE DRAFT</Text>
            </TouchableOpacity>
          </View>

          {/* Title */}
          <Text style={styles.title}>Record an Experience</Text>

          {/* Glass Dish Input */}
          <Text style={styles.sectionLabel}>THE DISH</Text>
          <View style={styles.glassInputContainer}>
            <TextInput
              style={styles.dishInput}
              placeholder="e.g. Mapo Tofu"
              placeholderTextColor="rgba(60, 60, 67, 0.3)"
              value={dish}
              onChangeText={setDish}
            />
          </View>

          {/* Glass Toggle Switch */}
          <View style={styles.toggleOuterContainer}>
            <BlurView intensity={80} tint="light" style={styles.toggleGlassWrapper}>
              
              {/* Animated Background Pill */}
              <Animated.View
                style={[
                  styles.toggleSlider,
                  {
                    width: sliderWidth, 
                    transform: [{ translateX: slideAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, sliderWidth],
                      }) 
                    }],
                  },
                ]}
              />

              {/* Toggle Buttons */}
              <View 
                style={{ flexDirection: 'row', flex: 1 }}
                onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
              >
                <TouchableOpacity
                  style={styles.toggleButton}
                  onPress={() => setIsRestaurant(true)}
                  activeOpacity={0.7}
                >
                <MaterialIcons
                  name="restaurant"
                  size={16}
                  color={isRestaurant ? '#333' : '#666'}
                  style={styles.toggleIcon}
                />
                <Text style={[styles.toggleText, isRestaurant && styles.toggleTextActive]}>
                  RESTAURANT
                </Text>
              </TouchableOpacity>

                <TouchableOpacity
                  style={styles.toggleButton}
                  onPress={() => setIsRestaurant(false)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="home-outline"
                    size={16}
                    color={!isRestaurant ? '#333' : '#666'}
                    style={styles.toggleIcon}
                  />
                  <Text style={[styles.toggleText, !isRestaurant && styles.toggleTextActive]}>
                    HOME COOKED
                  </Text>
                </TouchableOpacity>
              </View>
            </BlurView>
          </View>

          {/* Venue and City Inputs */}
          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.fieldLabel}>VENUE</Text>
              <View style={styles.glassInputSmall}>
                <TextInput
                  style={styles.input}
                  placeholder="Name"
                  placeholderTextColor="rgba(60, 60, 67, 0.3)"
                  value={venue}
                  onChangeText={setVenue}
                />
              </View>
            </View>

            <View style={styles.halfWidth}>
              <Text style={styles.fieldLabel}>CITY</Text>
              <View style={styles.glassInputSmall}>
                <TextInput
                  style={styles.input}
                  placeholder="Location"
                  placeholderTextColor="rgba(60, 60, 67, 0.3)"
                  value={city}
                  onChangeText={setCity}
                />
              </View>
            </View>
          </View>

          {/* Sensory Notes Glass Card */}
          <Text style={styles.sectionLabel}>SENSORY NOTES</Text>
          <View style={styles.notesContainer}>
            <TextInput
              style={styles.textArea}
              placeholder="Describe the texture, the key flavors, the aroma..."
              placeholderTextColor="rgba(60, 60, 67, 0.3)"
              value={sensoryNotes}
              onChangeText={setSensoryNotes}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          {/* Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.glassActionButton}>
              <Ionicons name="flask-outline" size={18} color="#FF6B4A" />
              <Text style={styles.actionButtonText}>Flavor AI</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.glassUploadButton} onPress={handleUpload} disabled={uploading}>
              <Ionicons name={uploading ? "cloud-upload-outline" : "camera-outline"} size={18} color={uploading ? "#FF6B4A" : "#555"} />
                <Text style={[styles.uploadButtonText, uploading && {color: '#FF6B4A'}]}>
                {uploading ? 'Processing...' : 'Add Photo'}</Text>
            </TouchableOpacity>
          </View>

          {/* Rating */}
          <Text style={styles.ratingLabel}>RATING</Text>
          {renderStars()}
          <View style={styles.ratingValueContainer}>
            <Text style={styles.ratingValue}>{rating}.0</Text>
          </View>
          <Text style={styles.ratingInstruction}>Drag across stars to rate</Text>

          {/* Bottom Buttons */}
          <View style={styles.bottomButtons}>
            <TouchableOpacity style={styles.discardButton}>
              <Text style={styles.discardButtonText}>DISCARD</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.archiveButton}>
              <LinearGradient
                colors={['#FFF', '#F0F0F0']}
                style={styles.archiveGradient}
              >
                <Text style={styles.archiveButtonText}>ARCHIVE LOG</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  saveDraft: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6B4A',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 34,
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    fontWeight: '600',
    fontStyle: 'italic',
    color: '#1a1a1a',
    paddingHorizontal: 24,
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.05)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A8A8E',
    letterSpacing: 1.2,
    paddingHorizontal: 24,
    marginTop: 28,
    marginBottom: 10,
  },
  
  // GLASS INPUT (Large)
  glassInputContainer: {
    marginHorizontal: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  dishInput: {
    fontSize: 20,
    color: '#333',
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontWeight: '500',
  },

  // GLASS TOGGLE
  toggleOuterContainer: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  toggleGlassWrapper: {
    flexDirection: 'row',
    position: 'relative',
    borderRadius: 14,
    padding: 4,
    alignSelf: 'flex-start',
    overflow: 'hidden',
    // Glass borders
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    backgroundColor: 'rgba(255,255,255,0.3)', 
  },
  toggleSlider: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  toggleButton: {
    flex: 1, 
    minWidth: 135,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    zIndex: 1,
  },
  toggleIcon: {
    marginRight: 8,
  },
  toggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666',
    letterSpacing: 0.5,
  },
  toggleTextActive: {
    color: '#333',
  },

  // ROW INPUTS
  row: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginTop: 24,
    gap: 16,
  },
  halfWidth: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A8A8E',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  glassInputSmall: {
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  input: {
    fontSize: 16,
    color: '#333',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },

  // SENSORY NOTES (Glass Card)
  notesContainer: {
    marginHorizontal: 24,
    marginTop: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    overflow: 'hidden',
  },
  textArea: {
    fontSize: 15,
    color: '#333',
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 120,
  },

  // ACTIONS
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 20,
  },
  glassActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 74, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 74, 0.15)',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF6B4A',
    marginLeft: 6,
  },
  glassUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: {width:0, height:2}
  },
  uploadButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginLeft: 6,
  },

  // RATING
  ratingLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A8A8E',
    letterSpacing: 1,
    paddingHorizontal: 24,
    marginTop: 36,
    marginBottom: 16,
    textAlign: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  star: {
    marginHorizontal: 6,
    shadowColor: '#FF6B4A',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 2},
  },
  ratingValueContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  ratingValue: {
    fontSize: 28,
    fontWeight: '300',
    color: '#FF6B4A',
  },
  ratingInstruction: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },

  // BOTTOM
  bottomButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginTop: 40,
    gap: 16,
  },
  discardButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 14,
  },
  discardButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
    letterSpacing: 0.5,
  },
  archiveButton: {
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  archiveGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFF',
  },
  archiveButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    letterSpacing: 0.5,
  },
  bottomPadding: {
    height: 40,
  },
});