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

const generateReasoningString = (outfit: ClothingItem[], baseItem: ClothingItem | null | undefined, eventType: string): string => {
  if (outfit.length === 0) {
    return "No outfit could be generated.";
  }

  let reasoning = "";
  const top = outfit.find((i: ClothingItem) => ['top', 't-shirt', 'shirt', 'blouse'].includes(i.category));
  const bottom = outfit.find((i: ClothingItem) => ['bottom', 'pants', 'jeans', 'shorts', 'skirt', 'trousers'].includes(i.category));
  const dress = outfit.find((i: ClothingItem) => ['dress', 'gown', 'jumpsuit'].includes(i.category));
  const shoes = outfit.find((i: ClothingItem) => ['shoes', 'sneakers', 'heels', 'boots', 'sandals', 'flats'].includes(i.category));
  const outerwear = outfit.find((i: ClothingItem) => ['outerwear', 'jacket', 'coat', 'cardigan'].includes(i.category));
  const accessory = outfit.find((i: ClothingItem) => ['accessories', 'bag', 'jewelry'].includes(i.category));

  if (baseItem) {
    reasoning += `Building around your selected ${baseItem.category}, `;
  }

  if (dress) {
    reasoning += `the ${dress.color || ''} ${dress.category} is a perfect standalone piece for a ${eventType} event. `;
    if (shoes) {
      reasoning += `We've paired it with ${shoes.category} to complement the look. `;
    }
  } else if (top && bottom) {
    reasoning += `we've paired the ${top.color || ''} ${top.category} with ${bottom.color || ''} ${bottom.category}. `;
    const combinationReason = "This creates a classic, versatile palette. ";
    // More complex logic could be added here to evaluate color harmony
    reasoning += combinationReason;
    if (shoes) {
        reasoning += `The ${shoes.category} tie the outfit together. `
    }
  } else if (top) {
      reasoning += `we started with the ${top.color || ''} ${top.category} as a base. `
  } else if (bottom) {
      reasoning += `we started with the ${bottom.color || ''} ${bottom.category} as a base. `
  }


  if (outerwear) {
    reasoning += `The ${outerwear.category} adds a layer of sophistication and warmth. `;
  }
  if (accessory) {
    reasoning += `Finally, the ${accessory.category} provides a stylish finishing touch.`;
  }

  // Fallback if no specific reasoning could be generated
  if (reasoning.trim().length < 10) {
      return `This outfit is curated for a ${eventType} setting, balancing style and comfort with pieces from your wardrobe.`;
  }

  return reasoning.trim();
};

