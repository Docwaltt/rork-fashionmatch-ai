import { router } from "expo-router";
import { Sparkles, ArrowRight } from "lucide-react-native";
import { useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Animated,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

import Colors from "@/constants/colors";

const { height } = Dimensions.get("window");

export default function WelcomeScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, logoScale]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[Colors.richBlack, "#0a0a0c", "#121216"]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.backgroundPattern}>
        {[...Array(6)].map((_, i) => (
          <View
            key={i}
            style={[
              styles.patternLine,
              { top: height * 0.1 + i * 120, opacity: 0.03 + i * 0.01 },
            ]}
          />
        ))}
      </View>

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: fadeAnim,
                transform: [{ scale: logoScale }],
              },
            ]}
          >
            <View style={styles.logoRing}>
              <View style={styles.logoInner}>
                <Sparkles size={40} color={Colors.gold[400]} />
              </View>
            </View>
          </Animated.View>

          <Animated.View
            style={[
              styles.textContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.brandName}>DRESSYA</Text>
            <View style={styles.taglineContainer}>
              <View style={styles.taglineLine} />
              <Text style={styles.tagline}>YOUR PERSONAL STYLIST</Text>
              <View style={styles.taglineLine} />
            </View>
            <Text style={styles.description}>
              Curate your wardrobe. Get AI-powered outfit suggestions.{"\n"}
              Dress impeccably for every occasion.
            </Text>
          </Animated.View>
        </View>

        <Animated.View
          style={[
            styles.bottomContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push("/signup")}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[Colors.gold[400], Colors.gold[500]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.primaryButtonText}>CREATE ACCOUNT</Text>
              <ArrowRight size={18} color={Colors.richBlack} />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push("/login" as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>
              ALREADY HAVE AN ACCOUNT?{" "}
              <Text style={styles.signInText}>SIGN IN</Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.richBlack,
  },
  backgroundPattern: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  patternLine: {
    position: "absolute",
    left: -50,
    right: -50,
    height: 1,
    backgroundColor: Colors.gold[400],
    transform: [{ rotate: "-15deg" }],
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  logoContainer: {
    marginBottom: 48,
  },
  logoRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: Colors.gold[300],
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(212, 175, 55, 0.05)",
  },
  logoInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.gray[50],
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.gray[100],
  },
  textContainer: {
    alignItems: "center",
  },
  brandName: {
    fontSize: 42,
    fontWeight: "200",
    color: Colors.white,
    letterSpacing: 12,
    marginBottom: 16,
    fontFamily: Platform.OS === "ios" ? "Helvetica Neue" : "sans-serif-light",
  },
  taglineContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 32,
  },
  taglineLine: {
    width: 24,
    height: 1,
    backgroundColor: Colors.gold[400],
  },
  tagline: {
    fontSize: 11,
    color: Colors.gold[400],
    letterSpacing: 3,
    fontWeight: "600",
  },
  description: {
    fontSize: 14,
    color: Colors.gray[500],
    textAlign: "center",
    lineHeight: 24,
    letterSpacing: 0.5,
  },
  bottomContainer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  primaryButton: {
    marginBottom: 20,
    shadowColor: Colors.gold[400],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 18,
    borderRadius: 0,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.richBlack,
    letterSpacing: 2,
  },
  secondaryButton: {
    alignItems: "center",
    paddingVertical: 16,
  },
  secondaryButtonText: {
    fontSize: 12,
    color: Colors.gray[500],
    letterSpacing: 1,
  },
  signInText: {
    color: Colors.gold[400],
    fontWeight: "600",
  },
});
