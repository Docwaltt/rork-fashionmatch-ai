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
  const { items } = useWardrobe();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [filter, setFilter] = useState('All');

  const handleToggleItem = (itemId: string) => {
    setSelectedItems(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const handleContinue = () => {
    // Navigate to styling screen with selected items
    // Since we can't pass the full objects easily via URL, we pass IDs
    // The styling screen will need to filter the wardrobe by these IDs
    router.push({
      pathname: '/styling',
      params: { 
          event, 
          selectedItemIds: selectedItems.join(',') // Pass as comma-separated string
      },
    });
  };

  const filteredItems = items.filter(item => {
    if (filter === 'All') return true;
    // This is a simplified filter. You might need to adjust the categories based on your data.
    return item.category.toLowerCase().includes(filter.toLowerCase().slice(0, -1));
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronLeft size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Items</Text>
        <TouchableOpacity onPress={handleContinue} disabled={selectedItems.length === 0}>
          <Text style={[styles.continueButton, selectedItems.length === 0 && styles.disabledButton]}>
            Continue
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {CATEGORIES.map(category => (
            <TouchableOpacity
              key={category}
              style={[styles.filterButton, filter === category && styles.activeFilter]}
              onPress={() => setFilter(category)}
            >
              <Text style={styles.filterText}>{category}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        {filteredItems.map(item => (
          <TouchableOpacity
            key={item.id}
            style={styles.itemContainer}
            onPress={() => handleToggleItem(item.id)}
          >
            <Image source={{ uri: item.imageUri }} style={styles.itemImage} />
            {selectedItems.includes(item.id) && (
              <View style={styles.overlay}>
                <Check size={32} color={Colors.white} />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.richBlack,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerTitle: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  continueButton: {
    color: Colors.gold[400],
    fontSize: 16,
  },
  disabledButton: {
    color: Colors.gray[500],
  },
  filterBar: {
    paddingVertical: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 8,
    borderRadius: 16,
    backgroundColor: Colors.gray[800],
  },
  activeFilter: {
    backgroundColor: Colors.gold[400],
  },
  filterText: {
    color: Colors.white,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  itemContainer: {
    width: '33.333%', 
    aspectRatio: 1,
    padding: 4,
  },
  itemImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
});
