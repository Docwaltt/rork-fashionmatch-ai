import { router, useLocalSearchParams } from "expo-router";
import {
  Camera,
  MapPin,
  ArrowRight,
  Check,
  Image as ImageIcon,
} from "lucide-react-native";
import { useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { Image } from "expo-image";

import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { Gender } from "@/types/user";

export default function ProfileSetupScreen() {
  const params = useLocalSearchParams<{ displayName?: string }>();
  const { createProfile, uploadProfilePhoto, isCreatingProfile, user } = useAuth();

  const [step, setStep] = useState(1);
  const [displayName] = useState(params.displayName || "");
  const [gender, setGender] = useState<Gender | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [coordinates, setCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const slideAnim = useRef(new Animated.Value(0)).current;

  const animateStep = (nextStep: number) => {
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    setStep(nextStep);
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setProfilePhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error("[ProfileSetup] Image picker error:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission Required", "Camera access is needed to take a photo");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setProfilePhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error("[ProfileSetup] Camera error:", error);
      Alert.alert("Error", "Failed to take photo");
    }
  };

  const handleGetLocation = async () => {
    try {
      setIsLoadingLocation(true);

      if (Platform.OS === "web") {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
             Alert.alert("Permission Required", "Location access is needed");
             setIsLoadingLocation(false);
             return;
          }

          const location = await Location.getCurrentPositionAsync({});
          const { latitude, longitude } = location.coords;
          setCoordinates({ latitude, longitude });
          
          // Reverse geocoding is often not supported or limited on web
          // We'll leave city/country empty for manual entry to avoid bad data
          setIsLoadingLocation(false);
        } catch (error) {
           console.error("Web location error:", error);
           setIsLoadingLocation(false);
           Alert.alert("Error", "Failed to get location");
        }
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Location access is needed");
        setIsLoadingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = location.coords;
      setCoordinates({ latitude, longitude });

      const [address] = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (address) {
        console.log("[ProfileSetup] Location found:", address);
        // Try multiple fields for city to ensure we get a value
        const cityValue = address.city || address.subregion || address.district || address.region || address.name || "";
        const countryValue = address.country || address.isoCountryCode || "";
        
        if (!cityValue && !city && !country) {
           Alert.alert("Notice", "We couldn't automatically detect your city name, please enter it manually.");
        }

        if (cityValue) setCity(cityValue);
        if (countryValue) setCountry(countryValue);
      }
    } catch (error) {
      console.error("[ProfileSetup] Location error:", error);
      Alert.alert("Error", "Failed to get location");
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleComplete = async () => {
    if (!gender) {
      Alert.alert("Error", "Please select your gender");
      return;
    }

    try {
      let photoUrl: string | undefined;
      if (profilePhoto) {
        photoUrl = await uploadProfilePhoto(profilePhoto);
      }

      await createProfile({
        email: user?.email || "",
        displayName,
        gender,
        profilePhotoUri: photoUrl,
        location:
          city && country
            ? {
                city,
                country,
                latitude: coordinates?.latitude,
                longitude: coordinates?.longitude,
              }
            : undefined,
      });

      console.log("[ProfileSetup] Profile created successfully");
      router.replace("/(tabs)");
    } catch (error: any) {
      console.error("[ProfileSetup] Error:", error);
      Alert.alert("Error", "Failed to create profile");
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>SELECT YOUR{"\n"}GENDER</Text>
      <Text style={styles.stepSubtitle}>
        This helps us personalize your clothing categories
      </Text>

      <View style={styles.genderContainer}>
        <TouchableOpacity
          style={[
            styles.genderOption,
            gender === "male" && styles.genderOptionSelected,
          ]}
          onPress={() => setGender("male")}
          activeOpacity={0.8}
        >
          <View style={styles.genderIconContainer}>
            <Text style={styles.genderIcon}>👔</Text>
          </View>
          <Text
            style={[
              styles.genderLabel,
              gender === "male" && styles.genderLabelSelected,
            ]}
          >
            MALE
          </Text>
          {gender === "male" && (
            <View style={styles.checkContainer}>
              <Check size={16} color={Colors.richBlack} />
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.genderOption,
            gender === "female" && styles.genderOptionSelected,
          ]}
          onPress={() => setGender("female")}
          activeOpacity={0.8}
        >
          <View style={styles.genderIconContainer}>
            <Text style={styles.genderIcon}>👗</Text>
          </View>
          <Text
            style={[
              styles.genderLabel,
              gender === "female" && styles.genderLabelSelected,
            ]}
          >
            FEMALE
          </Text>
          {gender === "female" && (
            <View style={styles.checkContainer}>
              <Check size={16} color={Colors.richBlack} />
            </View>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.nextButton, !gender && styles.buttonDisabled]}
        onPress={() => gender && animateStep(2)}
        disabled={!gender}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={
            gender
              ? [Colors.gold[400], Colors.gold[500]]
              : [Colors.gray[200], Colors.gray[300]]
          }
          style={styles.buttonGradient}
        >
          <Text
            style={[styles.nextButtonText, !gender && styles.buttonTextDisabled]}
          >
            CONTINUE
          </Text>
          <ArrowRight
            size={18}
            color={gender ? Colors.richBlack : Colors.gray[500]}
          />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>ADD YOUR{"\n"}PHOTO</Text>
      <Text style={styles.stepSubtitle}>
        This helps identify you in your gallery
      </Text>

      <View style={styles.photoContainer}>
        {profilePhoto ? (
          <TouchableOpacity onPress={handlePickImage} activeOpacity={0.9}>
            <Image
              source={{ uri: profilePhoto }}
              style={styles.profilePhoto}
              contentFit="cover"
            />
            <View style={styles.photoEditOverlay}>
              <Camera size={24} color={Colors.white} />
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.photoPlaceholder}>
            <View style={styles.photoActions}>
              <TouchableOpacity
                style={styles.photoActionButton}
                onPress={handleTakePhoto}
              >
                <Camera size={24} color={Colors.gold[400]} />
                <Text style={styles.photoActionText}>CAMERA</Text>
              </TouchableOpacity>
              <View style={styles.photoActionDivider} />
              <TouchableOpacity
                style={styles.photoActionButton}
                onPress={handlePickImage}
              >
                <ImageIcon size={24} color={Colors.gold[400]} />
                <Text style={styles.photoActionText}>GALLERY</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.nextButton}
        onPress={() => animateStep(3)}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={[Colors.gold[400], Colors.gold[500]]}
          style={styles.buttonGradient}
        >
          <Text style={styles.nextButtonText}>
            {profilePhoto ? "CONTINUE" : "SKIP FOR NOW"}
          </Text>
          <ArrowRight size={18} color={Colors.richBlack} />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>YOUR{"\n"}LOCATION</Text>
      <Text style={styles.stepSubtitle}>
        For weather-based outfit suggestions
      </Text>

      <View style={styles.locationContainer}>
        <TouchableOpacity
          style={styles.detectLocationButton}
          onPress={handleGetLocation}
          disabled={isLoadingLocation}
        >
          {isLoadingLocation ? (
            <ActivityIndicator color={Colors.gold[400]} />
          ) : (
            <>
              <MapPin size={20} color={Colors.gold[400]} />
              <Text style={styles.detectLocationText}>DETECT MY LOCATION</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.orDivider}>
          <View style={styles.dividerLine} />
          <Text style={styles.orText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.locationInputs}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="City"
              placeholderTextColor={Colors.gray[500]}
              value={city}
              onChangeText={setCity}
            />
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Country"
              placeholderTextColor={Colors.gray[500]}
              value={country}
              onChangeText={setCountry}
            />
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.nextButton, isCreatingProfile && styles.buttonDisabled]}
        onPress={handleComplete}
        disabled={isCreatingProfile}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={[Colors.gold[400], Colors.gold[500]]}
          style={styles.buttonGradient}
        >
          {isCreatingProfile ? (
            <ActivityIndicator color={Colors.richBlack} />
          ) : (
            <>
              <Text style={styles.nextButtonText}>COMPLETE SETUP</Text>
              <Check size={18} color={Colors.richBlack} />
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[Colors.richBlack, "#0a0a0c", "#121216"]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <Animated.View
                  style={[styles.progressFill, { width: `${(step / 3) * 100}%` }]}
                />
              </View>
              <Text style={styles.progressText}>STEP {step} OF 3</Text>
            </View>

            <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
              {step === 3 && renderStep3()}
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  progressContainer: {
    marginTop: 20,
    marginBottom: 40,
  },
  progressBar: {
    height: 2,
    backgroundColor: Colors.gray[100],
    marginBottom: 12,
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.gold[400],
  },
  progressText: {
    fontSize: 11,
    color: Colors.gray[500],
    letterSpacing: 2,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 32,
    fontWeight: "200",
    color: Colors.white,
    letterSpacing: 2,
    lineHeight: 40,
    marginBottom: 16,
    fontFamily: Platform.OS === "ios" ? "Helvetica Neue" : "sans-serif-light",
  },
  stepSubtitle: {
    fontSize: 14,
    color: Colors.gray[500],
    letterSpacing: 0.5,
    marginBottom: 40,
  },
  genderContainer: {
    gap: 16,
    marginBottom: 40,
  },
  genderOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: Colors.gray[50],
    borderWidth: 1,
    borderColor: Colors.gray[100],
  },
  genderOptionSelected: {
    borderColor: Colors.gold[400],
    backgroundColor: "rgba(212, 175, 55, 0.05)",
  },
  genderIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.richBlack,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  genderIcon: {
    fontSize: 24,
  },
  genderLabel: {
    flex: 1,
    fontSize: 16,
    color: Colors.white,
    letterSpacing: 2,
    fontWeight: "500",
  },
  genderLabelSelected: {
    color: Colors.gold[400],
  },
  checkContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.gold[400],
    justifyContent: "center",
    alignItems: "center",
  },
  photoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  profilePhoto: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    borderColor: Colors.gold[400],
  },
  photoEditOverlay: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.gold[400],
    justifyContent: "center",
    alignItems: "center",
  },
  photoPlaceholder: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: Colors.gray[50],
    borderWidth: 1,
    borderColor: Colors.gray[100],
    justifyContent: "center",
    alignItems: "center",
  },
  photoActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  photoActionButton: {
    alignItems: "center",
    padding: 16,
  },
  photoActionText: {
    fontSize: 10,
    color: Colors.gray[500],
    letterSpacing: 1,
    marginTop: 8,
  },
  photoActionDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.gray[200],
  },
  locationContainer: {
    marginBottom: 40,
  },
  detectLocationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 18,
    backgroundColor: Colors.gray[50],
    borderWidth: 1,
    borderColor: Colors.gray[100],
  },
  detectLocationText: {
    fontSize: 12,
    color: Colors.gold[400],
    letterSpacing: 1.5,
    fontWeight: "600",
  },
  orDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.gray[200],
  },
  orText: {
    fontSize: 12,
    color: Colors.gray[500],
    letterSpacing: 1,
    marginHorizontal: 16,
  },
  locationInputs: {
    gap: 16,
  },
  inputContainer: {
    backgroundColor: Colors.gray[50],
    borderWidth: 1,
    borderColor: Colors.gray[100],
    height: 56,
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: 15,
    color: Colors.white,
    letterSpacing: 0.5,
  },
  nextButton: {
    marginTop: "auto",
    shadowColor: Colors.gold[400],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
    shadowOpacity: 0,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    height: 56,
  },
  nextButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.richBlack,
    letterSpacing: 2,
  },
  buttonTextDisabled: {
    color: Colors.gray[500],
  },
});
