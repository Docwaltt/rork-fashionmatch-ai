
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Camera, ImageIcon, X, RefreshCcw, AlertCircle, CheckCircle, RotateCcw, Sparkles } from "lucide-react-native";
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
  ActivityIndicator,
  TextInput,
  Switch
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
  try {
    const manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 800 } }],
      { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    return `data:image/jpeg;base64,${manipulated.base64}`;
  } catch (error) {
    console.warn("Image manipulation failed, falling back to fetch.", error);
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisSuccess, setAnalysisSuccess] = useState<boolean>(false);
  const [isSavingItem, setIsSavingItem] = useState(false);
  const { addItem } = useWardrobe();
  
  // State for all analyzable fields
  const [material, setMaterial] = useState('');
  const [fabric, setFabric] = useState('');
  const [pattern, setPattern] = useState('');
  const [style, setStyle] = useState('');
  const [texture, setTexture] = useState('');
  const [silhouette, setSilhouette] = useState('');
  const [patternDescription, setPatternDescription] = useState('');
  const [materialType, setMaterialType] = useState('');
  const [hasPattern, setHasPattern] = useState<boolean>(false);

  const [isStyleMeMode, setIsStyleMeMode] = useState(false);

  const categories = useMemo(() => getCategoriesForGender(userProfile?.gender || 'female'), [userProfile?.gender]);

  const analyzeImageMutation = trpc.wardrobe.analyze.useMutation({
    onSuccess: (data) => {
      if (!data || typeof data !== 'object') {
        setAnalysisError("AI analysis returned invalid data. Please select manually.");
        setAnalysisSuccess(false);
        setIsProcessing(false);
        return;
      }

      setAnalysisError(null);
      setAnalysisSuccess(true);
      
      // Update UI with all details from the backend
      setProcessedImage(data.cleanedImageUrl || null);
      setDetectedColors(data.color ? [data.color] : []);
      setMaterial(String(data.material || ''));
      setFabric(String(data.fabric || ''));
      setPattern(String(data.pattern || ''));
      setStyle(String(data.style || ''));
      setTexture(String(data.texture || ''));
      setSilhouette(String(data.silhouette || ''));
      setPatternDescription(String(data.patternDescription || ''));
      setMaterialType(String(data.materialType || ''));
      setHasPattern(!!data.hasPattern);

      // Robust category matching
      if (data.category) {
        const returnedCategory = String(data.category).toLowerCase().trim();
        const validCategories = categories.map(c => ({ id: c.id, label: c.label.toLowerCase() }));
        
        let match = validCategories.find(c => c.id === returnedCategory || c.label === returnedCategory);
        
        if (match) {
          setSelectedCategory(match.id as ClothingCategory);
        } else {
            console.warn(`AI returned category "${returnedCategory}" which has no direct match.`);
            // Fallback for partial matches (e.g., "short sleeve shirt" -> "shirt")
            const partialMatch = validCategories.find(c => returnedCategory.includes(c.label));
            if (partialMatch) {
                setSelectedCategory(partialMatch.id as ClothingCategory);
            }
        }
      }
      setIsProcessing(false);
    },
    onError: (error) => {
      setIsProcessing(false);
      setAnalysisError(error.message || "AI analysis unavailable. Please select category manually.");
      setAnalysisSuccess(false);
    },
  });

  const handleProcessImage = async (imageUri: string) => {
    setIsProcessing(true);
    setCapturedImage(imageUri);
    setProcessedImage(imageUri);
    try {
      const base64Image = await compressAndConvertToBase64(imageUri);
      analyzeImageMutation.mutate({ imageUrl: base64Image, gender: userProfile?.gender || undefined });
    } catch (error: any) {
      setAnalysisError("Failed to prepare image. Please select category manually.");
      setIsProcessing(false);
    }
  };

  const handleTakePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, skipProcessing: true });
      if (photo?.uri) {
        setShowCamera(false);
        handleProcessImage(photo.uri);
      }
    } catch (error) {
      Alert.alert("Camera Error", "Failed to take photo");
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: "images" as const, allowsEditing: true, quality: 0.8 });
      if (!result.canceled && result.assets[0]) {
        handleProcessImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Gallery Error", "Failed to pick image");
    }
  };

  const handleSaveItem = async () => {
    if (!processedImage || !selectedCategory) return;
    setIsSavingItem(true);
    const newItem = {
      id: Date.now().toString(), imageUri: processedImage, category: selectedCategory,
      colors: detectedColors, addedAt: Date.now(), color: detectedColors[0] || 'unknown',
      style: style || 'casual', confidence: 1.0, material, fabric, pattern, texture,
      silhouette, patternDescription, materialType, hasPattern, userId: userProfile?.id || ''
    };
    try {
      await addItem(newItem);
      Alert.alert("Added!", "Item has been added to your wardrobe.", [{ text: "OK", onPress: handleReset }]);
    } catch (error) {
      Alert.alert("Save Error", "Failed to save item to wardrobe.");
    } finally {
      setIsSavingItem(false);
    }
  };

  const handleStyleMeAfterSave = async () => {
    if (!processedImage || !selectedCategory) return;
    setIsSavingItem(true);
    const newItem = {
      id: Date.now().toString(), imageUri: processedImage, category: selectedCategory,
      colors: detectedColors, addedAt: Date.now(), color: detectedColors[0] || 'unknown',
      style: style || 'casual', confidence: 1.0, material, fabric, pattern, texture,
      silhouette, patternDescription, materialType, hasPattern, userId: userProfile?.id || ''
    };
    try {
      await addItem(newItem);
      router.push({ pathname: '/styling', params: { selectedItemId: newItem.id, event: 'casual' } });
      handleReset();
    } catch (error) {
      Alert.alert("Error", "Failed to save item before styling.");
    } finally {
      setIsSavingItem(false);
    }
  };
  
  const handleReset = () => {
    setCapturedImage(null); setProcessedImage(null); setSelectedCategory(null);
    setDetectedColors([]); setIsProcessing(false); setAnalysisError(null);
    setAnalysisSuccess(false); setMaterial(''); setFabric(''); setPattern('');
    setStyle(''); setTexture(''); setSilhouette(''); setPatternDescription('');
    setMaterialType(''); setHasPattern(false);
  };

  const handleToggleStyleMe = () => {
    if (isStyleMeMode) {
        setIsStyleMeMode(false);
    } else {
        handleReset();
        setIsStyleMeMode(true);
    }
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
      <View style={styles.cameraContainer}><StatusBar hidden /><CameraView ref={cameraRef} style={styles.camera} facing={facing}><SafeAreaView style={styles.cameraOverlay}><TouchableOpacity style={styles.closeButton} onPress={() => setShowCamera(false)}><X size={24} color="white" /></TouchableOpacity><View style={styles.cameraControls}><TouchableOpacity style={styles.flipButton} onPress={() => setFacing(current => (current === "back" ? "front" : "back"))}><RefreshCcw size={24} color="white" /></TouchableOpacity><TouchableOpacity style={styles.captureButton} onPress={handleTakePhoto}><View style={styles.captureButtonInner} /></TouchableOpacity><View style={styles.flipButtonPlaceholder} /></View></SafeAreaView></CameraView></View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[Colors.richBlack, "#121214"]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
           <View>
             <Text style={styles.headerSubtitle}>{isStyleMeMode ? 'CREATE AN OUTFIT' : 'ADD TO COLLECTION'}</Text>
             <Text style={styles.headerTitle}>{isStyleMeMode ? 'STYLE ME' : 'NEW PIECE'}</Text>
           </View>
           <TouchableOpacity onPress={handleToggleStyleMe} style={styles.styleMeToggle}>
             <Sparkles size={24} color={isStyleMeMode ? Colors.gold[400] : Colors.white} />
           </TouchableOpacity>
        </View>

        {isStyleMeMode ? (
          <View style={styles.content}>
            <View style={styles.actionsGrid}>
              <TouchableOpacity style={styles.actionCard} onPress={() => router.push({ pathname: '/styling', params: { event: 'casual' } })}>
                <View style={styles.actionIcon}><Sparkles size={32} color={Colors.gold[400]} strokeWidth={1.5} /></View>
                <Text style={styles.actionTitle}>RANDOM</Text>
                <Text style={styles.actionDesc}>AI-powered outfit generation</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionCard} onPress={() => router.push({ pathname: '/wardrobe-selection', params: { event: 'casual' } })}>
                <View style={styles.actionIcon}><ImageIcon size={32} color={Colors.gold[400]} strokeWidth={1.5} /></View>
                <Text style={styles.actionTitle}>SELECT CLOTHING</Text>
                <Text style={styles.actionDesc}>Choose from your wardrobe</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : !capturedImage ? (
          <View style={styles.content}>
            <View style={styles.actionsGrid}>
              <TouchableOpacity style={styles.actionCard} onPress={() => setShowCamera(true)}><View style={styles.actionIcon}><Camera size={32} color={Colors.gold[400]} strokeWidth={1.5} /></View><Text style={styles.actionTitle}>TAKE PHOTO</Text><Text style={styles.actionDesc}>Capture with camera</Text></TouchableOpacity>
              <TouchableOpacity style={styles.actionCard} onPress={handlePickImage}><View style={styles.actionIcon}><ImageIcon size={32} color={Colors.gold[400]} strokeWidth={1.5} /></View><Text style={styles.actionTitle}>UPLOAD</Text><Text style={styles.actionDesc}>From gallery</Text></TouchableOpacity>
            </View>
          </View>
        ) : (
          <ScrollView style={styles.formContainer}>
            <View style={styles.imageSection}>
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: processedImage || capturedImage }} style={styles.mainPreview} contentFit="contain" />
                {isProcessing && <View style={styles.processingOverlay}><ActivityIndicator size="large" color={Colors.gold[400]} /><Text style={styles.processingText}>ANALYZING...</Text><TouchableOpacity style={styles.skipButton} onPress={() => setIsProcessing(false)}><Text style={styles.skipButtonText}>SKIP</Text></TouchableOpacity></View>}
              </View>
              <TouchableOpacity style={styles.retakeButton} onPress={handleReset}><X size={16} color={Colors.gray[500]} /><Text style={styles.retakeText}>CANCEL</Text></TouchableOpacity>
            </View>
            <View style={styles.formSection}>
              {analysisSuccess && <View style={styles.successBanner}><CheckCircle size={16} color="#4CAF50" /><Text style={styles.successText}>Analysis complete! Details detected.</Text></View>}
              {analysisError && <View style={styles.errorBanner}><AlertCircle size={16} color={Colors.gold[400]} /><Text style={styles.errorText}>{analysisError}</Text><TouchableOpacity style={styles.retryButton} onPress={() => {if (capturedImage) {setAnalysisError(null); handleProcessImage(capturedImage);}}}><RotateCcw size={14} color={Colors.gold[400]} /><Text style={styles.retryButtonText}>RETRY</Text></TouchableOpacity></View>}
              <View style={styles.inputGroup}><Text style={styles.label}>MATERIAL</Text><TextInput style={styles.input} value={material} onChangeText={setMaterial} placeholder="e.g., Woven, Knit" placeholderTextColor={Colors.gray[600]} /><Text style={styles.label}>FABRIC</Text><TextInput style={styles.input} value={fabric} onChangeText={setFabric} placeholder="e.g., Cotton, Denim, Silk" placeholderTextColor={Colors.gray[600]} /><Text style={styles.label}>PATTERN</Text><TextInput style={styles.input} value={pattern} onChangeText={setPattern} placeholder="e.g., Solid, Striped, Plaid" placeholderTextColor={Colors.gray[600]} /><Text style={styles.label}>STYLE</Text><TextInput style={styles.input} value={style} onChangeText={setStyle} placeholder="e.g., Casual, Formal, Streetwear" placeholderTextColor={Colors.gray[600]} /><Text style={styles.label}>TEXTURE</Text><TextInput style={styles.input} value={texture} onChangeText={setTexture} placeholder="e.g., Smooth, Ribbed, Fuzzy" placeholderTextColor={Colors.gray[600]} /><Text style={styles.label}>SILHOUETTE</Text><TextInput style={styles.input} value={silhouette} onChangeText={setSilhouette} placeholder="e.g., Slim, Oversized, A-line" placeholderTextColor={Colors.gray[600]} /><Text style={styles.label}>PATTERN DESCRIPTION</Text><TextInput style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]} value={patternDescription} onChangeText={setPatternDescription} placeholder="e.g., Small white polka dots on blue" placeholderTextColor={Colors.gray[600]} multiline /><Text style={styles.label}>MATERIAL TYPE</Text><TextInput style={styles.input} value={materialType} onChangeText={setMaterialType} placeholder="e.g., Synthetic, Natural" placeholderTextColor={Colors.gray[600]} /><View style={styles.switchRow}><Text style={[styles.label, { marginBottom: 0 }]}>HAS PATTERN?</Text><Switch value={hasPattern} onValueChange={setHasPattern} trackColor={{ false: Colors.gray[100], true: Colors.gold[400] }} thumbColor={hasPattern ? Colors.white : Colors.gray[500]} /></View></View>
              <Text style={styles.sectionTitle}>CATEGORY</Text>
              <View style={styles.categoryGrid}>{categories.map((cat) => (<TouchableOpacity key={cat.id} style={[styles.categoryChip, selectedCategory === cat.id && styles.categoryChipSelected]} onPress={() => setSelectedCategory(cat.id as ClothingCategory)}><Text style={styles.categoryIcon}>{cat.icon}</Text><Text style={[styles.categoryChipText, selectedCategory === cat.id && styles.categoryChipTextSelected]}>{cat.label}</Text></TouchableOpacity>))}</View>
            </View>
            <View style={styles.footer}>
              <TouchableOpacity style={[styles.styleButton, (!processedImage || !selectedCategory || isProcessing || isSavingItem) && styles.saveButtonDisabled]} onPress={handleStyleMeAfterSave} disabled={!processedImage || !selectedCategory || isProcessing || isSavingItem}><LinearGradient colors={(!processedImage || !selectedCategory || isProcessing || isSavingItem) ? [Colors.gray[200], Colors.gray[200]] : [Colors.gold[300], Colors.gold[500]]} style={styles.saveButtonGradient}>{isSavingItem ? <ActivityIndicator color={Colors.richBlack} size="small" /> : <Text style={styles.saveButtonText}>✨ STYLE ME</Text>}</LinearGradient></TouchableOpacity>
              <TouchableOpacity style={[styles.saveButton, (!processedImage || !selectedCategory || isProcessing || isSavingItem) && styles.saveButtonDisabled]} onPress={handleSaveItem} disabled={!processedImage || !selectedCategory || isProcessing || isSavingItem}><View style={styles.saveButtonOutline}>{isSavingItem ? <ActivityIndicator color={Colors.gold[400]} size="small" /> : <Text style={styles.saveButtonOutlineText}>SAVE TO WARDROBE</Text>}</View></TouchableOpacity>
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
  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerSubtitle: { fontSize: 10, color: Colors.gold[400], letterSpacing: 2, marginBottom: 4, fontWeight: "600" },
  headerTitle: { fontSize: 28, fontWeight: "300", color: Colors.white, letterSpacing: 2, fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-light' },
  styleMeToggle: { padding: 8 },
  content: { flex: 1, paddingHorizontal: 24 },
  actionsGrid: { gap: 16 },
  actionCard: { backgroundColor: Colors.card, padding: 32, alignItems: "center", borderWidth: 1, borderColor: Colors.gray[100] },
  actionIcon: { marginBottom: 16, width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.gray[50], justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: Colors.gray[200] },
  actionTitle: { fontSize: 14, fontWeight: "600", color: Colors.white, letterSpacing: 1.5, marginBottom: 4 },
  actionDesc: { fontSize: 12, color: Colors.gray[500] },
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
  categoryChip: { paddingVertical: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: Colors.gray[200], alignItems: 'center', width: '30%' },
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
  flipButton: { padding: 12, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 30 },
  flipButtonPlaceholder: { width: 48 },
  captureButton: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' },
  captureButtonInner: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'white', borderWidth: 2, borderColor: 'black' },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.richBlack },
  permissionText: { color: Colors.white, marginBottom: 20 },
  permissionButton: { paddingVertical: 12, paddingHorizontal: 24, backgroundColor: Colors.white },
  permissionButtonText: { fontWeight: '600' },
  processingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  processingText: { color: Colors.gold[400], fontSize: 12, letterSpacing: 2, marginTop: 12, fontWeight: '600' },
  skipButton: { marginTop: 20, paddingVertical: 10, paddingHorizontal: 24, borderWidth: 1, borderColor: Colors.gray[500] },
  skipButtonText: { color: Colors.gray[400], fontSize: 11, letterSpacing: 1.5, fontWeight: '600' },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(212, 175, 55, 0.1)', borderWidth: 1, borderColor: Colors.gold[400], padding: 12, marginBottom: 20 },
  errorText: { color: Colors.gold[400], fontSize: 12, flex: 1, letterSpacing: 0.5 },
  retryButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: Colors.gold[400], marginLeft: 8 },
  retryButtonText: { color: Colors.gold[400], fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  successBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(76, 175, 80, 0.1)', borderWidth: 1, borderColor: '#4CAF50', padding: 12, marginBottom: 20 },
  successText: { color: '#4CAF50', fontSize: 12, flex: 1, letterSpacing: 0.5, fontWeight: '500' },
  inputGroup: { marginBottom: 24, gap: 16 },
  label: { fontSize: 10, color: Colors.gray[500], letterSpacing: 2, marginBottom: 8, fontWeight: '600' },
  input: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.gray[200], color: Colors.white, padding: 12, fontSize: 14 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
});
