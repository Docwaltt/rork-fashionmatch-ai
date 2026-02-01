import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Sparkles, ArrowLeft, RefreshCw, Share2 } from "lucide-react-native";
import { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Platform
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { trpc } from "@/lib/trpc";
import { LinearGradient } from "expo-linear-gradient";

import Colors from "@/constants/colors";
import { useWardrobe } from "@/contexts/WardrobeContext";
import { ClothingItem } from "@/types/wardrobe";

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
}

export default function StylingScreen() {
  const { event, selectedItemId, selectedItemIds } = useLocalSearchParams<{ event: string; selectedItemId?: string; selectedItemIds?: string }>();
  const { items } = useWardrobe();
  const [suggestedOutfit, setSuggestedOutfit] = useState<ClothingItem[]>([]);
  const [reasoning, setReasoning] = useState<string | null>(null);
  
  const selectedItem = selectedItemId ? items.find(item => item.id === selectedItemId) : undefined;
  const multipleSelectedItems = selectedItemIds ? selectedItemIds.split(',').map(id => items.find(i => i.id === id)).filter(Boolean) as ClothingItem[] : [];

  const generateOutfitMutation = trpc.wardrobe.generateOutfit.useMutation({
     onSuccess: (data: any) => {
        // Explicitly cast data to the expected type
        const suggestions = data as OutfitSuggestion[];
        if (suggestions && suggestions.length > 0) {
          const firstOutfit = suggestions[0];
          setReasoning(firstOutfit.description);
          const outfitItems = firstOutfit.items.map((itemId: string) => items.find(item => item.id === itemId)).filter(Boolean) as ClothingItem[];
          setSuggestedOutfit(outfitItems);
        }
     },
     onError: (error: any) => {
         console.error("Failed to generate outfit via API:", error);
     }
  });

  // Automatically trigger generation if multiple items are selected via the selection screen
  useEffect(() => {
    if (multipleSelectedItems.length > 0 && suggestedOutfit.length === 0 && !generateOutfitMutation.isPending && !generateOutfitMutation.data) {
        handleGenerateOutfit();
    }
  }, [multipleSelectedItems.length]);


  const handleGenerateOutfit = () => {
    let wardrobeToUse = items;
    
    if (multipleSelectedItems.length > 1) {
        wardrobeToUse = multipleSelectedItems;
    }

    generateOutfitMutation.mutate({
      wardrobe: wardrobeToUse.map(item => ({
        ...item,
        // Ensure all required fields for ClothingSchema are present
        style: item.style || "casual",
        confidence: item.confidence || 0.9,
        isBackgroundRemoved: item.isBackgroundRemoved || false,
      })),
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[Colors.richBlack, "#121214"]}
        style={StyleSheet.absoluteFill}
      />
      
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>STYLIST AI</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.eventBanner}>
            <Text style={styles.eventLabel}>CURATING FOR</Text>
            <Text style={styles.eventTitle}>
              {event ? (EVENT_LABELS[event] || "").toUpperCase() : "EVENT"}
            </Text>
            <View style={styles.divider} />
          </View>

          {suggestedOutfit.length === 0 ? (
            <View style={styles.generateContainer}>
              <View style={styles.placeholderContainer}>
                <View style={styles.sparkleIcon}>
                  <Sparkles size={40} color={Colors.gold[400]} />
                </View>
                <Text style={styles.placeholderTitle}>AI STYLING</Text>
                <Text style={styles.placeholderText}>
                  {selectedItem 
                    ? `We'll find the perfect pieces to match your ${selectedItem.category}.`
                    : multipleSelectedItems.length > 0
                        ? "Curating a look from your selected pieces."
                        : "Our AI will analyze your wardrobe to create the perfect look for your event."
                  }
                </Text>
              </View>

              <TouchableOpacity
                style={styles.generateButton}
                onPress={handleGenerateOutfit}
                disabled={generateOutfitMutation.isPending}
              >
                <LinearGradient
                  colors={[Colors.gold[300], Colors.gold[500]]}
                  style={styles.generateButtonGradient}
                >
                  {generateOutfitMutation.isPending ? (
                    <ActivityIndicator color={Colors.richBlack} />
                  ) : (
                    <Text style={styles.generateButtonText}>
                      {selectedItem ? "MATCH THIS PIECE" : "GENERATE OUTFIT"}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.outfitContainer}>
              <View style={styles.outfitHeader}>
                <Text style={styles.outfitTitle}>
                  {selectedItem || multipleSelectedItems.length > 0 ? "STYLED AROUND YOUR PICKS" : "SUGGESTED LOOK"}
                </Text>
                <View style={styles.outfitActions}>
                  <TouchableOpacity 
                    onPress={handleGenerateOutfit}
                    disabled={generateOutfitMutation.isPending}
                  >
                    <RefreshCw size={20} color={Colors.gold[400]} />
                  </TouchableOpacity>
                </View>
              </View>

              {reasoning && (
                <View style={styles.reasoningContainer}>
                    <Text style={styles.reasoningTitle}>WHY THIS WORKS</Text>
                    <Text style={styles.reasoningText}>{reasoning}</Text>
                </View>
              )}

              <View style={styles.outfitGrid}>
                {suggestedOutfit.map((item, index) => (
                  <View key={`${item.id}-${index}`} style={styles.outfitItem}>
                    <Image
                      source={{ uri: item.imageUri }}
                      style={styles.outfitImage}
                      contentFit="contain"
                    />
                    <View style={styles.outfitItemLabel}>
                       <Text style={styles.outfitItemText}>{item.category}</Text>
                    </View>
                  </View>
                ))}
              </View>
              
              <TouchableOpacity style={styles.shareButton}>
                <Share2 size={16} color={Colors.white} />
                <Text style={styles.shareButtonText}>SHARE LOOK</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.richBlack,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.white,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  eventBanner: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 40,
  },
  eventLabel: {
    fontSize: 10,
    color: Colors.gold[400],
    letterSpacing: 2,
    marginBottom: 8,
    fontWeight: "600",
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: "300",
    color: Colors.white,
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-light',
  },
  divider: {
    width: 40,
    height: 1,
    backgroundColor: Colors.gold[400],
    marginTop: 20,
  },
  generateContainer: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'space-between',
    minHeight: 400,
  },
  placeholderContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  sparkleIcon: {
    marginBottom: 24,
    shadowColor: Colors.gold[400],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  placeholderTitle: {
    fontSize: 18,
    color: Colors.white,
    marginBottom: 16,
    letterSpacing: 2,
    fontWeight: "300",
  },
  placeholderText: {
    fontSize: 14,
    color: Colors.gray[500],
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 260,
  },
  generateButton: {
    marginTop: 60,
    borderRadius: 0,
    overflow: 'hidden',
  },
  generateButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateButtonText: {
    color: Colors.richBlack,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
  },
  outfitContainer: {
    paddingHorizontal: 24,
  },
  outfitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  outfitTitle: {
    fontSize: 12,
    color: Colors.gray[500],
    letterSpacing: 2,
    fontWeight: "600",
  },
  outfitActions: {
    flexDirection: 'row',
    gap: 16,
  },
  outfitGrid: {
    gap: 24,
  },
  outfitItem: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.gray[100],
  },
  outfitImage: {
    width: "100%",
    height: 300,
    backgroundColor: Colors.gray[50],
  },
  outfitItemLabel: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  outfitItemText: {
    color: Colors.white,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 40,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  shareButtonText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  reasoningContainer: {
      marginBottom: 24,
      padding: 16,
      backgroundColor: 'rgba(212, 175, 55, 0.1)',
      borderLeftWidth: 2,
      borderLeftColor: Colors.gold[400],
  },
  reasoningTitle: {
      color: Colors.gold[400],
      fontSize: 10,
      fontWeight: '700',
      marginBottom: 8,
      letterSpacing: 1,
  },
  reasoningText: {
      color: Colors.gray[300],
      fontSize: 13,
      lineHeight: 20,
  },
});
