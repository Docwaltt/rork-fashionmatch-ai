
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
import { trpc } from "@/lib/trpc";
import { useWardrobe } from "@/contexts/WardrobeContext";
import Colors from "@/constants/colors";
import { ArrowLeft, Sparkles, WandSparkles } from "lucide-react-native";
import { ClothingItem } from "@/types/wardrobe";

interface OutfitSuggestion {
  title: string;
  description: string;
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

  const stylingWardrobe = useMemo(() => {
    // Guard clause: Wait until the wardrobe is loaded to prevent crashes.
    if (!items) {
      return [];
    }

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

  const suggestOutfitMutation = trpc.wardrobe.suggestOutfit.useMutation({
    onSuccess: (data) => {
      const newSuggestions = (data || []) as OutfitSuggestion[];
      setSuggestions(newSuggestions);
    },
    onError: (error) => {
      console.error("Suggest outfit mutation error:", error);
      Alert.alert(
        "Generation Failed",
        "Could not generate outfit suggestions. Please try again later."
      );
    },
  });

  const handleGenerate = () => {
    if (stylingWardrobe.length < 2) {
      Alert.alert(
        "Not Enough Clothing",
        "You need at least two items to generate an outfit. Please select more items from your wardrobe."
      );
      return;
    }

    suggestOutfitMutation.mutate({
      wardrobe: stylingWardrobe,
      numSuggestions: 2,
      event: event || 'casual',
    });
  };

  useEffect(() => {
    // Trigger generation only when the wardrobe is ready and filtered.
    if (stylingWardrobe && stylingWardrobe.length > 0) {
      handleGenerate();
    }
  }, [stylingWardrobe]);

  const renderSuggestionCard = (suggestion: OutfitSuggestion, index: number) => {
    // Guard against wardrobe being unavailable during render
    if (!items) return null;

    const outfitItems = (suggestion.items || [])
      .map(itemId => items.find((item: ClothingItem) => item.id === itemId))
      .filter((item): item is ClothingItem => !!item);

    return (
      <View key={index} style={styles.suggestionCard}>
        <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
        <Text style={styles.suggestionDescription}>{suggestion.description}</Text>

        {suggestion.generatedImageUrl ? (
          <Image
            source={{ uri: suggestion.generatedImageUrl }}
            style={styles.outfitImage}
            contentFit="cover"
          />
        ) : (
          <View style={styles.itemImageGrid}>
            {outfitItems.map(item => (
              <Image
                key={item.id}
                source={{ uri: item.imageUri }}
                style={styles.itemImage}
                contentFit="cover"
              />
            ))}
          </View>
        )}
      </View>
    );
  };

  const isLoading = suggestOutfitMutation.isPending;
  const hasSuggestions = suggestions.length > 0;

  // Special handling for the initial loading state before we even try to generate
  const isWardrobeLoading = !stylingWardrobe || (stylingWardrobe.length === 0 && !hasSuggestions);

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

        <ScrollView contentContainerStyle={styles.content}>
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
                {"We couldn't generate any outfits. This can happen if there aren't enough items, or the selected items don't make a good combo."}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[800],
  },
  backButton: { padding: 8 },
  headerTitle: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 1.5,
  },
  content: { padding: 16, paddingBottom: 50 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    minHeight: 500,
  },
  loadingText: {
    marginTop: 16,
    color: Colors.white,
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  loadingSubtext: {
    marginTop: 8,
    color: Colors.gray[400],
    fontSize: 14,
    textAlign: "center",
  },
  emptyText: {
    marginTop: 24,
    color: Colors.white,
    fontSize: 20,
    fontWeight: "bold",
  },
  emptySubtext: {
    marginTop: 12,
    color: Colors.gray[500],
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 32,
    backgroundColor: Colors.gold[400],
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  retryButtonText: {
    color: Colors.richBlack,
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  subHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  subHeaderText: { color: Colors.gold[300], fontSize: 16, fontWeight: "500" },
  suggestionCard: {
    backgroundColor: Colors.card,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.gray[100],
  },
  suggestionTitle: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  suggestionDescription: {
    color: Colors.gray[400],
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  itemImageGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  itemImage: { width: 80, height: 80 },
  outfitImage: { width: "100%", height: 300 },
});
