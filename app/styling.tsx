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
  Platform,
  Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
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
  const { event } = useLocalSearchParams<{ event: string }>();
  const { items } = useWardrobe();
  const { userProfile } = useAuth();
  const [suggestedOutfit, setSuggestedOutfit] = useState<ClothingItem[]>([]);
  const [reasoning, setReasoning] = useState<string | null>(null);

  const generateOutfitMutation = trpc.wardrobe.suggestOutfit.useMutation({
    onSuccess: (data) => {
      setSuggestedOutfit(data.suggestion);
      setReasoning(data.reasoning);
    },
    onError: (error) => {
      console.error("[Styling] Error generating outfit:", error);
      Alert.alert("Styling Error", error.message || "Failed to generate outfit suggestion.");
    }
  });

  const handleGenerateOutfit = () => {
    if (items.length === 0) {
      Alert.alert("Empty Wardrobe", "Please add some items to your wardrobe first.");
      return;
    }

    generateOutfitMutation.mutate({
      items: items,
      event: event || 'casual',
      gender: userProfile?.gender
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[Colors.richBlack, "#121214"]} style={StyleSheet.absoluteFill} />
      
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
                  Our AI will analyze your wardrobe to create the perfect look for your event.
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
                    <Text style={styles.generateButtonText}>GENERATE OUTFIT</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.outfitContainer}>
              <View style={styles.outfitHeader}>
                <Text style={styles.outfitTitle}>SUGGESTED LOOK</Text>
                <View style={styles.outfitActions}>
                  <TouchableOpacity onPress={handleGenerateOutfit} disabled={generateOutfitMutation.isPending}>
                    <RefreshCw size={20} color={Colors.gold[400]} />
                  </TouchableOpacity>
                </View>
              </View>

              {reasoning && (
                <Text style={styles.reasoningText}>{reasoning}</Text>
              )}

              <View style={styles.outfitGrid}>
                {suggestedOutfit.map((item, index) => (
                  <View key={`${item.id}-${index}`} style={styles.outfitItem}>
                    <Image source={{ uri: item.imageUri }} style={styles.outfitImage} contentFit="contain" />
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
  container: { flex: 1, backgroundColor: Colors.richBlack },
  safeArea: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingTop: 20, paddingBottom: 20 },
  backButton: { width: 40, height: 40, justifyContent: "center", alignItems: "flex-start" },
  headerTitle: { fontSize: 16, fontWeight: "600", color: Colors.white, letterSpacing: 2, textTransform: 'uppercase' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  eventBanner: { alignItems: "center", marginTop: 20, marginBottom: 40 },
  eventLabel: { fontSize: 10, color: Colors.gold[400], letterSpacing: 2, marginBottom: 8, fontWeight: "600" },
  eventTitle: { fontSize: 24, fontWeight: "300", color: Colors.white, letterSpacing: 1 },
  divider: { width: 40, height: 1, backgroundColor: Colors.gold[400], marginTop: 20 },
  generateContainer: { flex: 1, paddingHorizontal: 32, justifyContent: 'space-between', minHeight: 400 },
  placeholderContainer: { alignItems: 'center', marginTop: 40 },
  sparkleIcon: { marginBottom: 24 },
  placeholderTitle: { fontSize: 18, color: Colors.white, marginBottom: 16, letterSpacing: 2, fontWeight: "300" },
  placeholderText: { fontSize: 14, color: Colors.gray[500], textAlign: 'center', lineHeight: 24, maxWidth: 260 },
  generateButton: { marginTop: 60, borderRadius: 0, overflow: 'hidden' },
  generateButtonGradient: { paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  generateButtonText: { color: Colors.richBlack, fontSize: 14, fontWeight: '700', letterSpacing: 2 },
  outfitContainer: { paddingHorizontal: 24 },
  outfitHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  outfitTitle: { fontSize: 12, color: Colors.gray[500], letterSpacing: 2, fontWeight: "600" },
  reasoningText: { fontSize: 14, color: Colors.white, fontStyle: 'italic', marginBottom: 20, lineHeight: 20, opacity: 0.8 },
  outfitActions: { flexDirection: 'row', gap: 16 },
  outfitGrid: { gap: 24 },
  outfitItem: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.gray[100] },
  outfitImage: { width: "100%", height: 300, backgroundColor: Colors.gray[50] },
  outfitItemLabel: { position: 'absolute', bottom: 12, left: 12, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 8, paddingVertical: 4 },
  outfitItemText: { color: Colors.white, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', fontWeight: '600' },
  shareButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 40, paddingVertical: 16, borderWidth: 1, borderColor: Colors.gray[200] },
  shareButtonText: { color: Colors.white, fontSize: 12, fontWeight: '600', letterSpacing: 1.5 },
});
