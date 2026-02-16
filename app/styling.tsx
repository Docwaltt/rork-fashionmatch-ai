
import { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

// Firebase Direct Imports
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';

import { useWardrobe } from "@/contexts/WardrobeContext";
import Colors from "@/constants/colors";
import { ArrowLeft, Sparkles, WandSparkles } from "lucide-react-native";
import { ClothingItem } from "@/types/wardrobe";

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;
const CARD_SPACING = (width - CARD_WIDTH) / 2;

interface OutfitSuggestion {
  title: string;
  description: string;
  reason?: string;
  items: string[];
  generatedImageUrl?: string;
}

export default function StylingScreen() {
  const router = useRouter();
  const { items } = useWardrobe();
  const { event, selectedItemId, selectedItemIds: selectedItemIdsJSON } = useLocalSearchParams<{
    event: string;
    selectedItemId?: string;
    selectedItemIds?: string;
  }>();

  const [suggestions, setSuggestions] = useState<OutfitSuggestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const stylingWardrobe = useMemo(() => {
    if (!items) return [];
    let itemsToStyle: ClothingItem[] = [];

    if (selectedItemIdsJSON) {
      try {
        const ids = JSON.parse(selectedItemIdsJSON);
        itemsToStyle = items.filter((item: ClothingItem) => ids.includes(item.id));
      } catch (e) {
        console.error("Failed to parse selectedItemIds:", e);
        return [];
      }
    } else if (selectedItemId) {
      const selectedItem = items.find((item: ClothingItem) => item.id === selectedItemId);
      itemsToStyle = selectedItem ? [selectedItem, ...items.filter((item: ClothingItem) => item.id !== selectedItemId)] : [];
    } else {
        itemsToStyle = items;
    }
    return itemsToStyle;
  }, [items, selectedItemId, selectedItemIdsJSON]);

  const handleGenerate = async () => {
    if (stylingWardrobe.length < 2) {
      Alert.alert("Not Enough Clothing", "Select at least two items.");
      return;
    }

    setIsGenerating(true);
    try {
      const functions = getFunctions(app, 'us-central1');
      const generateOutfits = httpsCallable(functions, 'generateOutfitsCallable');
      
      const result: any = await generateOutfits({
        wardrobe: stylingWardrobe, 
        numSuggestions: 3, // Increased to 3 for better carousel experience
        event: event || 'casual',
      });

      const data = result.data?.result || result.data;
      setSuggestions(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error("[Styling] Generation Failed:", error.message);
      Alert.alert("Generation Failed", "Could not generate outfit suggestions.");
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (stylingWardrobe && stylingWardrobe.length >= 2 && suggestions.length === 0) {
      handleGenerate();
    }
  }, [stylingWardrobe]);

  const renderSuggestionCard = (suggestion: OutfitSuggestion, index: number) => {
    if (!items) return null;

    const outfitItems = (suggestion.items || [])
      .map(itemId => items.find((item: ClothingItem) => item.id === itemId))
      .filter((item): item is ClothingItem => !!item);

    return (
      <View key={index} style={styles.cardContainer}>
        <View style={styles.suggestionCard}>
            <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
            <Text style={styles.suggestionDescription}>{suggestion.description}</Text>
            
            {suggestion.reason && (
                <Text style={styles.suggestionReason}>{suggestion.reason}</Text>
            )}

            <View style={styles.imageWrapper}>
                {suggestion.generatedImageUrl ? (
                <Image
                    source={{ uri: suggestion.generatedImageUrl }}
                    style={styles.outfitImage}
                    contentFit="contain"
                    transition={500}
                />
                ) : (
                <View style={styles.itemImageGrid}>
                    {outfitItems.map(item => (
                    <Image
                        key={item.id}
                        source={{ uri: item.imageUri }}
                        style={styles.itemImage}
                        contentFit="contain"
                    />
                    ))}
                </View>
                )}
            </View>
        </View>
      </View>
    );
  };

  const isLoading = isGenerating;
  const hasSuggestions = suggestions.length > 0;
  const isWardrobeLoading = !items || (items.length === 0 && !hasSuggestions);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.richBlack, "#121214"]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={20} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>STYLE ME</Text>
          <TouchableOpacity onPress={handleGenerate} disabled={isLoading}>
             <Sparkles size={20} color={isLoading ? Colors.gray[600] : Colors.gold[400]} />
          </TouchableOpacity>
        </View>

        {(isLoading || isWardrobeLoading) ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.gold[400]} />
            <Text style={styles.loadingText}>Curating your outfits...</Text>
            <Text style={styles.loadingSubtext}>Merging pieces with AI precision.</Text>
          </View>
        ) : !hasSuggestions ? (
          <View style={styles.centered}>
            <WandSparkles size={48} color={Colors.gray[600]} strokeWidth={1} />
            <Text style={styles.emptyText}>No Suggestions</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleGenerate}>
              <Text style={styles.retryButtonText}>✨ TRY AGAIN</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.carouselWrapper}>
             <View style={styles.subHeader}>
                <Sparkles size={16} color={Colors.gold[400]} />
                <Text style={styles.subHeaderText}>SWIPE TO EXPLORE</Text>
             </View>
             
             <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                pagingEnabled
                snapToInterval={CARD_WIDTH + 16}
                decelerationRate="fast"
                contentContainerStyle={styles.carouselContent}
             >
                {suggestions.map(renderSuggestionCard)}
             </ScrollView>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  backButton: { padding: 8 },
  headerTitle: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  carouselWrapper: {
    flex: 1,
    paddingTop: 32,
  },
  carouselContent: {
    paddingHorizontal: CARD_SPACING,
  },
  cardContainer: {
    width: CARD_WIDTH,
    marginRight: 16,
    height: '90%',
  },
  suggestionCard: {
    backgroundColor: Colors.card,
    borderRadius: 0,
    padding: 24,
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.gray[100],
  },
  suggestionTitle: {
    color: Colors.white,
    fontSize: 22,
    fontWeight: "300",
    marginBottom: 8,
    letterSpacing: 1,
  },
  suggestionDescription: {
    color: Colors.gold[400],
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  suggestionReason: {
    color: Colors.gray[400],
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 24,
    letterSpacing: 0.3,
  },
  imageWrapper: {
    flex: 1,
    backgroundColor: Colors.gray[50],
    borderWidth: 1,
    borderColor: Colors.gray[100],
    overflow: 'hidden',
  },
  outfitImage: {
    width: "100%",
    height: "100%",
  },
  itemImageGrid: { 
    flexDirection: "row", 
    flexWrap: "wrap", 
    gap: 12,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  itemImage: { width: width * 0.3, height: width * 0.3 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 20,
    color: Colors.white,
    fontSize: 18,
    fontWeight: "300",
    letterSpacing: 1,
  },
  loadingSubtext: {
    marginTop: 8,
    color: Colors.gray[500],
    fontSize: 14,
    letterSpacing: 0.5,
  },
  subHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  subHeaderText: { color: Colors.gray[500], fontSize: 10, fontWeight: "700", letterSpacing: 2 },
  emptyText: { color: Colors.white, fontSize: 18, fontWeight: "300", marginTop: 24 },
  retryButton: { marginTop: 32, backgroundColor: Colors.gold[400], paddingVertical: 14, paddingHorizontal: 32 },
  retryButtonText: { color: Colors.richBlack, fontSize: 12, fontWeight: "700", letterSpacing: 1.5 },
});
