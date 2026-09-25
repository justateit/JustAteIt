import LiquidGlass from '@/components/LiquidGlass';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme-context';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
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
import { getDrafts, getNearbyVenue, publishDraft, saveDraft, submitLog, updateDraft, upsertUser } from '../utils/flavorProfileApi';

const SCREEN_HEIGHT = Dimensions.get('window').height;

/**
 * Reusable wrapper that fades in + slides up when scrolled into the viewport,
 * and fades out + slides down when scrolled out. Uses scrollY (Animated.Value)
 * and measures its own layout offset within the ScrollView content.
 */
function AnimatedSection({ children, scrollY, delay = 0, style }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const isAnimated = useRef(false);
  const layoutY = useRef(0);

  const handleLayout = (e) => {
    layoutY.current = e.nativeEvent.layout.y;
    // If we haven't animated yet and we're near the top, trigger it now.
    if (!isAnimated.current && layoutY.current < SCREEN_HEIGHT * 0.8) {
      triggerAnimation();
    }
  };

  const triggerAnimation = () => {
    if (isAnimated.current) return;
    isAnimated.current = true;
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay,
        tension: 40,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  };

  useEffect(() => {
    const listenerId = scrollY.addListener(({ value }) => {
      const elementScreenY = layoutY.current - value;
      if (elementScreenY < SCREEN_HEIGHT * 0.9 && !isAnimated.current) {
        triggerAnimation();
      }
    });

    // Initial check: if we're likely on screen, just show it.
    // We use a small timeout to let onLayout potentially fire first.
    const timer = setTimeout(() => {
      if (!isAnimated.current) triggerAnimation();
    }, 100 + delay);

    return () => {
      scrollY.removeListener(listenerId);
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      onLayout={handleLayout}
      style={[{ opacity, transform: [{ translateY }] }, style]}
    >
      {children}
    </Animated.View>
  );
}

export default function RecordExperience() {
  const { user } = useUser();
  const { colorScheme } = useTheme();
  const { draftId } = useLocalSearchParams();

  const [dish, setDish] = useState('');
  const [venue, setVenue] = useState('');
  const [city, setCity] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [sensoryNotes, setSensoryNotes] = useState('');
  const [isRestaurant, setIsRestaurant] = useState(true);
  const [rating, setRating] = useState(0);

  const [uploading, setUploading] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [imageUri, setImageUri] = useState(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (!draftId || !user) return;
    getDrafts(user.id).then(({ drafts }) => {
      const draft = drafts.find(d => d.id === draftId);
      if (!draft) return;
      setDish(draft.dish_name || '');
      setVenue(draft.venue_name || '');
      setCity(draft.city || '');
      setCuisine(draft.cuisine || '');
      setSensoryNotes(draft.sensory_notes || '');
      setIsRestaurant(draft.is_restaurant);
      setRating(draft.rating || 0);
      setImageUri(draft.image_url || null);
    });
  }, [draftId, user]);

  const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:8000';

  const [scrollY] = useState(() => new Animated.Value(0));
  const [slideAnim] = useState(() => new Animated.Value(0));
  const sliderWidth = containerWidth / 2;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isRestaurant ? 0 : 1,
      useNativeDriver: true,
      tension: 60,
      friction: 9,
    }).start();
  }, [isRestaurant, slideAnim]);

  // Replace the handleUpload function in record-experience.js with this:

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

      // Show local preview immediately
      setImageUri(manipResult.uri);

      const formData = new FormData();

      if (Platform.OS === 'web') {
        // On web, fetch the blob URI and append as a real Blob
        const response = await fetch(manipResult.uri);
        const blob = await response.blob();
        formData.append('file', new File([blob], 'upload.webp', { type: 'image/webp' }));
      } else {
        // React Native native format
        formData.append('file', {
          uri: manipResult.uri,
          name: 'upload.webp',
          type: 'image/webp',
        });
      }

      if (latitude != null && longitude != null) {
        formData.append('latitude', latitude.toString());
        formData.append('longitude', longitude.toString());
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/media/upload`, {
        method: 'POST',
        body: formData,
        headers: { 'ngrok-skip-browser-warning': 'true' },
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      setImageUri(data.url);

      // AUTO-DISCOVERY: If GPS data exists and isRestaurant is toggled, hit Google Places
      if (isRestaurant && latitude && longitude) {
        try {
          const venueData = await getNearbyVenue(latitude, longitude);
          if (venueData.found) {
            setVenue(venueData.venue.name);
            setCity(venueData.venue.vicinity || '');
          }
        } catch (e) {
          console.warn('Nearby venue lookup failed:', e);
        }
      }

      alert('Upload Successful!');
    } catch (error) {
      console.error('[Upload]', error);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleArchive = async () => {
    if (!dish.trim()) {
      alert('Please enter a dish name before archiving.');
      return;
    }
    if (!user) {
      alert('You must be signed in to save a log.');
      return;
    }
    setArchiving(true);
    try {
      // Step 0: Ensure User exists in DB (Fix for ForeignKeyViolation)
      await upsertUser(user.id, {
        username: user.username || user.firstName || 'Foodie',
        avatar_url: user.imageUrl,
      });

      if (draftId) {
        // Save the latest form state to the draft first, so publish
        // doesn't archive stale data from the last "Save Draft" press.
        await updateDraft(draftId, {
          dish_name: dish.trim(),
          venue_name: venue.trim() || null,
          city: city.trim() || null,
          cuisine: cuisine.trim() || null,
          is_restaurant: isRestaurant,
          sensory_notes: sensoryNotes.trim() || null,
          rating: rating,
          image_url: imageUri || null,
        });
        await publishDraft(draftId);
      } else {
        await submitLog(user.id, {
          dish_name: dish.trim(),
          venue_name: venue.trim() || null,
          city: city.trim() || null,
          cuisine: cuisine.trim() || null,
          is_restaurant: isRestaurant,
          sensory_notes: sensoryNotes.trim() || null,
          rating: rating,
          image_url: imageUri || null,
        });
      }
      alert('Log archived! ✓');
      // Reset form
      setDish('');
      setVenue('');
      setCity('');
      setCuisine('');
      setSensoryNotes('');
      setRating(0);
      setImageUri(null);
    } catch (err) {
      console.error('[Archive]', err);
      alert('Failed to save log. Check your connection and try again.');
    } finally {
      setArchiving(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!user) {
      alert('You must be signed in to save a draft.');
      return;
    }
    setSavingDraft(true);
    try {
      await upsertUser(user.id, {
        username: user.username || user.firstName || 'Foodie',
        avatar_url: user.imageUrl,
      });
      if (draftId) {
        await updateDraft(draftId, {
          dish_name: dish.trim() || null,
          venue_name: venue.trim() || null,
          city: city.trim() || null,
          cuisine: cuisine.trim() || null,
          is_restaurant: isRestaurant,
          sensory_notes: sensoryNotes.trim() || null,
          rating: rating || null,
          image_url: imageUri || null,
        });
      } else {
        await saveDraft(user.id, {
          dish_name: dish.trim() || null,
          venue_name: venue.trim() || null,
          city: city.trim() || null,
          cuisine: cuisine.trim() || null,
          is_restaurant: isRestaurant,
          sensory_notes: sensoryNotes.trim() || null,
          rating: rating || null,
          image_url: imageUri || null,
        });
      }
      alert('Draft saved! ✓');
    } catch (err) {
      console.error('[SaveDraft]', err);
      alert('Failed to save draft. Check your connection and try again.');
    } finally {
      setSavingDraft(false);
    }
  };


  // Each star gets its own Animated.Value for scale
  const [starScales] = useState(() => [1, 2, 3, 4, 5].map(() => new Animated.Value(1)));
  const [starOpacities] = useState(() => [1, 2, 3, 4, 5].map(() => new Animated.Value(0.4)));
  const prevRating = useRef(rating);

  useEffect(() => {
    const prev = prevRating.current;
    prevRating.current = rating;

    [1, 2, 3, 4, 5].forEach((star, index) => {
      const isFilled = star <= rating;
      const wasFilled = star <= prev;

      if (isFilled && !wasFilled) {
        // Star just became selected -- bounce in with stagger
        const staggerDelay = (index - Math.min(prev, rating)) * 60;

        // Reset scale down first, then spring up
        starScales[index].setValue(0.3);
        Animated.sequence([
          Animated.delay(staggerDelay),
          Animated.spring(starScales[index], {
            toValue: 1,
            tension: 200,
            friction: 6,
            useNativeDriver: true,
          }),
        ]).start();

        // Fade in
        starOpacities[index].setValue(0.4);
        Animated.sequence([
          Animated.delay(staggerDelay),
          Animated.timing(starOpacities[index], {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      } else if (!isFilled && wasFilled) {
        // Star just became deselected -- shrink out then settle
        const staggerDelay = (Math.max(prev, rating) - index) * 40;

        Animated.sequence([
          Animated.delay(staggerDelay),
          Animated.spring(starScales[index], {
            toValue: 1,
            tension: 120,
            friction: 8,
            useNativeDriver: true,
          }),
        ]).start();

        // Fade to dim
        Animated.sequence([
          Animated.delay(staggerDelay),
          Animated.timing(starOpacities[index], {
            toValue: 0.4,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      } else if (isFilled) {
        // Already filled -- make sure opacity is correct
        starOpacities[index].setValue(1);
        starScales[index].setValue(1);
      } else {
        starOpacities[index].setValue(0.4);
        starScales[index].setValue(1);
      }
    });
  }, [rating, starOpacities, starScales]);

  // Initialize star opacities on mount
  useEffect(() => {
    [1, 2, 3, 4, 5].forEach((star, index) => {
      starOpacities[index].setValue(star <= rating ? 1 : 0.4);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star, index) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            activeOpacity={0.7}
          >
            <Animated.View
              style={{
                transform: [{ scale: starScales[index] }],
                opacity: starOpacities[index],
              }}
            >
              <Ionicons
                name={star <= rating ? 'star' : 'star-outline'}
                size={38}
                color={star <= rating ? '#FF6B4A' : 'rgba(0,0,0,0.15)'}
                style={styles.star}
              />
            </Animated.View>
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
        colors={colorScheme === 'dark' ? ['#1A1A1A', '#121212', '#0A0A0A'] : ['#FFF0EA', '#F3F6F8', '#EAF2F8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Orange light leak — top-right */}
      <LinearGradient
        colors={['transparent', 'transparent', 'rgba(255,107,74,0.13)']}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Orange light leak — bottom-left */}
      <LinearGradient
        colors={['rgba(255,140,80,0.09)', 'transparent', 'transparent']}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
        >

          {/* Header */}
          <AnimatedSection scrollY={scrollY} delay={0}>
            <View style={styles.header}>
              <TouchableOpacity style={styles.draftButton} onPress={handleSaveDraft} disabled={savingDraft}>
                <Text style={styles.saveDraft}>SAVE DRAFT</Text>
              </TouchableOpacity>
            </View>
          </AnimatedSection>

          {/* Title */}
          <AnimatedSection scrollY={scrollY} delay={80}>
            <Text style={[styles.title, { color: Colors[colorScheme].text }]}>Record an Experience</Text>
          </AnimatedSection>

          {/* Glass Dish Input */}
          <AnimatedSection scrollY={scrollY} delay={160}>
            <Text style={styles.sectionLabel}>THE DISH</Text>
            <View style={[styles.glassInputContainer, { backgroundColor: colorScheme === 'dark' ? 'rgba(40, 40, 40, 0.65)' : 'rgba(255, 255, 255, 0.65)', borderColor: colorScheme === 'dark' ? 'rgba(80, 80, 80, 0.9)' : 'rgba(255, 255, 255, 0.9)' }]}>
              <TextInput
                style={[styles.dishInput, { color: Colors[colorScheme].text }]}
                placeholder="e.g. Mapo Tofu"
                placeholderTextColor={colorScheme === 'dark' ? "rgba(255, 255, 255, 0.3)" : "rgba(60, 60, 67, 0.3)"}
                value={dish}
                onChangeText={setDish}
              />
            </View>
          </AnimatedSection>

          {/* Glass Toggle Switch */}
          <AnimatedSection scrollY={scrollY} delay={240}>
            <View style={styles.toggleOuterContainer}>
              <LiquidGlass
                borderRadius={25}
                style={[styles.toggleGlassWrapper, { backgroundColor: colorScheme === 'dark' ? 'rgba(50, 50, 50, 0.3)' : 'rgba(255,255,255,0.3)', borderColor: colorScheme === 'dark' ? 'rgba(100, 100, 100, 0.5)' : 'rgba(255, 255, 255, 0.5)' }]}
              >

                {/* Animated Background Pill */}
                <Animated.View
                  style={[
                    styles.toggleSlider,
                    { backgroundColor: colorScheme === 'dark' ? '#444' : '#FFFFFF' },
                    {
                      width: sliderWidth,
                      transform: [{
                        translateX: slideAnim.interpolate({
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
                      color={isRestaurant ? (colorScheme === 'dark' ? '#FFF' : '#333') : '#666'}
                      style={styles.toggleIcon}
                    />
                    <Text style={[styles.toggleText, isRestaurant && styles.toggleTextActive, isRestaurant && { color: colorScheme === 'dark' ? '#FFF' : '#333' }]}>
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
                      color={!isRestaurant ? (colorScheme === 'dark' ? '#FFF' : '#333') : '#666'}
                      style={styles.toggleIcon}
                    />
                    <Text style={[styles.toggleText, !isRestaurant && styles.toggleTextActive, !isRestaurant && { color: colorScheme === 'dark' ? '#FFF' : '#333' }]}>
                      HOME COOKED
                    </Text>
                  </TouchableOpacity>
                </View>
              </LiquidGlass>
            </View>
          </AnimatedSection>

          {/* Venue and City Inputs — hidden when Home Cooked */}
          {isRestaurant && (
            <AnimatedSection scrollY={scrollY} delay={320} style={{ zIndex: 999 }}>
              <View style={[styles.row, { zIndex: 999 }]}>
                <View style={{ width: '100%', zIndex: 999 }}>
                  <Text style={styles.fieldLabel}>VENUE & CITY</Text>
                  <View style={[styles.glassInputSmall, { padding: 0, overflow: 'visible', zIndex: 999, backgroundColor: colorScheme === 'dark' ? 'rgba(40, 40, 40, 0.65)' : 'rgba(255, 255, 255, 0.65)', borderColor: colorScheme === 'dark' ? 'rgba(80, 80, 80, 0.9)' : 'rgba(255, 255, 255, 0.9)' }]}>
                    <GooglePlacesAutocomplete
                      placeholder="Search for a restaurant..."
                      onPress={(data, details = null) => {
                        setVenue(data.structured_formatting?.main_text || data.description.split(',')[0]);
                        setCity(data.structured_formatting?.secondary_text || data.description);
                      }}
                      query={{
                        key: process.env.EXPO_PUBLIC_GOOGLE_API_KEY,
                        language: 'en',
                        types: 'establishment',
                      }}
                      styles={{
                        container: { flex: 0 },
                        textInput: [styles.input, { paddingHorizontal: 12, height: 44, color: Colors[colorScheme].text, backgroundColor: 'transparent' }],
                        listView: {
                          position: 'absolute',
                          top: 45,
                          backgroundColor: Colors[colorScheme].card,
                          borderRadius: 8,
                          elevation: 5,
                          zIndex: 1000,
                        },
                        description: { color: Colors[colorScheme].text }
                      }}
                      textInputProps={{
                        placeholderTextColor: colorScheme === 'dark' ? "rgba(255, 255, 255, 0.3)" : "rgba(60, 60, 67, 0.3)"
                      }}
                      requestUrl={{
                        useOnWeb: true,
                        url: 'http://localhost:8000/api/v1/places',
                      }}
                    />
                  </View>
                </View>
              </View>
            </AnimatedSection>
          )}

          {/* Cuisine Text Field */}
          <AnimatedSection scrollY={scrollY} delay={360}>
            <View style={{ paddingHorizontal: 24, marginTop: 24 }}>
              <Text style={styles.fieldLabel}>CUISINE</Text>
              <View style={styles.glassInputSmall}>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Mexican, Japanese, Italian"
                  placeholderTextColor="rgba(60, 60, 67, 0.3)"
                  value={cuisine}
                  onChangeText={setCuisine}
                />
              </View>
            </View>
          </AnimatedSection>

          {/* Sensory Notes Glass Card */}
          <AnimatedSection scrollY={scrollY} delay={400}>
            <Text style={styles.sectionLabel}>SENSORY NOTES</Text>
            <View style={[styles.notesContainer, { backgroundColor: colorScheme === 'dark' ? 'rgba(40, 40, 40, 0.5)' : 'rgba(255, 255, 255, 0.5)', borderColor: colorScheme === 'dark' ? 'rgba(80, 80, 80, 0.6)' : 'rgba(255, 255, 255, 0.6)' }]}>
              <TextInput
                style={[styles.textArea, { color: Colors[colorScheme].text }]}
                placeholder="Describe the texture, the key flavors, the aroma..."
                placeholderTextColor={colorScheme === 'dark' ? "rgba(255, 255, 255, 0.3)" : "rgba(60, 60, 67, 0.3)"}
                value={sensoryNotes}
                onChangeText={setSensoryNotes}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>
          </AnimatedSection>

          {/* Photo Preview Card */}
          {imageUri && (
            <AnimatedSection scrollY={scrollY} delay={440}>
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />
                {uploading && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator size="small" color="#FFF" />
                    <Text style={styles.uploadingText}>Uploading to S3...</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setImageUri(null)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close" size={16} color="#FFF" />
                </TouchableOpacity>
              </View>
            </AnimatedSection>
          )}

          {/* Actions */}
          <AnimatedSection scrollY={scrollY} delay={480}>
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.glassActionButton}>
                <Ionicons name="flask-outline" size={18} color="#FF6B4A" />
                <Text style={styles.actionButtonText}>Flavor AI</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.glassUploadButton, { backgroundColor: colorScheme === 'dark' ? 'rgba(40,40,40,0.8)' : 'rgba(255,255,255,0.8)', borderColor: colorScheme === 'dark' ? '#444' : '#FFF' }]} onPress={handleUpload} disabled={uploading}>
                <Ionicons name={uploading ? "cloud-upload-outline" : "camera-outline"} size={18} color={uploading ? "#FF6B4A" : (colorScheme === 'dark' ? '#AAA' : '#555')} />
                <Text style={[styles.uploadButtonText, { color: colorScheme === 'dark' ? '#AAA' : '#555' }, uploading && { color: '#FF6B4A' }]}>
                  {uploading ? 'Processing...' : 'Add Photo'}</Text>
              </TouchableOpacity>
            </View>
          </AnimatedSection>

          {/* Rating */}
          <AnimatedSection scrollY={scrollY} delay={560}>
            <Text style={styles.ratingLabel}>RATING</Text>
            {renderStars()}
            <View style={styles.ratingValueContainer}>
              <Text style={styles.ratingValue}>{rating > 0 ? `${rating}.0` : '-'}</Text>
            </View>
            <Text style={styles.ratingInstruction}>{rating > 0 ? 'Tap to change rating' : 'Tap a star to rate'}</Text>
          </AnimatedSection>

          {/* Bottom Buttons */}
          <AnimatedSection scrollY={scrollY} delay={640}>
            <View style={styles.bottomButtons}>
              <TouchableOpacity style={styles.discardButton}>
                <Text style={styles.discardButtonText}>DISCARD</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.archiveButton, archiving && { opacity: 0.6 }]}
                onPress={handleArchive}
                disabled={archiving}
              >
                <LinearGradient
                  colors={colorScheme === 'dark' ? ['#444', '#222'] : ['#FFF', '#F0F0F0']}
                  style={[styles.archiveGradient, { borderColor: colorScheme === 'dark' ? '#555' : '#FFF' }]}
                >
                  <Text style={[styles.archiveButtonText, { color: colorScheme === 'dark' ? '#FFF' : '#333' }]}>
                    {archiving ? 'SAVING...' : 'ARCHIVE LOG'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </AnimatedSection>

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
  draftButton: {},
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 20,
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
    shadowOffset: { width: 0, height: 2 }
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
    shadowOffset: { width: 0, height: 2 },
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
  imagePreviewContainer: {
    marginHorizontal: 24,
    marginTop: 16,
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#EAEAEA',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  uploadingText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  removeImageButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomPadding: {
    height: 100,
  },
});
