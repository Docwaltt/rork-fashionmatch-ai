import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Camera, ImageIcon, X, RefreshCcw } from "lucide-react-native";
import { useState, useRef } from "react";
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
import { BlurView } from "expo-blur";

import Colors from "@/constants/colors";
import { useWardrobe } from "@/contexts/WardrobeContext";
import { ClothingItem, ClothingCategory } from "@/types/wardrobe";

const CATEGORIES: { id: ClothingCategory; label: string; icon: string }[] = [
  { id: "top", label: "Top", icon: "TOP" },
  { id: "bottom", label: "Bottom", icon: "BTM" },
  { id: "dress", label: "Dress", icon: "DRS" },
  { id: "outerwear", label: "Outer", icon: "OUT" },
  { id: "shoes", label: "Shoes", icon: "SHS" },
  { id: "accessories", label: "Accs", icon: "ACS" },
];

export default function AddItemScreen() {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>("back");
  const [showCamera, setShowCamera] = useState<boolean>(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ClothingCategory | null>(null);
  const { addItem } = useWardrobe();

  const processImageMutation = useMutation({
    mutationFn: async (imageUri: string) => {
      // In a real app, we would upload to a server.
      // For this demo, we'll simulate the AI processing delay and just use the image.
      // But we will try to use the toolkit API as requested in the previous code.
      try {
        const response = await fetch("https://toolkit.rork.com/images/edit/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: "Remove the background and the person from this image, keeping only the clothing item. Make the background transparent.",
            images: [{ type: "image", image: imageUri }],
            aspectRatio: "1:1",
          }),
        });
  
        if (!response.ok) {
           // Fallback if API fails
           return imageUri;
        }
  
        const data = await response.json();
        return `data:${data.image.mimeType};base64,${data.image.base64Data}`;
      } catch (e) {
        console.error("Processing failed", e);
        return imageUri; // Fallback
      }
    },
    onSuccess: (processedUri) => {
      setProcessedImage(processedUri);
    },
  });

  const handleTakePhoto = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });
      
      if (photo && photo.uri) {
        setCapturedImage(photo.uri);
        setShowCamera(false);
        
        if (photo.base64) {
          processImageMutation.mutate(`data:image/jpeg;base64,${photo.base64}`);
        }
      }
    } catch (error) {
      console.error("Error taking photo:", error);
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images" as const,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setCapturedImage(asset.uri);
      
      if (asset.base64) {
        processImageMutation.mutate(`data:image/jpeg;base64,${asset.base64}`);
      }
    }
  };

  const handleSaveItem = () => {
    if (!processedImage || !selectedCategory) return;

    const newItem: ClothingItem = {
      id: Date.now().toString(),
      imageUri: processedImage,
      category: selectedCategory,
      colors: [],
      addedAt: Date.now(),
    };

    addItem(newItem);
    
    setCapturedImage(null);
    setProcessedImage(null);
    setSelectedCategory(null);
    processImageMutation.reset();
    
    router.back();
  };

  const handleReset = () => {
    setCapturedImage(null);
    setProcessedImage(null);
    setSelectedCategory(null);
    processImageMutation.reset();
  };

  if (showCamera) {
    if (!permission) return <View />;
    if (!permission.granted) {
      return (
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Camera access required.</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Allow Access</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.cameraContainer}>
        <StatusBar hidden />
        <CameraView ref={cameraRef} style={styles.camera} facing={facing}>
          <SafeAreaView style={styles.cameraOverlay}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowCamera(false)}>
              <X size={24} color="white" />
            </TouchableOpacity>
            <View style={styles.cameraControls}>
              <TouchableOpacity 
                style={styles.flipButton} 
                onPress={() => setFacing(current => (current === "back" ? "front" : "back"))}
              >
                <RefreshCcw size={24} color="white" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.captureButton} onPress={handleTakePhoto}>
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
              <View style={styles.flipButtonPlaceholder} />
            </View>
          </SafeAreaView>
        </CameraView>
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
           <Text style={styles.headerSubtitle}>ADD TO COLLECTION</Text>
           <Text style={styles.headerTitle}>NEW PIECE</Text>
        </View>

        {!capturedImage ? (
          <View style={styles.content}>
            <View style={styles.actionsGrid}>
              <TouchableOpacity style={styles.actionCard} onPress={() => setShowCamera(true)}>
                <View style={styles.actionIcon}>
                  <Camera size={32} color={Colors.gold[400]} strokeWidth={1.5} />
                </View>
                <Text style={styles.actionTitle}>TAKE PHOTO</Text>
                <Text style={styles.actionDesc}>Capture with camera</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionCard} onPress={handlePickImage}>
                <View style={styles.actionIcon}>
                  <ImageIcon size={32} color={Colors.gold[400]} strokeWidth={1.5} />
                </View>
                <Text style={styles.actionTitle}>UPLOAD</Text>
                <Text style={styles.actionDesc}>From gallery</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <ScrollView style={styles.formContainer}>
            <View style={styles.imageSection}>
              <View style={styles.imagePreviewContainer}>
                <Image 
                  source={{ uri: processedImage || capturedImage }} 
                  style={styles.mainPreview}
                  contentFit="contain"
                />
                {processImageMutation.isPending && (
                  <View style={styles.processingOverlay}>
                    <BlurView intensity={20} style={StyleSheet.absoluteFill} />
                    <ActivityIndicator color={Colors.gold[400]} />
                    <Text style={styles.processingText}>REMOVING BACKGROUND...</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity style={styles.retakeButton} onPress={handleReset}>
                <X size={16} color={Colors.gray[500]} />
                <Text style={styles.retakeText}>CANCEL</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>CATEGORY</Text>
              <View style={styles.categoryGrid}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      selectedCategory === cat.id && styles.categoryChipSelected
                    ]}
                    onPress={() => setSelectedCategory(cat.id)}
                  >
                    <Text style={[
                      styles.categoryChipText,
                      selectedCategory === cat.id && styles.categoryChipTextSelected
                    ]}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.footer}>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (!processedImage || !selectedCategory) && styles.saveButtonDisabled
                ]}
                onPress={handleSaveItem}
                disabled={!processedImage || !selectedCategory}
              >
                <LinearGradient
                  colors={(!processedImage || !selectedCategory) 
                    ? [Colors.gray[200], Colors.gray[200]] 
                    : [Colors.gold[300], Colors.gold[500]]}
                  style={styles.saveButtonGradient}
                >
                  <Text style={styles.saveButtonText}>ADD TO WARDROBE</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
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
    paddingBottom: 40,
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  actionsGrid: {
    gap: 16,
  },
  actionCard: {
    backgroundColor: Colors.card,
    borderRadius: 0,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.gray[100],
  },
  actionIcon: {
    marginBottom: 16,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.gray[50],
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.white,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  actionDesc: {
    fontSize: 12,
    color: Colors.gray[500],
  },
  formContainer: {
    flex: 1,
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  imagePreviewContainer: {
    width: 240,
    height: 240,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.gray[100],
    overflow: 'hidden',
    marginBottom: 16,
  },
  mainPreview: {
    width: '100%',
    height: '100%',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  processingText: {
    color: Colors.gold[400],
    fontSize: 10,
    marginTop: 12,
    letterSpacing: 1,
    fontWeight: '600',
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
  },
  retakeText: {
    color: Colors.gray[500],
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: '600',
  },
  formSection: {
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 12,
    color: Colors.gray[500],
    letterSpacing: 2,
    marginBottom: 16,
    fontWeight: '600',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryChip: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: Colors.gray[200],
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  categoryChipSelected: {
    borderColor: Colors.gold[400],
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
  },
  categoryChipText: {
    fontSize: 12,
    color: Colors.gray[500],
    letterSpacing: 1,
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: Colors.gold[400],
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  saveButton: {
    borderRadius: 0,
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  saveButtonText: {
    color: Colors.richBlack,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 24,
  },
  closeButton: {
    padding: 12,
  },
  cameraControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 40,
    width: '100%',
  },
  flipButton: {
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 30,
  },
  flipButtonPlaceholder: {
    width: 48,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: 'black',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.richBlack,
  },
  permissionText: {
    color: Colors.white,
    marginBottom: 20,
  },
  permissionButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: Colors.white,
  },
  permissionButtonText: {
    fontWeight: '600',
  },
});
