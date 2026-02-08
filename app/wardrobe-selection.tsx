
import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, ChevronLeft } from 'lucide-react-native';

import Colors from '@/constants/colors';
import { useWardrobe } from '@/contexts/WardrobeContext';
import { ClothingItem } from '@/types/wardrobe';

const CATEGORIES = ['All', 'Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes', 'Accessories'];

export default function WardrobeSelectionScreen() {
  const { event } = useLocalSearchParams<{ event: string }>();
  const { items: wardrobe } = useWardrobe(); // Correctly use 'wardrobe' from context
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [filter, setFilter] = useState('All');

  const handleToggleItem = (itemId: string) => {
    setSelectedItems(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const handleGenerate = () => {
    if (selectedItems.length === 0) {
        alert('Please select at least one item.');
        return;
    }
    router.push({
      pathname: '/styling',
      params: { event, selectedItemIds: JSON.stringify(selectedItems) },
    });
  };

  const filteredItems = (wardrobe || []).filter((item: ClothingItem) =>
    filter === 'All' || item.category.toLowerCase() === filter.toLowerCase()
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Items</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
        {CATEGORIES.map(category => (
            <TouchableOpacity 
                key={category} 
                style={[styles.chip, filter === category && styles.chipSelected]}
                onPress={() => setFilter(category)}>
                <Text style={[styles.chipText, filter === category && styles.chipTextSelected]}>{category.toUpperCase()}</Text>
            </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.gridContainer}>
        {filteredItems.map((item: ClothingItem) => (
          <TouchableOpacity key={item.id} style={styles.itemContainer} onPress={() => handleToggleItem(item.id)}>
            <Image source={{ uri: item.imageUri }} style={styles.itemImage} />
            {selectedItems.includes(item.id) && (
              <View style={styles.selectionOverlay}>
                <Check size={24} color={Colors.white} />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {selectedItems.length > 0 && (
        <View style={styles.footer}>
            <TouchableOpacity style={styles.generateButton} onPress={handleGenerate}>
                <Text style={styles.generateButtonText}>✨ GENERATE ({selectedItems.length})</Text>
            </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.richBlack },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
    headerTitle: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },
    backButton: { padding: 8 },
    filterContainer: { paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
    chip: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.gray[200] },
    chipSelected: { backgroundColor: Colors.gold[400], borderColor: Colors.gold[400] },
    chipText: { color: Colors.white, fontWeight: '500' },
    chipTextSelected: { color: Colors.richBlack, fontWeight: 'bold' },
    gridContainer: { flexDirection: 'row', flexWrap: 'wrap', padding: 8 },
    itemContainer: { width: '33.33%', aspectRatio: 1, padding: 8 },
    itemImage: { flex: 1, width: '100%', height: '100%' },
    selectionOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(212, 175, 55, 0.7)', justifyContent: 'center', alignItems: 'center' },
    footer: { padding: 16, borderTopWidth: 1, borderColor: Colors.gray[100] },
    generateButton: { backgroundColor: Colors.gold[500], padding: 16, alignItems: 'center' },
    generateButtonText: { color: Colors.richBlack, fontSize: 16, fontWeight: 'bold' },
});
