import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Colors, Radii, Shadows } from '../theme/colors';
import Card from '../components/Card';
import Chip from '../components/Chip';
import RadiusSlider from '../components/RadiusSlider';
import Button from '../components/Button';
import { ApiService } from '../services/api';

const CATEGORIES = [
  { id: 'all', label: 'All ☕' },
  { id: 'matcha', label: 'Matcha 🍵' },
  { id: 'work', label: 'Quiet Work 💻' },
  { id: 'cat', label: 'Cat Cafes 🐱' },
  { id: 'aesthetic', label: 'Aesthetic 🌸' },
];

export default function HomeScreen({ navigation }) {
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'
  const [radiusKm, setRadiusKm] = useState(5);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkedInPlaceId, setCheckedInPlaceId] = useState(1);

  useEffect(() => {
    fetchPlaces();
  }, [radiusKm, selectedCategory]);

  const fetchPlaces = async () => {
    setLoading(true);
    // TODO: Calls GET /places/nearby?radius={radiusKm}
    const data = await ApiService.getNearbyPlaces(radiusKm);
    
    let filtered = data;
    if (selectedCategory !== 'all') {
      filtered = data.filter((p) => p.category === selectedCategory);
    }
    setPlaces(filtered);
    setLoading(false);
  };

  const handleCheckIn = (place) => {
    setCheckedInPlaceId(place.id);
    alert(`💖 Checked-in at ${place.name}! Friends nearby can now see your table spot.`);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header with Title & View Toggle */}
      <View style={styles.topRow}>
        <View>
          <Text style={styles.greetingTitle}>Discover Cafes ☕✨</Text>
          <Text style={styles.subtitle}>Curated spots ranked by AI vibe scores</Text>
        </View>

        {/* Map / Card List Toggle Pill */}
        <View style={styles.viewTogglePill}>
          <TouchableOpacity
            onPress={() => setViewMode('list')}
            style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
          >
            <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>
              List 📄
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setViewMode('map')}
            style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
          >
            <Text style={[styles.toggleText, viewMode === 'map' && styles.toggleTextActive]}>
              Map 🗺️
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Radius Setting Slider */}
      <RadiusSlider
        value={radiusKm}
        onValueChange={setRadiusKm}
        label="Cafe Distance Range"
      />

      {/* Filter Chips Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}
      >
        {CATEGORIES.map((cat) => (
          <Chip
            key={cat.id}
            label={cat.label}
            selected={selectedCategory === cat.id}
            onPress={() => setSelectedCategory(cat.id)}
          />
        ))}
      </ScrollView>

      {/* MAP VIEW SIMULATION */}
      {viewMode === 'map' ? (
        <Card style={styles.mapContainer}>
          <View style={styles.mapGraphic}>
            <Text style={{ fontSize: 32, textAlign: 'center' }}>🗺️🌸</Text>
            <Text style={styles.mapTitle}>Live Cafe Radar View</Text>
            <Text style={styles.mapSub}>Showing {places.length} verified spots in {radiusKm}km radius</Text>

            {/* Radar Pins */}
            <View style={styles.pinGrid}>
              {places.map((p) => (
                <View key={p.id} style={styles.radarPin}>
                  <Text style={{ fontSize: 16 }}>☕</Text>
                  <Text style={styles.pinLabel}>{p.name.split(' ')[0]}</Text>
                </View>
              ))}
            </View>
          </View>
        </Card>
      ) : (
        /* CARD LIST FEED */
        <View style={styles.feedContainer}>
          {loading ? (
            <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} />
          ) : places.length === 0 ? (
            <Card style={{ alignItems: 'center', padding: 30 }}>
              <Text style={{ fontSize: 30 }}>☕🌸</Text>
              <Text style={{ fontWeight: '800', marginTop: 8 }}>No spots found in {radiusKm}km</Text>
              <Text style={{ fontSize: 12, color: Colors.textMuted, marginTop: 4 }}>
                Try widening your distance slider!
              </Text>
            </Card>
          ) : (
            places.map((place) => {
              const isCheckedIn = checkedInPlaceId === place.id;
              return (
                <Card key={place.id} style={styles.placeCard}>
                  {/* Photo Header */}
                  <View style={styles.imageBox}>
                    <Image source={{ uri: place.image }} style={styles.placeImage} />
                    
                    {/* Star Rating Badge */}
                    <View style={styles.ratingBadge}>
                      <Text style={styles.ratingText}>⭐ {place.average_rating}</Text>
                    </View>

                    {/* AI Vibe Score Gradient Badge */}
                    <View style={styles.vibeBadge}>
                      <Text style={styles.vibeBadgeText}>💖 {place.vibe_score} VIBE</Text>
                    </View>
                  </View>

                  {/* Place Info */}
                  <Text style={styles.placeName}>{place.name}</Text>
                  
                  <View style={styles.metaRow}>
                    <Text style={styles.distanceText}>
                      📍 {place.distance_meters >= 1000 ? (place.distance_meters / 1000).toFixed(1) + 'km' : place.distance_meters + 'm'} away
                    </Text>
                    <Text style={styles.dotSeparator}>•</Text>
                    <Text style={styles.categoryText}>{place.categoryLabel}</Text>
                  </View>

                  {/* Vibe Tags */}
                  <View style={styles.tagCloud}>
                    {place.tags.map((tag) => (
                      <View key={tag} style={styles.tagPill}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Action & People Footer */}
                  <View style={styles.cardFooter}>
                    <Text style={styles.peopleCountText}>
                      👥 {place.peopleCount} verified people here
                    </Text>

                    <Button
                      title={isCheckedIn ? '✔ Checked-In' : '📍 Check-In'}
                      size="sm"
                      variant={isCheckedIn ? 'secondary' : 'primary'}
                      onPress={() => handleCheckIn(place)}
                    />
                  </View>
                </Card>
              );
            })
          )}
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.creamBg,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 95,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.textDark,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
    marginTop: 1,
  },
  viewTogglePill: {
    flexDirection: 'row',
    backgroundColor: Colors.softPinkBg,
    borderRadius: Radii.pill,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toggleBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: Radii.pill,
  },
  toggleBtnActive: {
    backgroundColor: Colors.white,
    ...Shadows.soft,
  },
  toggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  toggleTextActive: {
    color: Colors.primary,
  },
  categoryRow: {
    gap: 8,
    paddingBottom: 12,
  },
  feedContainer: {
    gap: 16,
    marginTop: 4,
  },
  placeCard: {
    padding: 14,
  },
  imageBox: {
    width: '100%',
    height: 140,
    borderRadius: Radii.md,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 10,
  },
  placeImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: Radii.pill,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textDark,
  },
  vibeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: Radii.pill,
    ...Shadows.soft,
  },
  vibeBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  placeName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textDark,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
    marginBottom: 8,
  },
  distanceText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  dotSeparator: {
    color: Colors.blushPink,
  },
  categoryText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '700',
  },
  tagCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  tagPill: {
    backgroundColor: Colors.softPinkBg,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: Radii.sm,
  },
  tagText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.softPinkBg,
    paddingTop: 10,
  },
  peopleCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  // Map View Styles
  mapContainer: {
    height: 340,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapGraphic: {
    alignItems: 'center',
    width: '100%',
  },
  mapTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.textDark,
    marginTop: 6,
  },
  mapSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  pinGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 20,
    justifyContent: 'center',
  },
  radarPin: {
    backgroundColor: Colors.softPinkBg,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  pinLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 2,
  },
});
