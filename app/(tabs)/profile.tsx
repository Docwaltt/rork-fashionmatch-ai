import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { Trash2, AlertTriangle, User, ChevronRight, LogOut, MapPin, Edit2 } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, Modal, Pressable, Platform, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

import Colors from "@/constants/colors";
import { useWardrobe } from "@/contexts/WardrobeContext";
import { useAuth } from "@/contexts/AuthContext";
import { getCategoriesForGender } from "@/types/user";

export default function ProfileScreen() {
  const { items, removeItem } = useWardrobe();
  const { userProfile, signOut, isSigningOut } = useAuth();
  const [showClearModal, setShowClearModal] = useState<boolean>(false);
  const [showSignOutModal, setShowSignOutModal] = useState<boolean>(false);

  const categories = userProfile?.gender ? getCategoriesForGender(userProfile.gender) : [];

  const handleClearWardrobe = async () => {
    try {
      for (const item of items) {
        removeItem(item.id);
      }
      await AsyncStorage.clear();
      setShowClearModal(false);
      Alert.alert("Success", "Your wardrobe has been cleared");
    } catch (error) {
      console.error("Error clearing wardrobe:", error);
      Alert.alert("Error", "Failed to clear wardrobe");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setShowSignOutModal(false);
    } catch (error) {
      console.error("Error signing out:", error);
      Alert.alert("Error", "Failed to sign out");
    }
  };

  const getCategoryCount = (categoryId: string) => {
    return items.filter((item) => item.category === categoryId).length;
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
              {userProfile?.profilePhotoUri ? (
                <Image
                  source={{ uri: userProfile.profilePhotoUri }}
                  style={styles.avatarImage}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.avatarContainer}>
                  <User size={32} color={Colors.gold[400]} />
                </View>
              )}
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{userProfile?.displayName || "FASHIONISTA"}</Text>
                <Text style={styles.userHandle}>
                  {userProfile?.gender === "male" ? "👔 Male" : "👗 Female"}
                </Text>
                {userProfile?.location && (
                  <View style={styles.locationRow}>
                    <MapPin size={12} color={Colors.gray[500]} />
                    <Text style={styles.locationText}>
                      {userProfile.location.city}, {userProfile.location.country}
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity style={styles.settingsButton}>
                <Edit2 size={18} color={Colors.gray[500]} />
              </TouchableOpacity>
            </LinearGradient>
          </View>

          <View style={styles.statsContainer}>
            <Text style={styles.sectionTitle}>WARDROBE ANALYTICS</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{items.length}</Text>
                <Text style={styles.statLabel}>TOTAL ITEMS</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{categories.length}</Text>
                <Text style={styles.statLabel}>CATEGORIES</Text>
              </View>
            </View>
          </View>

          {categories.length > 0 && (
            <View style={styles.categoriesContainer}>
              <Text style={styles.sectionTitle}>CATEGORIES BREAKDOWN</Text>
              <View style={styles.categoryList}>
                {categories.slice(0, 6).map((cat) => {
                  const count = getCategoryCount(cat.id);
                  return (
                    <View key={cat.id} style={styles.categoryItem}>
                      <View style={styles.categoryLeft}>
                        <Text style={styles.categoryIcon}>{cat.icon}</Text>
                        <Text style={styles.categoryLabel}>{cat.label.toUpperCase()}</Text>
                      </View>
                      <Text style={styles.categoryCount}>{count}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

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
              <Text style={styles.menuText}>ABOUT DRESSYA</Text>
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

            <TouchableOpacity
              style={styles.signOutButton}
              onPress={() => setShowSignOutModal(true)}
            >
              <LogOut size={16} color={Colors.gold[400]} />
              <Text style={styles.signOutButtonText}>SIGN OUT</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>DRESSYA v1.0.0</Text>
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

        <Modal
          visible={showSignOutModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSignOutModal(false)}
        >
          <BlurView intensity={20} tint="dark" style={styles.modalOverlay}>
            <Pressable
              style={styles.modalBackdrop}
              onPress={() => setShowSignOutModal(false)}
            />
            <View style={styles.modalContent}>
              <View style={styles.modalIconContainer}>
                <LogOut size={32} color={Colors.gold[400]} />
              </View>
              <Text style={styles.modalTitle}>SIGN OUT?</Text>
              <Text style={styles.modalText}>
                Are you sure you want to sign out of your Dressya account?
              </Text>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowSignOutModal(false)}
                >
                  <Text style={styles.modalCancelButtonText}>CANCEL</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalConfirmButton}
                  onPress={handleSignOut}
                  disabled={isSigningOut}
                >
                  <LinearGradient
                    colors={[Colors.gold[300], Colors.gold[500]]}
                    style={styles.confirmGradient}
                  >
                    <Text style={styles.modalConfirmButtonText}>
                      {isSigningOut ? "SIGNING OUT..." : "SIGN OUT"}
                    </Text>
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
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: Colors.gold[400],
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
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  locationText: {
    fontSize: 11,
    color: Colors.gray[500],
  },
  settingsButton: {
    padding: 8,
  },
  statsContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
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
    gap: 12,
  },
  statBox: {
    flex: 1,
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
  categoriesContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  categoryList: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.gray[100],
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryIcon: {
    fontSize: 16,
  },
  categoryLabel: {
    fontSize: 11,
    color: Colors.white,
    letterSpacing: 1,
    fontWeight: '500',
  },
  categoryCount: {
    fontSize: 14,
    color: Colors.gold[400],
    fontWeight: '600',
  },
  menuContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
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
    marginBottom: 32,
    gap: 12,
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
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: Colors.gold[400],
    backgroundColor: 'rgba(212, 175, 55, 0.05)',
  },
  signOutButtonText: {
    color: Colors.gold[400],
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
    paddingVertical: 17,
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
