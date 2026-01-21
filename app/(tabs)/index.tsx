import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Sparkles, Grid, Trash2, Edit3, X } from "lucide-react-native";
import { useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Modal,
  Pressable,
  Platform,
  StatusBar,
  Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import Colors from "@/constants/colors";
import { useWardrobe } from "@/contexts/WardrobeContext";
import { useAuth } from "@/contexts/AuthContext";
import { ClothingItem, ClothingCategory } from "@/types/wardrobe";
import { getCategoriesForGender } from "@/types/user";

const { width } = Dimensions.get("window");
const COLUMN_COUNT = 2;
const ITEM_WIDTH = (width - 48 - (COLUMN_COUNT - 1) * 12) / COLUMN_COUNT;

const EVENT_TYPES = [
  { id: "casual", label: "Casual Outing", icon: "☕" },
  { id: "business", label: "Business Meeting", icon: "💼" },
  { id: "party", label: "Party/Night Out", icon: "🎉" },
  { id: "formal", label: "Formal Event", icon: "🎩" },
  { id: "date", label: "Date Night", icon: "💕" },
  { id: "workout", label: "Workout", icon: "🏃" },
];

export default function WardrobeScreen() {
  const { items, isLoading, removeItem, updateItem } = useWardrobe();
  const { userProfile } = useAuth();
  const [selectedItem, setSelectedItem] = useState<ClothingItem | null>(null);
  const [showStyleModal, setShowStyleModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editCategory, setEditCategory] = useState<ClothingCategory | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const categories = useMemo(() => {
    if (userProfile?.gender) {
      return getCategoriesForGender(userProfile.gender);
    }
    return [
      { id: 'top' as ClothingCategory, label: 'Top', icon: '👕' },
      { id: 'bottom' as ClothingCategory, label: 'Bottom', icon: '👖' },
      { id: 'dress' as ClothingCategory, label: 'Dress', icon: '👗' },
      { id: 'shoes' as ClothingCategory, label: 'Shoes', icon: '👟' },
      { id: 'outerwear' as ClothingCategory, label: 'Outer', icon: '🧥' },
      { id: 'accessories' as ClothingCategory, label: 'Accs', icon: '👜' },
    ];
  }, [userProfile?.gender]);

  const handleStartStyling = () => {
    setShowStyleModal(true);
  };

  const handleEventSelect = (eventId: string) => {
    setShowStyleModal(false);
    router.push(`/styling?event=${eventId}` as any);
  };

  const handleDeleteItem = () => {
    if (!selectedItem) return;
    Alert.alert(
      "Delete Item",
      "Are you sure you want to remove this item from your wardrobe?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            removeItem(selectedItem.id);
            setSelectedItem(null);
          },
        },
      ]
    );
  };

  const handleEditItem = () => {
    if (!selectedItem) return;
    setEditCategory(selectedItem.category);
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    if (!selectedItem || !editCategory) return;
    updateItem({ id: selectedItem.id, category: editCategory });
    setSelectedItem({ ...selectedItem, category: editCategory });
    setShowEditModal(false);
  };

  const getCategoryLabel = (categoryId: string) => {
    const found = categories.find(c => c.id === categoryId);
    return found?.label || categoryId;
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <Sparkles size={32} color={Colors.tint} style={{ opacity: 0.5 }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[Colors.richBlack, "#121214"]}
        style={StyleSheet.absoluteFill}
      />
      
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerSubtitle}>DIGITAL CLOSET</Text>
            <Text style={styles.headerTitle}>WARDROBE</Text>
          </View>
          <TouchableOpacity 
            style={styles.styleButton} 
            onPress={handleStartStyling}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[Colors.gold[300], Colors.gold[500]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.styleButtonGradient}
            >
              <Sparkles size={16} color={Colors.richBlack} />
              <Text style={styles.styleButtonText}>STYLE ME</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Sparkles size={48} color={Colors.gold[400]} />
            </View>
            <Text style={styles.emptyTitle}>EMPTY CLOSET</Text>
            <Text style={styles.emptySubtitle}>
              Your luxury collection awaits. Start curating your digital wardrobe.
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push("/(tabs)/add")}
            >
              <Text style={styles.emptyButtonText}>ADD FIRST PIECE</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView 
            style={styles.scrollView} 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.statsContainer}>
              <View style={styles.statsWrapper}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{items.length}</Text>
                  <Text style={styles.statLabel}>TOTAL</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {items.filter((item) => item.category === "top").length}
                  </Text>
                  <Text style={styles.statLabel}>TOPS</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {items.filter((item) => item.category === "bottom").length}
                  </Text>
                  <Text style={styles.statLabel}>BOTTOMS</Text>
                </View>
              </View>
            </View>

            <View style={styles.collectionHeader}>
              <Text style={styles.sectionTitle}>COLLECTION</Text>
              <View style={styles.viewToggle}>
                <TouchableOpacity onPress={() => setViewMode('grid')}>
                  <Grid size={20} color={viewMode === 'grid' ? Colors.tint : Colors.gray[600]} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.grid}>
              {items.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.gridItem}
                  onPress={() => setSelectedItem(item)}
                  activeOpacity={0.9}
                >
                  <Image 
                    source={{ uri: item.imageUri }} 
                    style={styles.itemImage} 
                    contentFit="cover" 
                    transition={300} 
                  />
                  <LinearGradient
                    colors={["transparent", "rgba(0,0,0,0.8)"]}
                    style={styles.itemGradient}
                  >
                    <Text style={styles.itemCategory}>{item.category}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}

        <Modal
          visible={selectedItem !== null && !showEditModal}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedItem(null)}
        >
          <BlurView intensity={40} tint="dark" style={styles.modalOverlay}>
            <Pressable style={styles.modalBackdrop} onPress={() => setSelectedItem(null)} />
            <View style={styles.modalContent}>
              {selectedItem && (
                <>
                  <TouchableOpacity 
                    style={styles.modalCloseButton} 
                    onPress={() => setSelectedItem(null)}
                  >
                    <X size={20} color={Colors.gray[400]} />
                  </TouchableOpacity>
                  <Image
                    source={{ uri: selectedItem.imageUri }}
                    style={styles.modalImage}
                    contentFit="contain"
                  />
                  <View style={styles.modalInfo}>
                    <Text style={styles.modalCategory}>
                      {getCategoryLabel(selectedItem.category)}
                    </Text>
                    
                    {selectedItem.colors && selectedItem.colors.length > 0 && (
                      <View style={styles.colorsSection}>
                        <Text style={styles.detailLabel}>COLORS</Text>
                        <View style={styles.colorTags}>
                          {selectedItem.colors.map((color, index) => (
                            <View key={index} style={styles.colorTag}>
                              <Text style={styles.colorTagText}>{color.toUpperCase()}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                    
                    {selectedItem.season && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>SEASON</Text>
                        <Text style={styles.detailValue}>{selectedItem.season}</Text>
                      </View>
                    )}
                    
                    <Text style={styles.modalDate}>
                      Added {new Date(selectedItem.addedAt).toLocaleDateString()}
                    </Text>
                    
                    <View style={styles.modalActions}>
                      <TouchableOpacity 
                        style={styles.editButton} 
                        onPress={handleEditItem}
                      >
                        <Edit3 size={18} color={Colors.gold[400]} />
                        <Text style={styles.editButtonText}>EDIT</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.deleteButton} 
                        onPress={handleDeleteItem}
                      >
                        <Trash2 size={18} color="#E53935" />
                        <Text style={styles.deleteButtonText}>DELETE</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              )}
            </View>
          </BlurView>
        </Modal>

        <Modal
          visible={showEditModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowEditModal(false)}
        >
          <View style={styles.styleModalOverlay}>
            <Pressable
              style={styles.styleModalBackdrop}
              onPress={() => setShowEditModal(false)}
            />
            <View style={styles.styleModalContent}>
              <View style={styles.styleModalHandle} />
              <Text style={styles.styleModalTitle}>EDIT CATEGORY</Text>
              <Text style={styles.styleModalSubtitle}>
                Select the correct category for this item
              </Text>
              <ScrollView style={styles.eventList} showsVerticalScrollIndicator={false}>
                <View style={styles.editCategoryGrid}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.editCategoryChip,
                        editCategory === cat.id && styles.editCategoryChipSelected
                      ]}
                      onPress={() => setEditCategory(cat.id as ClothingCategory)}
                    >
                      <Text style={styles.editCategoryIcon}>{cat.icon}</Text>
                      <Text style={[
                        styles.editCategoryText,
                        editCategory === cat.id && styles.editCategoryTextSelected
                      ]}>{cat.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <TouchableOpacity 
                style={styles.saveEditButton} 
                onPress={handleSaveEdit}
              >
                <Text style={styles.saveEditButtonText}>SAVE CHANGES</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showStyleModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowStyleModal(false)}
        >
          <View style={styles.styleModalOverlay}>
            <Pressable
              style={styles.styleModalBackdrop}
              onPress={() => setShowStyleModal(false)}
            />
            <View style={styles.styleModalContent}>
              <View style={styles.styleModalHandle} />
              <Text style={styles.styleModalTitle}>SELECT OCCASION</Text>
              <Text style={styles.styleModalSubtitle}>
                Where are you going today?
              </Text>
              <ScrollView style={styles.eventList}>
                {EVENT_TYPES.map((event) => (
                  <TouchableOpacity
                    key={event.id}
                    style={styles.eventItem}
                    onPress={() => handleEventSelect(event.id)}
                  >
                    <View style={styles.eventIconContainer}>
                      <Text style={styles.eventIcon}>{event.icon}</Text>
                    </View>
                    <Text style={styles.eventLabel}>{event.label}</Text>
                    <View style={styles.arrowContainer}>
                       {/* Arrow icon could go here */}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
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
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.richBlack,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  styleButton: {
    shadowColor: Colors.gold[400],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  styleButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  styleButtonText: {
    color: Colors.richBlack,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Space for tab bar
  },
  statsContainer: {
    paddingHorizontal: 24,
    marginTop: 10,
  },
  statsWrapper: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.gray[200],
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "300",
    color: Colors.white,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.gray[500],
    fontWeight: "600",
    letterSpacing: 1,
  },
  collectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 32,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.gray[400],
    letterSpacing: 2,
  },
  viewToggle: {
    flexDirection: 'row',
    gap: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 24,
    gap: 12,
  },
  gridItem: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH * 1.4,
    borderRadius: 0,
    backgroundColor: Colors.card,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.gray[100],
  },
  itemImage: {
    width: "100%",
    height: "100%",
  },
  itemGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    justifyContent: "flex-end",
    padding: 12,
  },
  itemCategory: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingBottom: 100,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.gray[50],
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.gray[100],
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "300",
    color: Colors.white,
    marginBottom: 12,
    letterSpacing: 2,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.gray[500],
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 40,
    letterSpacing: 0.5,
  },
  emptyButton: {
    backgroundColor: Colors.white,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 0,
  },
  emptyButtonText: {
    color: Colors.black,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: width * 0.85,
    backgroundColor: Colors.card,
    borderRadius: 0,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.gray[100],
  },
  modalImage: {
    width: "100%",
    height: 450,
    backgroundColor: Colors.gray[50],
  },
  modalCloseButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },
  modalInfo: {
    padding: 24,
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[100],
  },
  modalCategory: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.white,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  colorsSection: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 10,
    color: Colors.gray[500],
    letterSpacing: 1.5,
    marginBottom: 8,
    fontWeight: '600',
  },
  colorTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderWidth: 1,
    borderColor: Colors.gold[400],
  },
  colorTagText: {
    fontSize: 10,
    color: Colors.gold[400],
    fontWeight: '600',
    letterSpacing: 1,
  },
  detailRow: {
    marginBottom: 16,
  },
  detailValue: {
    fontSize: 14,
    color: Colors.white,
    textTransform: 'capitalize',
  },
  modalDate: {
    fontSize: 10,
    color: Colors.gray[500],
    letterSpacing: 0.5,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[100],
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.gold[400],
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.gold[400],
    letterSpacing: 1,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E53935',
  },
  deleteButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E53935',
    letterSpacing: 1,
  },
  editCategoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 20,
  },
  editCategoryChip: {
    width: '30%',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: Colors.gray[200],
    alignItems: 'center',
  },
  editCategoryChipSelected: {
    borderColor: Colors.gold[400],
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
  },
  editCategoryIcon: {
    fontSize: 20,
    marginBottom: 6,
  },
  editCategoryText: {
    fontSize: 10,
    color: Colors.gray[500],
    letterSpacing: 0.5,
    fontWeight: '500',
  },
  editCategoryTextSelected: {
    color: Colors.gold[400],
    fontWeight: '600',
  },
  saveEditButton: {
    backgroundColor: Colors.gold[400],
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  saveEditButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.richBlack,
    letterSpacing: 1.5,
  },
  styleModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  styleModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
  },
  styleModalContent: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 40,
    paddingHorizontal: 24,
    maxHeight: "80%",
    borderWidth: 1,
    borderColor: Colors.gray[100],
  },
  styleModalHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.gray[200],
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 32,
    opacity: 0.3,
  },
  styleModalTitle: {
    fontSize: 24,
    fontWeight: "300",
    color: Colors.white,
    marginBottom: 8,
    letterSpacing: 1,
  },
  styleModalSubtitle: {
    fontSize: 14,
    color: Colors.gray[500],
    marginBottom: 32,
    letterSpacing: 0.5,
  },
  eventList: {
    maxHeight: 400,
  },
  eventItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  eventIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gray[50],
    justifyContent: "center",
    alignItems: "center",
  },
  eventIcon: {
    fontSize: 18,
  },
  eventLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.white,
    letterSpacing: 1,
    textTransform: 'uppercase',
    flex: 1,
  },
  arrowContainer: {
    opacity: 0.5,
  },
});
