
import { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Alert,
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
      Alert.alert(
        "Not Enough Clothing",
        "You need at least two items to generate an outfit."
      );
      return;
    }

    setIsGenerating(true);
    try {
      // DIRECT CALL to Firebase Callable Function
      const functions = getFunctions(app, 'us-central1');
      const generateOutfits = httpsCallable(functions, 'generateOutfitsCallable');
      
      // AI needs the metadata, but we strip the large base64 strings to keep the request fast
      const cleanWardrobe = stylingWardrobe.map(item => {
        const { imageUri, cleanedImage, ...rest } = item;
        return rest;
      });

      const result: any = await generateOutfits({
        wardrobe: stylingWardrobe, // Pass original if AI needs to generate images
        numSuggestions: 2,
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
      <View key={index} style={styles.suggestionCard}>
        <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
        <Text style={styles.suggestionDescription}>{suggestion.description}</Text>
        
        {suggestion.reason && (
            <Text style={styles.suggestionReason}>{suggestion.reason}</Text>
        )}

        {suggestion.generatedImageUrl ? (
          <Image
            source={{ uri: suggestion.generatedImageUrl }}
            style={styles.outfitImage}
            contentFit="contain"
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
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {(isLoading || isWardrobeLoading) && (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={Colors.gold[400]} />
              <Text style={styles.loadingText}>Generating your outfits...</Text>
              <Text style={styles.loadingSubtext}>This may take a moment.</Text>
            </View>
          )}

          {!isLoading && !isWardrobeLoading && !hasSuggestions && (
            <View style={styles.centered}>
              <WandSparkles size={48} color={Colors.gray[600]} strokeWidth={1} />
              <Text style={styles.emptyText}>No Suggestions Yet</Text>
              <Text style={styles.emptySubtext}>
                {"We couldn't generate any outfits. Try selecting different items."}
              </Text>
              <TouchableOpacity style={styles.retryButton} onPress={handleGenerate}>
                <Text style={styles.retryButtonText}>✨ TRY AGAIN</Text>
              </TouchableOpacity>
            </View>
          )}

          {!isLoading && !isWardrobeLoading && hasSuggestions && (
            <>
              <View style={styles.subHeader}>
                <Sparkles size={20} color={Colors.gold[400]} />
                <Text style={styles.subHeaderText}>Here are your AI-powered suggestions!</Text>
              </View>
              {suggestions.map(renderSuggestionCard)}
            </>
          )}
        </ScrollView>
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
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  content: { padding: 24, paddingBottom: 60 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    minHeight: 500,
  },
  loadingText: {
    marginTop: 20,
    color: Colors.white,
    fontSize: 18,
    fontWeight: "300",
    textAlign: "center",
    letterSpacing: 1,
  },
  loadingSubtext: {
    marginTop: 8,
    color: Colors.gray[500],
    fontSize: 14,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  emptyText: {
    marginTop: 24,
    color: Colors.white,
    fontSize: 20,
    fontWeight: "300",
    letterSpacing: 2,
  },
  emptySubtext: {
    marginTop: 12,
    color: Colors.gray[500],
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    letterSpacing: 0.5,
  },
  retryButton: {
    marginTop: 32,
    backgroundColor: Colors.gold[400],
    paddingVertical: 16,
    paddingHorizontal: 40,
  },
  retryButtonText: {
    color: Colors.richBlack,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  subHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 32,
  },
  subHeaderText: { color: Colors.gold[400], fontSize: 12, fontWeight: "600", letterSpacing: 1, textTransform: 'uppercase' },
  suggestionCard: {
    backgroundColor: Colors.card,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: Colors.gray[100],
  },
  suggestionTitle: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: "300",
    marginBottom: 12,
    letterSpacing: 1,
  },
  suggestionDescription: {
    color: Colors.gray[400],
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 22,
    letterSpacing: 0.5,
  },
  suggestionReason: {
    color: Colors.white,
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 24,
    lineHeight: 20,
    opacity: 0.8,
  },
  itemImageGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  itemImage: { width: 100, height: 100, backgroundColor: Colors.gray[50], borderWidth: 1, borderColor: Colors.gray[100] },
  outfitImage: { width: "100%", height: 350, backgroundColor: Colors.gray[50], borderWidth: 1, borderColor: Colors.gray[100] },
});
