import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Camera, ImageIcon, X, RefreshCcw, AlertCircle } from "lucide-react-native";
import { useState, useRef, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
  Alert,
  ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { trpc } from "@/lib/trpc";
import Colors from "@/constants/colors";
import { useWardrobe } from "@/contexts/WardrobeContext";
import { useAuth } from "@/contexts/AuthContext";
import { ClothingCategory } from "@/types/wardrobe";
import { getCategoriesForGender } from "@/types/user";

const compressAndConvertToBase64 = async (uri: string): Promise<string> => {
  console.log("[AddItem] Compressing image...");
  
  try {
    const manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 800 } }],
      { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    
    if (manipulated.base64) {
      return manipulated.base64;
    }
  } catch (compressError) {
    console.warn("[AddItem] Compression failed, trying direct conversion:", compressError);
  }
  
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export default function AddItemScreen() {
  const cameraRef = useRef<CameraView>(null);
  const { userProfile } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>("back");
  const [showCamera, setShowCamera] = useState<boolean>(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ClothingCategory | null>(null);
  const [detectedColors, setDetectedColors] = useState<string[]>([]);
  const [detectedTexture, setDetectedTexture] = useState<string | null>(null);
  const [detectedDesign, setDetectedDesign] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const { addItem } = useWardrobe();

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const analyzeImageMutation = trpc.wardrobe.analyzeImage.useMutation({
    onSuccess: (data) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      console.log("[AddItem] AI Analysis successful:", data.category);
      setAnalysisError(null);
      
      if (data.cleanedImage) {
        setProcessedImage(data.cleanedImage);
      }
      if (data.color) {
        setDetectedColors([data.color]);
      }
      if (data.texture) {
        setDetectedTexture(data.texture);
      }
      if (data.designPattern) {
        setDetectedDesign(data.designPattern);
      }

      if (data.category) {
        const validCategories = categories.map(c => c.id);
        const returnedCategory = data.category as ClothingCategory;

        if (validCategories.includes(returnedCategory)) {
          setSelectedCategory(returnedCategory);
        } else {
           const lowercaseCat = returnedCategory.toLowerCase();
           const match = validCategories.find(id =>
             lowercaseCat.includes(id.toLowerCase()) ||
             id.toLowerCase().includes(lowercaseCat)
           );
           if (match) {
             setSelectedCategory(match as ClothingCategory);
           } else {
             const words = lowercaseCat.split(/\s+/);
             const wordMatch = validCategories.find(id => {
               const idLower = id.toLowerCase();
               return words.some(word => word.length > 3 && (idLower.includes(word) || word.includes(idLower)));
             });
             if (wordMatch) {
               setSelectedCategory(wordMatch as ClothingCategory);
             }
           }
        }
      }
      setIsProcessing(false);
    },
    onError: (error: any) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      console.error("[AddItem] AI Analysis error:", error.message);
      setIsProcessing(false);
      setAnalysisError(error.message || "AI analysis failed. Please select manually.");
    },
  });

  const handleProcessImage = async (imageUri: string) => {
    setIsProcessing(true);
    setCapturedImage(imageUri);
    setProcessedImage(imageUri);
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsProcessing(false);
      timeoutRef.current = null;
      console.log("[AddItem] Analysis timeout");
    }, 60000);

    try {
      console.log("[AddItem] Preparing image for AI...");
      const base64 = await compressAndConvertToBase64(imageUri);
      const base64Image = `data:image/jpeg;base64,${base64}`;

      analyzeImageMutation.mutate({
        image: base64Image,
        gender: userProfile?.gender || undefined,
      });

    } catch (error: any) {
      console.error("[AddItem] Error preparing image:", error);
      setAnalysisError("Failed to prepare image for analysis.");
      setIsProcessing(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  };

  const categories = useMemo(() => {
    if (userProfile?.gender) {
      return getCategoriesForGender(userProfile.gender);
    }
    return [
      { id: 'top', label: 'Top', icon: '👕' },
      { id: 'bottom', label: 'Bottom', icon: '👖' },
      { id: 'dress', label: 'Dress', icon: '👗' },
      { id: 'shoes', label: 'Shoes', icon: '👟' },
      { id: 'outerwear', label: 'Outer', icon: '🧥' },
      { id: 'accessories', label: 'Accs', icon: '👜' },
    ];
  }, [userProfile?.gender]);

  const handleTakePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: true,
      });
      if (photo && photo.uri) {
        setShowCamera(false);
        handleProcessImage(photo.uri);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert("Camera Error", "Failed to take photo");
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images" as const,
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        handleProcessImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Gallery Error", "Failed to pick image");
    }
  };

  const handleSaveItem = () => {
    if (!processedImage || !selectedCategory) return;
    const newItem = {
      id: Date.now().toString(),
      imageUri: processedImage,
      category: selectedCategory,
      colors: detectedColors,
      texture: detectedTexture || undefined,
      designPattern: detectedDesign || undefined,
      addedAt: Date.now(),
    };
    addItem(newItem);
    Alert.alert("Added!", "Item has been added to your wardrobe.", [{ text: "OK", onPress: handleReset }]);
  };

  const handleStyleMe = () => {
    if (!processedImage || !selectedCategory) return;
    const newItem = {
      id: Date.now().toString(),
      imageUri: processedImage,
      category: selectedCategory,
      colors: detectedColors,
      texture: detectedTexture || undefined,
      designPattern: detectedDesign || undefined,
      addedAt: Date.now(),
    };
    addItem(newItem);
    router.push({ pathname: '/styling', params: { itemId: newItem.id, fromAdd: 'true' } });
    handleReset();
  };

  const handleReset = () => {
    setCapturedImage(null);
    setProcessedImage(null);
    setSelectedCategory(null);
    setDetectedColors([]);
    setDetectedTexture(null);
    setDetectedDesign(null);
    setIsProcessing(false);
    setAnalysisError(null);
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
              <TouchableOpacity onPress={() => setFacing(c => (c === "back" ? "front" : "back"))}>
                <RefreshCcw size={24} color="white" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.captureButton} onPress={handleTakePhoto}>
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
              <View style={{ width: 24 }} />
            </View>
          </SafeAreaView>
        </CameraView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[Colors.richBlack, "#121214"]} style={StyleSheet.absoluteFill} />
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
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionCard} onPress={handlePickImage}>
                <View style={styles.actionIcon}>
                  <ImageIcon size={32} color={Colors.gold[400]} strokeWidth={1.5} />
                </View>
                <Text style={styles.actionTitle}>UPLOAD</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <ScrollView style={styles.formContainer}>
            <View style={styles.imageSection}>
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: processedImage || capturedImage }} style={styles.mainPreview} contentFit="contain" />
                {isProcessing && (
                  <View style={styles.processingOverlay}>
                    <ActivityIndicator size="large" color={Colors.gold[400]} />
                    <Text style={styles.processingText}>ANALYZING...</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity style={styles.retakeButton} onPress={handleReset}>
                <X size={16} color={Colors.gray[500]} />
                <Text style={styles.retakeText}>CANCEL</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formSection}>
              {analysisError && (
                <View style={styles.errorBanner}>
                  <AlertCircle size={16} color={Colors.gold[400]} />
                  <Text style={styles.errorText}>{analysisError}</Text>
                </View>
              )}
              
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
                {detectedColors.length > 0 && (
                  <View style={{ flex: 1, minWidth: '45%' }}>
                    <Text style={styles.sectionTitle}>COLOR</Text>
                    <View style={styles.detectedInfoChip}>
                      <Text style={styles.detectedInfoText}>{detectedColors[0].toUpperCase()}</Text>
                    </View>
                  </View>
                )}
                {detectedTexture && (
                  <View style={{ flex: 1, minWidth: '45%' }}>
                    <Text style={styles.sectionTitle}>TEXTURE</Text>
                    <View style={styles.detectedInfoChip}>
                      <Text style={styles.detectedInfoText}>{detectedTexture.toUpperCase()}</Text>
                    </View>
                  </View>
                )}
                {detectedDesign && detectedDesign !== 'none' && (
                  <View style={{ flex: 1, minWidth: '45%' }}>
                    <Text style={styles.sectionTitle}>DESIGN</Text>
                    <View style={styles.detectedInfoChip}>
                      <Text style={styles.detectedInfoText}>{detectedDesign.toUpperCase()}</Text>
                    </View>
                  </View>
                )}
              </View>

              <Text style={styles.sectionTitle}>CATEGORY</Text>
              <View style={styles.categoryGrid}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryChip, selectedCategory === cat.id && styles.categoryChipSelected]}
                    onPress={() => setSelectedCategory(cat.id as ClothingCategory)}
                  >
                    <Text style={styles.categoryIcon}>{cat.icon}</Text>
                    <Text style={[styles.categoryChipText, selectedCategory === cat.id && styles.categoryChipTextSelected]}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.styleButton, (!processedImage || !selectedCategory || isProcessing) && styles.saveButtonDisabled]}
                onPress={handleStyleMe}
                disabled={!processedImage || !selectedCategory || isProcessing}
              >
                <LinearGradient colors={[Colors.gold[300], Colors.gold[500]]} style={styles.saveButtonGradient}>
                  <Text style={styles.saveButtonText}>✨ STYLE ME</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, (!processedImage || !selectedCategory || isProcessing) && styles.saveButtonDisabled]}
                onPress={handleSaveItem}
                disabled={!processedImage || !selectedCategory || isProcessing}
              >
                <View style={styles.saveButtonOutline}>
                  <Text style={styles.saveButtonOutlineText}>SAVE TO WARDROBE</Text>
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.richBlack },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
  headerSubtitle: { fontSize: 10, color: Colors.gold[400], letterSpacing: 2, marginBottom: 4, fontWeight: "600" },
  headerTitle: { fontSize: 28, fontWeight: "300", color: Colors.white, letterSpacing: 2 },
  content: { flex: 1, paddingHorizontal: 24 },
  actionsGrid: { gap: 16 },
  actionCard: { backgroundColor: Colors.card, padding: 32, alignItems: "center", borderWidth: 1, borderColor: Colors.gray[100] },
  actionIcon: { marginBottom: 16, width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.gray[50], justifyContent: "center", alignItems: "center" },
  actionTitle: { fontSize: 14, fontWeight: "600", color: Colors.white, letterSpacing: 1.5 },
  formContainer: { flex: 1 },
  imageSection: { alignItems: 'center', marginBottom: 40 },
  imagePreviewContainer: { width: 240, height: 240, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.gray[100], overflow: 'hidden', marginBottom: 16 },
  mainPreview: { width: '100%', height: '100%' },
  retakeButton: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8 },
  retakeText: { color: Colors.gray[500], fontSize: 10, letterSpacing: 1, fontWeight: '600' },
  formSection: { paddingHorizontal: 24, marginBottom: 40 },
  sectionTitle: { fontSize: 12, color: Colors.gray[500], letterSpacing: 2, marginBottom: 16, fontWeight: '600' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryIcon: { fontSize: 20, marginBottom: 8 },
  categoryChip: { paddingVertical: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: Colors.gray[200], backgroundColor: 'transparent', alignItems: 'center', width: '30%' },
  categoryChipSelected: { borderColor: Colors.gold[400], backgroundColor: 'rgba(212, 175, 55, 0.1)' },
  categoryChipText: { fontSize: 12, color: Colors.gray[500], letterSpacing: 1, fontWeight: '500' },
  categoryChipTextSelected: { color: Colors.gold[400], fontWeight: '600' },
  footer: { paddingHorizontal: 24, paddingBottom: 40 },
  styleButton: { borderRadius: 0, overflow: 'hidden', marginBottom: 12 },
  saveButton: { borderRadius: 0, overflow: 'hidden' },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonGradient: { paddingVertical: 18, alignItems: 'center' },
  saveButtonText: { color: Colors.richBlack, fontSize: 14, fontWeight: '700', letterSpacing: 2 },
  saveButtonOutline: { paddingVertical: 18, alignItems: 'center', borderWidth: 1, borderColor: Colors.gold[400] },
  saveButtonOutlineText: { color: Colors.gold[400], fontSize: 14, fontWeight: '700', letterSpacing: 2 },
  cameraContainer: { flex: 1, backgroundColor: 'black' },
  camera: { flex: 1 },
  cameraOverlay: { flex: 1, justifyContent: 'space-between', padding: 24 },
  closeButton: { padding: 12 },
  cameraControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingBottom: 40, width: '100%' },
  captureButton: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' },
  captureButtonInner: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'white', borderWidth: 2, borderColor: 'black' },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.richBlack },
  permissionText: { color: Colors.white, marginBottom: 20 },
  permissionButton: { paddingVertical: 12, paddingHorizontal: 24, backgroundColor: Colors.white },
  permissionButtonText: { fontWeight: '600' },
  processingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  processingText: { color: Colors.gold[400], fontSize: 12, letterSpacing: 2, marginTop: 12, fontWeight: '600' },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(212, 175, 55, 0.1)', borderWidth: 1, borderColor: Colors.gold[400], padding: 12, marginBottom: 20 },
  errorText: { color: Colors.gold[400], fontSize: 12, flex: 1, letterSpacing: 0.5 },
  detectedInfoChip: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.gold[400], alignSelf: 'flex-start' },
  detectedInfoText: { color: Colors.gold[400], fontSize: 11, fontWeight: '600', letterSpacing: 1 },
});
