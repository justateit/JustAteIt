import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
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
  const [isHomeCooked, setIsHomeCooked] = useState(false);
  const [rating, setRating] = useState(4);

  const [uploading, setUploading] = useState(false);
  const [imageUri, setImageUri] = useState(null);
  const API_BASE_URL = 'http://100.70.89.132:8000';

  const handleUpload = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (result.canceled) return;
    setUploading(true);

    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.WEBP }
      );

      const formData = new FormData();
      formData.append('file', {
        uri: manipResult.uri,
        name: 'upload.webp',
        type: 'image/webp',
      });

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
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
              color={star <= rating ? '#FF6B4A' : '#E0E0E0'}
              style={styles.star}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity>
            <Text style={styles.saveDraft}>SAVE DRAFT</Text>
          </TouchableOpacity>
        </View>

        {/* Title */}
        <Text style={styles.title}>Record an Experience</Text>

        {/* The Dish Section */}
        <Text style={styles.sectionLabel}>THE DISH</Text>
        <TextInput
          style={styles.dishInput}
          placeholder="e.g. Mapo Tofu"
          placeholderTextColor="#D0D0D0"
          value={dish}
          onChangeText={setDish}
        />

        {/* Toggle Buttons */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, isRestaurant && styles.toggleButtonActive]}
            onPress={() => {
              setIsRestaurant(!isRestaurant);
            }}
          >
            <MaterialIcons
              name="restaurant"
              size={16}
              color={isRestaurant ? '#333' : '#666'}
              style={styles.toggleIcon}
            />
            <Text
              style={[styles.toggleText, isRestaurant && styles.toggleTextActive]}
            >
              RESTAURANT
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleButton, isHomeCooked && styles.toggleButtonActive]}
            onPress={() => {
              setIsHomeCooked(!isHomeCooked);
            }}
          >
            <Ionicons
              name="home-outline"
              size={16}
              color={isHomeCooked ? '#333' : '#666'}
              style={styles.toggleIcon}
            />
            <Text
              style={[styles.toggleText, isHomeCooked && styles.toggleTextActive]}
            >
              HOME COOKED
            </Text>
          </TouchableOpacity>
        </View>

        {/* Venue and City */}
        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <Text style={styles.fieldLabel}>VENUE</Text>
            <TextInput
              style={styles.input}
              placeholder="Restaurant Name"
              placeholderTextColor="#999"
              value={venue}
              onChangeText={setVenue}
            />
          </View>

          <View style={styles.halfWidth}>
            <Text style={styles.fieldLabel}>CITY</Text>
            <TextInput
              style={styles.input}
              placeholder="City"
              placeholderTextColor="#999"
              value={city}
              onChangeText={setCity}
            />
          </View>
        </View>

        {/* Sensory Notes */}
        <Text style={styles.sectionLabel}>SENSORY NOTES</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Describe the texture, the key flavors, the aroma..."
          placeholderTextColor="#B0B0B0"
          value={sensoryNotes}
          onChangeText={setSensoryNotes}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />

        {/* Actions Row */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="flask-outline" size={18} color="#FF6B4A" />
            <Text style={styles.actionButtonText}>Analyze Flavor Chemistry</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.uploadButton} onPress={handleUpload} disabled={uploading}>
            <Ionicons name={uploading ? "cloud-upload-outline" : "camera-outline"} size={18} color={uploading ? "#FF6B4A" : "#666"} />
              <Text style={[styles.uploadButtonText, uploading && {color: '#FF6B4A'}]}>
              {uploading ? 'Optimizing...' : 'Upload Photo'}</Text>
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
            <Text style={styles.archiveButtonText}>ARCHIVE LOG</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
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
    fontSize: 13,
    fontWeight: '600',
    color: '#FF6B4A',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 36,
    fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif',
    fontStyle: 'italic',
    color: '#000',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    letterSpacing: 1,
    paddingHorizontal: 24,
    marginTop: 24,
    marginBottom: 8,
  },
  dishInput: {
    fontSize: 22,
    color: '#333',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  toggleContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginTop: 20,
    gap: 8,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF',
  },
  toggleButtonActive: {
    backgroundColor: '#F5F5F5',
    borderColor: '#D0D0D0',
  },
  toggleIcon: {
    marginRight: 6,
  },
  toggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    letterSpacing: 0.5,
  },
  toggleTextActive: {
    color: '#333',
  },
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
    fontWeight: '600',
    color: '#999',
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    fontSize: 16,
    color: '#333',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  textArea: {
    fontSize: 15,
    color: '#333',
    paddingHorizontal: 24,
    paddingVertical: 16,
    marginHorizontal: 24,
    marginTop: 8,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#FF6B4A',
    marginLeft: 6,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  uploadButtonText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  ratingLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    letterSpacing: 1,
    paddingHorizontal: 24,
    marginTop: 32,
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  star: {
    marginHorizontal: 4,
  },
  ratingValueContainer: {
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    marginTop: -40,
  },
  ratingValue: {
    fontSize: 24,
    fontWeight: '300',
    color: '#FF6B4A',
  },
  ratingInstruction: {
    fontSize: 13,
    color: '#999',
    paddingHorizontal: 24,
    marginTop: 12,
  },
  bottomButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginTop: 40,
    gap: 12,
  },
  discardButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  discardButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
    letterSpacing: 0.5,
  },
  archiveButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#E8E8E8',
  },
  archiveButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    letterSpacing: 0.5,
  },
  bottomPadding: {
    height: 40,
  },
});