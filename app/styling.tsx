import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Sparkles, ArrowLeft, RefreshCw, Share2 } from "lucide-react-native";
import { useState } from "react";
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
import { useMutation } from "@tanstack/react-query";
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

export default function StylingScreen() {
  const { event, selectedItemId } = useLocalSearchParams<{ event: string; selectedItemId?: string }>();
  const { items } = useWardrobe();
  const [suggestedOutfit, setSuggestedOutfit] = useState<ClothingItem[]>([]);
  
  const selectedItem = selectedItemId ? items.find(item => item.id === selectedItemId) : null;

  const generateOutfitMutation = useMutation({
    mutationFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (items.length === 0) {
        throw new Error("No items in wardrobe");
      }

      const outfit: ClothingItem[] = [];
      
      // If a specific item is selected, start with it and build around it
      if (selectedItem) {
        outfit.push(selectedItem);
        
        const otherItems = items.filter(item => item.id !== selectedItem.id);
        const selectedCategory = selectedItem.category;
        
        // Build complementary outfit based on selected item category
        if (selectedCategory === "top" || selectedCategory === "shirt" || selectedCategory === "t-shirt" || selectedCategory === "blouse") {
          // Selected a top, need bottom and shoes
          const bottoms = otherItems.filter(item => 
            item.category === "bottom" || item.category === "pants" || 
            item.category === "jeans" || item.category === "shorts" || 
            item.category === "skirt"
          );
          if (bottoms.length > 0) {
            outfit.push(bottoms[Math.floor(Math.random() * bottoms.length)]);
          }
        } else if (selectedCategory === "bottom" || selectedCategory === "pants" || selectedCategory === "jeans" || selectedCategory === "shorts" || selectedCategory === "skirt") {
          // Selected a bottom, need top
          const tops = otherItems.filter(item => 
            item.category === "top" || item.category === "shirt" || 
            item.category === "t-shirt" || item.category === "blouse"
          );
          if (tops.length > 0) {
            outfit.push(tops[Math.floor(Math.random() * tops.length)]);
          }
        } else if (selectedCategory === "dress" || selectedCategory === "gown") {
          // Dress is complete, just add accessories
        } else if (selectedCategory === "shoes" || selectedCategory === "heels" || selectedCategory === "sneakers") {
          // Selected shoes, build full outfit
          const tops = otherItems.filter(item => 
            item.category === "top" || item.category === "shirt" || 
            item.category === "t-shirt" || item.category === "blouse"
          );
          const bottoms = otherItems.filter(item => 
            item.category === "bottom" || item.category === "pants" || 
            item.category === "jeans" || item.category === "shorts" || 
            item.category === "skirt"
          );
          const dresses = otherItems.filter(item => item.category === "dress" || item.category === "gown");
          
          if (dresses.length > 0 && Math.random() > 0.5) {
            outfit.push(dresses[Math.floor(Math.random() * dresses.length)]);
          } else {
            if (tops.length > 0) {
              outfit.push(tops[Math.floor(Math.random() * tops.length)]);
            }
            if (bottoms.length > 0) {
              outfit.push(bottoms[Math.floor(Math.random() * bottoms.length)]);
            }
          }
        } else if (selectedCategory === "outerwear" || selectedCategory === "jacket" || selectedCategory === "coat") {
          // Selected outerwear, need full outfit underneath
          const tops = otherItems.filter(item => 
            item.category === "top" || item.category === "shirt" || 
            item.category === "t-shirt" || item.category === "blouse"
          );
          const bottoms = otherItems.filter(item => 
            item.category === "bottom" || item.category === "pants" || 
            item.category === "jeans" || item.category === "shorts"
          );
          if (tops.length > 0) {
            outfit.push(tops[Math.floor(Math.random() * tops.length)]);
          }
          if (bottoms.length > 0) {
            outfit.push(bottoms[Math.floor(Math.random() * bottoms.length)]);
          }
        } else {
          // For accessories or other categories, build a complete outfit
          const tops = otherItems.filter(item => 
            item.category === "top" || item.category === "shirt" || 
            item.category === "t-shirt" || item.category === "blouse"
          );
          const bottoms = otherItems.filter(item => 
            item.category === "bottom" || item.category === "pants" || 
            item.category === "jeans" || item.category === "shorts" || 
            item.category === "skirt"
          );
          if (tops.length > 0) {
            outfit.push(tops[Math.floor(Math.random() * tops.length)]);
          }
          if (bottoms.length > 0) {
            outfit.push(bottoms[Math.floor(Math.random() * bottoms.length)]);
          }
        }
        
        // Add shoes if not already selected and available
        if (selectedCategory !== "shoes" && selectedCategory !== "heels" && selectedCategory !== "sneakers") {
          const shoes = otherItems.filter(item => 
            item.category === "shoes" || item.category === "heels" || item.category === "sneakers"
          );
          if (shoes.length > 0) {
            outfit.push(shoes[Math.floor(Math.random() * shoes.length)]);
          }
        }
        
        // Optionally add accessories if not already selected
        if (selectedCategory !== "accessories" && selectedCategory !== "bag" && selectedCategory !== "jewelry") {
          const accessories = otherItems.filter(item => 
            item.category === "accessories" || item.category === "bag" || item.category === "jewelry"
          );
          if (accessories.length > 0 && Math.random() > 0.5) {
            outfit.push(accessories[Math.floor(Math.random() * accessories.length)]);
          }
        }
        
        // Optionally add outerwear if not already selected
        if (selectedCategory !== "outerwear" && selectedCategory !== "jacket" && selectedCategory !== "coat") {
          const outerwear = otherItems.filter(item => 
            item.category === "outerwear" || item.category === "jacket" || item.category === "coat"
          );
          if (outerwear.length > 0 && Math.random() > 0.7) {
            outfit.push(outerwear[Math.floor(Math.random() * outerwear.length)]);
          }
        }
        
      } else {
        // Original logic when no specific item is selected
        const tops = items.filter((item) => item.category === "top");
        const bottoms = items.filter((item) => item.category === "bottom");
        const dresses = items.filter((item) => item.category === "dress");

        if (dresses.length > 0 && Math.random() > 0.5) {
          outfit.push(dresses[Math.floor(Math.random() * dresses.length)]);
        } else {
          if (tops.length > 0) {
            outfit.push(tops[Math.floor(Math.random() * tops.length)]);
          }
          if (bottoms.length > 0) {
            outfit.push(bottoms[Math.floor(Math.random() * bottoms.length)]);
          }
        }

        const outerwear = items.filter((item) => item.category === "outerwear");
        if (outerwear.length > 0 && Math.random() > 0.6) {
          outfit.push(outerwear[Math.floor(Math.random() * outerwear.length)]);
        }

        const shoes = items.filter((item) => item.category === "shoes");
        if (shoes.length > 0) {
          outfit.push(shoes[Math.floor(Math.random() * shoes.length)]);
        }

        const accessories = items.filter((item) => item.category === "accessories");
        if (accessories.length > 0 && Math.random() > 0.5) {
          outfit.push(accessories[Math.floor(Math.random() * accessories.length)]);
        }
      }

      return outfit;
    },
    onSuccess: (outfit) => {
      setSuggestedOutfit(outfit);
    },
  });

  const handleGenerateOutfit = () => {
    generateOutfitMutation.mutate();
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
                  {selectedItem ? "STYLED AROUND YOUR PICK" : "SUGGESTED LOOK"}
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
});
