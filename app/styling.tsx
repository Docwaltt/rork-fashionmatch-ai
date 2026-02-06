import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Sparkles, ArrowLeft, RefreshCw, Share2 } from "lucide-react-native";
import { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Platform,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { trpc } from "@/lib/trpc";
import { LinearGradient } from "expo-linear-gradient";

import Colors from "@/constants/colors";
import { useWardrobe } from "@/contexts/WardrobeContext";
import { ClothingItem } from "@/types/wardrobe";

const { width } = Dimensions.get('window');

const EVENT_LABELS: Record<string, string> = {
  casual: "Casual Outing",
  business: "Business Meeting",
  party: "Party/Night Out",
  formal: "Formal Event",
  date: "Date Night",
  workout: "Workout",
};

interface OutfitSuggestion {
  title: string;
  description: string;
  items: string[];
  generatedImageUrl?: string;
}

export default function StylingScreen() {
  const { event, selectedItemId, selectedItemIds } = useLocalSearchParams<{ event: string; selectedItemId?: string; selectedItemIds?: string }>();
  const { items } = useWardrobe();
  const [suggestions, setSuggestions] = useState<OutfitSuggestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const selectedItem = selectedItemId ? items.find(item => item.id === selectedItemId) : undefined;
  const multipleSelectedItems = selectedItemIds ? selectedItemIds.split(',').map(id => items.find(i => i.id === id)).filter(Boolean) as ClothingItem[] : [];

  const generateOutfitMutation = trpc.wardrobe.generateOutfit.useMutation({
     onSuccess: (data: any) => {
        const newSuggestions = data as OutfitSuggestion[];
        if (newSuggestions && newSuggestions.length > 0) {
          setSuggestions(newSuggestions);
          setCurrentIndex(0); // Reset to first suggestion
        }
     },
     onError: (error: any) => {
         console.error("Failed to generate outfit via API:", error);
         // Optionally, show an error message to the user
     }
  });

  useEffect(() => {
    if (multipleSelectedItems.length > 0 && suggestions.length === 0 && !generateOutfitMutation.isPending && !generateOutfitMutation.data) {
        handleGenerateOutfit();
    }
  }, [multipleSelectedItems.length]);

  const handleGenerateOutfit = () => {
    let wardrobeToUse = items;
    if (multipleSelectedItems.length > 1) {
        wardrobeToUse = multipleSelectedItems;
    }

    const input = {
      wardrobe: wardrobeToUse.map(item => ({
        ...item,
        style: item.style || "casual",
        confidence: item.confidence || 0.9,
        isBackgroundRemoved: item.isBackgroundRemoved || false,
      })),
      numSuggestions: 2, // Request 2 suggestions
    };
    
    generateOutfitMutation.mutate(input);
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slide = Math.round(event.nativeEvent.contentOffset.x / width);
    if (slide !== currentIndex) {
      setCurrentIndex(slide);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[Colors.richBlack, "#121214"]} style={StyleSheet.absoluteFill} />
      
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><ArrowLeft size={24} color={Colors.white} /></TouchableOpacity>
          <Text style={styles.headerTitle}>STYLIST AI</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.contentScrollView}>
          <View style={styles.eventBanner}>
            <Text style={styles.eventLabel}>CURATING FOR</Text>
            <Text style={styles.eventTitle}>{event ? (EVENT_LABELS[event] || "EVENT").toUpperCase() : "EVENT"}</Text>
            <View style={styles.divider} />
          </View>

          {generateOutfitMutation.isPending && suggestions.length === 0 ? (
             <View style={styles.generateContainer}>
                <View style={styles.placeholderContainer}>
                  <ActivityIndicator size="large" color={Colors.gold[400]} />
                  <Text style={styles.placeholderTitle}>GENERATING LOOKS...</Text>
                  <Text style={styles.placeholderText}>Our AI is curating outfits for you. This may take a moment.</Text>
                </View>
            </View>
          ) : suggestions.length === 0 ? (
            <View style={styles.generateContainer}>
              <View style={styles.placeholderContainer}>
                <View style={styles.sparkleIcon}><Sparkles size={40} color={Colors.gold[400]} /></View>
                <Text style={styles.placeholderTitle}>AI STYLING</Text>
                <Text style={styles.placeholderText}>
                  {selectedItem ? `We'll find pieces to match your ${selectedItem.category}.` : multipleSelectedItems.length > 0 ? "Curating from your selections." : "Our AI will create the perfect look."}
                </Text>
              </View>
              <TouchableOpacity style={styles.generateButton} onPress={handleGenerateOutfit} disabled={generateOutfitMutation.isPending}>
                <LinearGradient colors={[Colors.gold[300], Colors.gold[500]]} style={styles.generateButtonGradient}>
                  <Text style={styles.generateButtonText}>{selectedItem ? "MATCH THIS PIECE" : "GENERATE OUTFIT"}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <ScrollView 
                ref={scrollViewRef}
                horizontal 
                pagingEnabled 
                showsHorizontalScrollIndicator={false} 
                onScroll={handleScroll}
                scrollEventThrottle={16}
                style={styles.suggestionSlider}
              >
                {suggestions.map((suggestion, index) => (
                  <View key={index} style={styles.suggestionCard}>
                    <View style={styles.outfitHeader}>
                      <Text style={styles.outfitTitle}>{suggestion.title.toUpperCase()}</Text>
                      <TouchableOpacity onPress={handleGenerateOutfit} disabled={generateOutfitMutation.isPending}><RefreshCw size={20} color={Colors.gold[400]} /></TouchableOpacity>
                    </View>
                    {suggestion.generatedImageUrl ? (
                        <Image source={{ uri: suggestion.generatedImageUrl }} style={styles.outfitImage} contentFit="cover" />
                    ) : (
                        <View style={[styles.outfitImage, styles.imagePlaceholder]}><Text style={styles.placeholderText}>Image generation failed.</Text></View>
                    )}
                    <View style={styles.reasoningContainer}>
                      <Text style={styles.reasoningTitle}>WHY THIS WORKS</Text>
                      <Text style={styles.reasoningText}>{suggestion.description}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
              <View style={styles.paginationContainer}>
                {suggestions.map((_, index) => (<View key={index} style={[styles.dot, currentIndex === index ? styles.dotActive : {}]} />))}
              </View>
               <TouchableOpacity style={styles.shareButton}>
                <Share2 size={16} color={Colors.white} />
                <Text style={styles.shareButtonText}>SHARE THIS LOOK</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.richBlack },
  safeArea: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingTop: 20, paddingBottom: 20 },
  backButton: { width: 40, height: 40, justifyContent: "center", alignItems: "flex-start" },
  headerTitle: { fontSize: 16, fontWeight: "600", color: Colors.white, letterSpacing: 2, textTransform: 'uppercase' },
  contentScrollView: { flex: 1 },
  eventBanner: { alignItems: "center", marginTop: 20, marginBottom: 40 },
  eventLabel: { fontSize: 10, color: Colors.gold[400], letterSpacing: 2, marginBottom: 8, fontWeight: "600" },
  eventTitle: { fontSize: 24, fontWeight: "300", color: Colors.white, letterSpacing: 1, fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-light' },
  divider: { width: 40, height: 1, backgroundColor: Colors.gold[400], marginTop: 20 },
  generateContainer: { flex: 1, paddingHorizontal: 32, justifyContent: 'center', alignItems: 'center', minHeight: 450 },
  placeholderContainer: { alignItems: 'center', marginBottom: 60 },
  sparkleIcon: { marginBottom: 24, shadowColor: Colors.gold[400], shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 10 },
  placeholderTitle: { fontSize: 18, color: Colors.white, marginBottom: 16, letterSpacing: 2, fontWeight: "300", textAlign: 'center' },
  placeholderText: { fontSize: 14, color: Colors.gray[500], textAlign: 'center', lineHeight: 24, maxWidth: 260 },
  generateButton: { borderRadius: 0, overflow: 'hidden', width: '100%' },
  generateButtonGradient: { paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  generateButtonText: { color: Colors.richBlack, fontSize: 14, fontWeight: '700', letterSpacing: 2 },
  suggestionSlider: { width: width },
  suggestionCard: { width: width, paddingHorizontal: 24, marginBottom: 24 },
  outfitHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  outfitTitle: { fontSize: 12, color: Colors.gray[500], letterSpacing: 2, fontWeight: "600" },
  outfitImage: { width: "100%", height: 400, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.gray[100] },
  imagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
  paginationContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.gray[600] },
  dotActive: { backgroundColor: Colors.gold[400] },
  shareButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 24, paddingVertical: 16, borderWidth: 1, borderColor: Colors.gray[200], borderRadius: 0 },
  shareButtonText: { color: Colors.white, fontSize: 12, fontWeight: '600', letterSpacing: 1.5 },
  reasoningContainer: { marginTop: 24, padding: 16, backgroundColor: 'rgba(212, 175, 55, 0.05)', borderLeftWidth: 2, borderLeftColor: Colors.gold[400] },
  reasoningTitle: { color: Colors.gold[400], fontSize: 10, fontWeight: '700', marginBottom: 8, letterSpacing: 1 },
  reasoningText: { color: Colors.gray[300], fontSize: 13, lineHeight: 20 },
});