export default function StylingScreen() {
  const { event, selectedItemId } = useLocalSearchParams<{ event: string; selectedItemId?: string }>();
  const { items } = useWardrobe();
  const [suggestedOutfit, setSuggestedOutfit] = useState<ClothingItem[]>([]);
  const [reasoning, setReasoning] = useState<string | null>(null);
  
  const selectedItem = selectedItemId ? items.find((item: ClothingItem) => item.id === selectedItemId) : undefined;

  const generateOutfitMutation = trpc.wardrobe.generateOutfit.useMutation({
     onSuccess: (data: { reasoning: string }) => {
        // Backend provides a generic reasoning, but we generate a specific one on the client
        // after the outfit is assembled.
        generateSmartOutfit(data.reasoning); // Pass backend reasoning as a base
     },
     onError: (error: any) => {
         console.error("Failed to generate outfit via API:", error);
         // Fallback to client-side logic
         generateSmartOutfit();
     }
  });

  const generateSmartOutfit = (baseReasoning?: string) => {
      if (items.length === 0) return;

      const outfit: ClothingItem[] = [];
      
      if (selectedItem) {
        outfit.push(selectedItem);
        
        const otherItems = items.filter((item: ClothingItem) => item.id !== selectedItem.id);
        const selectedCategory = selectedItem.category;
        
        if ([...MALE_TOPS, ...FEMALE_TOPS].includes(selectedCategory as any)) {
          const bottoms = otherItems.filter((item: ClothingItem) => [...MALE_BOTTOMS, ...FEMALE_BOTTOMS].includes(item.category as any));
          if (bottoms.length > 0) {
            outfit.push(bottoms[Math.floor(Math.random() * bottoms.length)]);
          }
        } else if ([...MALE_BOTTOMS, ...FEMALE_BOTTOMS].includes(selectedCategory as any)) {
          const tops = otherItems.filter((item: ClothingItem) => [...MALE_TOPS, ...FEMALE_TOPS].includes(item.category as any));
          if (tops.length > 0) {
            outfit.push(tops[Math.floor(Math.random() * tops.length)]);
          }
        } else if ([...FEMALE_DRESSES].includes(selectedCategory as any)) {
          // Dress is a full outfit
        } else if ([...MALE_SHOES, ...FEMALE_SHOES].includes(selectedCategory as any)) {
          const tops = otherItems.filter((item: ClothingItem) => [...MALE_TOPS, ...FEMALE_TOPS].includes(item.category as any));
          const bottoms = otherItems.filter((item: ClothingItem) => [...MALE_BOTTOMS, ...FEMALE_BOTTOMS].includes(item.category as any));
          const dresses = otherItems.filter((item: ClothingItem) => [...FEMALE_DRESSES].includes(item.category as any));
          
          if (dresses.length > 0 && Math.random() > 0.5) {
            outfit.push(dresses[Math.floor(Math.random() * dresses.length)]);
          } else {
            if (tops.length > 0) outfit.push(tops[Math.floor(Math.random() * tops.length)]);
            if (bottoms.length > 0) outfit.push(bottoms[Math.floor(Math.random() * bottoms.length)]);
          }
        } else {
          const tops = otherItems.filter((item: ClothingItem) => [...MALE_TOPS, ...FEMALE_TOPS].includes(item.category as any));
          const bottoms = otherItems.filter((item: ClothingItem) => [...MALE_BOTTOMS, ...FEMALE_BOTTOMS].includes(item.category as any));
          if (tops.length > 0) outfit.push(tops[Math.floor(Math.random() * tops.length)]);
          if (bottoms.length > 0) outfit.push(bottoms[Math.floor(Math.random() * bottoms.length)]);
        }
        
        if (![...MALE_SHOES, ...FEMALE_SHOES].includes(selectedCategory as any)) {
          const shoes = otherItems.filter((item: ClothingItem) => [...MALE_SHOES, ...FEMALE_SHOES].includes(item.category as any));
          if (shoes.length > 0) {
            outfit.push(shoes[Math.floor(Math.random() * shoes.length)]);
          }
        }
        
        if (![...MALE_ACCESSORIES, ...FEMALE_ACCESSORIES].includes(selectedCategory as any)) {
          const accessories = otherItems.filter((item: ClothingItem) => [...MALE_ACCESSORIES, ...FEMALE_ACCESSORIES].includes(item.category as any));
          if (accessories.length > 0 && Math.random() > 0.5) {
            outfit.push(accessories[Math.floor(Math.random() * accessories.length)]);
          }
        }
        
      } else {
        const tops = items.filter((item: ClothingItem) => [...MALE_TOPS, ...FEMALE_TOPS].includes(item.category as any));
        const bottoms = items.filter((item: ClothingItem) => [...MALE_BOTTOMS, ...FEMALE_BOTTOMS].includes(item.category as any));
        const dresses = items.filter((item: ClothingItem) => [...FEMALE_DRESSES].includes(item.category as any));

        if (dresses.length > 0 && Math.random() > 0.5) {
          outfit.push(dresses[Math.floor(Math.random() * dresses.length)]);
        } else {
          if (tops.length > 0) outfit.push(tops[Math.floor(Math.random() * tops.length)]);
          if (bottoms.length > 0) outfit.push(bottoms[Math.floor(Math.random() * bottoms.length)]);
        }

        const shoes = items.filter((item: ClothingItem) => [...MALE_SHOES, ...FEMALE_SHOES].includes(item.category as any));
        if (shoes.length > 0) {
          outfit.push(shoes[Math.floor(Math.random() * shoes.length)]);
        }
      }
      
      const orderedOutfit = outfit.sort((a, b) => {
        const order = {
          'outerwear': 1, 'jacket': 1, 'coat': 1, 'cardigan': 1,
          'dress': 2, 'gown': 2, 'jumpsuit': 2, 'top': 2, 'shirt': 2, 't-shirt': 2, 'blouse': 2,
          'bottom': 3, 'pants': 3, 'jeans': 3, 'shorts': 3, 'skirt': 3, 'trousers': 3,
          'shoes': 4, 'sneakers': 4, 'heels': 4, 'boots': 4, 'sandals': 4, 'flats': 4,
          'accessories': 5, 'bag': 5, 'jewelry': 5, 'tie': 5
        };
        
        const orderA = order[a.category as keyof typeof order] || 99;
        const orderB = order[b.category as keyof typeof order] || 99;
        
        return orderA - orderB;
      });

      setSuggestedOutfit(orderedOutfit);
      
      const specificReasoning = generateReasoningString(orderedOutfit, selectedItem, event || 'casual');
      setReasoning(specificReasoning);
  }

  const handleGenerateOutfit = () => {
    generateOutfitMutation.mutate({
        selectedItemId,
        event: event || 'casual',
        wardrobeItems: items.map((i: ClothingItem) => ({ id: i.id, category: i.category, color: i.color }))
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

              {reasoning && (
                <View style={styles.reasoningContainer}>
                    <Text style={styles.reasoningTitle}>WHY THIS WORKS</Text>
                    <Text style={styles.reasoningText}>{reasoning}</Text>
                </View>
              )}

              <View style={styles.outfitGrid}>
                {suggestedOutfit.map((item: ClothingItem, index: number) => (
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

// NOTE: These category arrays would ideally be shared from a central types file
const MALE_TOPS = ['t-shirt', 'shirt', 'sweater', 'top'];
const MALE_BOTTOMS = ['trousers', 'jeans', 'shorts', 'bottom'];
const MALE_SHOES = ['sneakers', 'boots', 'shoes'];
const MALE_ACCESSORIES = ['tie', 'bag', 'accessories'];

const FEMALE_TOPS = ['blouse', 'top', 'sweater', 'cardigan', 't-shirt'];
const FEMALE_BOTTOMS = ['skirt', 'pants', 'jeans', 'shorts', 'bottom'];
const FEMALE_DRESSES = ['dress', 'gown', 'jumpsuit'];
const FEMALE_SHOES = ['heels', 'flats', 'sandals', 'boots', 'sneakers', 'shoes'];
const FEMALE_ACCESSORIES = ['bag', 'jewelry', 'accessories'];

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
