import AsyncStorage from "@react-native-async-storage/async-storage";
import { Trash2, AlertTriangle, User, Settings, ChevronRight } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, Modal, Pressable, Platform, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

import Colors from "@/constants/colors";
import { useWardrobe } from "@/contexts/WardrobeContext";

export default function ProfileScreen() {
  const { items } = useWardrobe();
  const [showClearModal, setShowClearModal] = useState<boolean>(false);

  const handleClearWardrobe = async () => {
    try {
      await AsyncStorage.clear();
      setShowClearModal(false);
      if (Alert.alert) {
        Alert.alert("Success", "Your wardrobe has been cleared");
      }
    } catch (error) {
      console.error("Error clearing wardrobe:", error);
      if (Alert.alert) {
        Alert.alert("Error", "Failed to clear wardrobe");
      }
    }
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
          <Text style={styles.headerSubtitle}>PERSONAL SPACE</Text>
          <Text style={styles.headerTitle}>PROFILE</Text>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.userCard}>
            <LinearGradient
              colors={[Colors.card, Colors.card]}
              style={styles.userCardGradient}
            >
              <View style={styles.avatarContainer}>
                <User size={32} color={Colors.gold[400]} />
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>FASHIONISTA</Text>
                <Text style={styles.userHandle}>@style_icon</Text>
              </View>
              <TouchableOpacity style={styles.settingsButton}>
                <Settings size={20} color={Colors.gray[500]} />
              </TouchableOpacity>
            </LinearGradient>
          </View>

          <View style={styles.statsContainer}>
            <Text style={styles.sectionTitle}>ANALYTICS</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{items.length}</Text>
                <Text style={styles.statLabel}>TOTAL ITEMS</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>
                  {items.filter((item) => item.category === "top").length}
                </Text>
                <Text style={styles.statLabel}>TOPS</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>
                  {items.filter((item) => item.category === "bottom").length}
                </Text>
                <Text style={styles.statLabel}>BOTTOMS</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>
                  {items.filter((item) => item.category === "dress").length}
                </Text>
                <Text style={styles.statLabel}>DRESSES</Text>
              </View>
            </View>
          </View>

          <View style={styles.menuContainer}>
            <Text style={styles.sectionTitle}>PREFERENCES</Text>
            
            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuText}>STYLE PREFERENCES</Text>
              <ChevronRight size={16} color={Colors.gray[600]} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuText}>NOTIFICATIONS</Text>
              <ChevronRight size={16} color={Colors.gray[600]} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuText}>ABOUT STYLE AI</Text>
              <ChevronRight size={16} color={Colors.gray[600]} />
            </TouchableOpacity>
          </View>

          <View style={styles.dangerZone}>
            <TouchableOpacity
              style={styles.dangerButton}
              onPress={() => setShowClearModal(true)}
            >
              <Trash2 size={16} color={Colors.error} />
              <Text style={styles.dangerButtonText}>RESET WARDROBE</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>STYLE AI v1.0.0</Text>
          </View>
        </ScrollView>

        <Modal
          visible={showClearModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowClearModal(false)}
        >
          <BlurView intensity={20} tint="dark" style={styles.modalOverlay}>
            <Pressable
              style={styles.modalBackdrop}
              onPress={() => setShowClearModal(false)}
            />
            <View style={styles.modalContent}>
              <View style={styles.modalIconContainer}>
                <AlertTriangle size={32} color={Colors.gold[400]} />
              </View>
              <Text style={styles.modalTitle}>RESET WARDROBE?</Text>
              <Text style={styles.modalText}>
                This will permanently delete all items from your digital wardrobe. This action cannot be undone.
              </Text>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowClearModal(false)}
                >
                  <Text style={styles.modalCancelButtonText}>CANCEL</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalConfirmButton}
                  onPress={handleClearWardrobe}
                >
                  <LinearGradient
                    colors={[Colors.gold[300], Colors.gold[500]]}
                    style={styles.confirmGradient}
                  >
                    <Text style={styles.modalConfirmButtonText}>CONFIRM</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </Modal>
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
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
  },
  headerSubtitle: {
    fontSize: 10,
    color: Colors.gold[400],
    letterSpacing: 2,
    marginBottom: 4,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "300",
    color: Colors.white,
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-light',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  userCard: {
    marginHorizontal: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: Colors.gray[100],
  },
  userCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.richBlack,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  userInfo: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.white,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  userHandle: {
    fontSize: 12,
    color: Colors.gray[500],
    letterSpacing: 0.5,
  },
  settingsButton: {
    padding: 8,
  },
  statsContainer: {
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.gray[500],
    letterSpacing: 2,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statBox: {
    width: "48%",
    backgroundColor: Colors.card,
    padding: 24,
    borderRadius: 0,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.gray[100],
  },
  statNumber: {
    fontSize: 32,
    fontWeight: "300",
    color: Colors.white,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.gray[500],
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: "600",
  },
  menuContainer: {
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  menuText: {
    fontSize: 12,
    color: Colors.white,
    letterSpacing: 1.5,
    fontWeight: '500',
  },
  dangerZone: {
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  dangerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: Colors.error,
    backgroundColor: 'rgba(207, 102, 121, 0.05)',
  },
  dangerButtonText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.5,
  },
  footer: {
    alignItems: "center",
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 10,
    color: Colors.gray[600],
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  modalContent: {
    width: "85%",
    backgroundColor: Colors.card,
    borderRadius: 0,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.gray[100],
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.richBlack,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.white,
    marginBottom: 12,
    letterSpacing: 2,
  },
  modalText: {
    fontSize: 14,
    color: Colors.gray[400],
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 0,
    backgroundColor: Colors.richBlack,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  modalCancelButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.white,
    letterSpacing: 1,
  },
  modalConfirmButton: {
    flex: 1,
    borderRadius: 0,
    overflow: 'hidden',
  },
  confirmGradient: {
    paddingVertical: 17, // -1 for border
    alignItems: 'center',
    width: '100%',
  },
  modalConfirmButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.richBlack,
    letterSpacing: 1,
  },
});
