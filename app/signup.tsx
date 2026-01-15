import { router } from "expo-router";
import { ArrowLeft, Eye, EyeOff, Mail, Lock, User } from "lucide-react-native";
import { useState } from "react";
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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";

export default function SignUpScreen() {
  const { signUp, isSigningUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSignUp = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter your name");
      return;
    }
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    try {
      await signUp(email.trim(), password);
      console.log("[SignUp] Sign up successful, navigating to profile setup");
      router.replace({
        pathname: "/profile-setup" as any,
        params: { displayName: name.trim() },
      });
    } catch (error: any) {
      console.error("[SignUp] Error:", error);
      const message = error?.message || "Failed to create account";
      Alert.alert("Sign Up Failed", message);
    }
  };

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
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ArrowLeft size={24} color={Colors.white} />
            </TouchableOpacity>

            <View style={styles.headerContainer}>
              <Text style={styles.title}>CREATE{"\n"}ACCOUNT</Text>
              <Text style={styles.subtitle}>
                Join Dressya and unlock your style potential
              </Text>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.inputContainer}>
                <View style={styles.inputIcon}>
                  <User size={20} color={Colors.gray[500]} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor={Colors.gray[500]}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputContainer}>
                <View style={styles.inputIcon}>
                  <Mail size={20} color={Colors.gray[500]} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  placeholderTextColor={Colors.gray[500]}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputContainer}>
                <View style={styles.inputIcon}>
                  <Lock size={20} color={Colors.gray[500]} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={Colors.gray[500]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff size={20} color={Colors.gray[500]} />
                  ) : (
                    <Eye size={20} color={Colors.gray[500]} />
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.inputContainer}>
                <View style={styles.inputIcon}>
                  <Lock size={20} color={Colors.gray[500]} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  placeholderTextColor={Colors.gray[500]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} color={Colors.gray[500]} />
                  ) : (
                    <Eye size={20} color={Colors.gray[500]} />
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.signUpButton, isSigningUp && styles.buttonDisabled]}
                onPress={handleSignUp}
                disabled={isSigningUp}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={[Colors.gold[400], Colors.gold[500]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.buttonGradient}
                >
                  {isSigningUp ? (
                    <ActivityIndicator color={Colors.richBlack} />
                  ) : (
                    <Text style={styles.signUpButtonText}>CONTINUE</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Already have an account?{" "}
                <Text
                  style={styles.signInLink}
                  onPress={() => router.replace("/login" as any)}
                >
                  Sign In
                </Text>
              </Text>
            </View>
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
  backButton: {
    width: 48,
    height: 48,
    justifyContent: "center",
    marginTop: 8,
  },
  headerContainer: {
    marginTop: 20,
    marginBottom: 48,
  },
  title: {
    fontSize: 36,
    fontWeight: "200",
    color: Colors.white,
    letterSpacing: 2,
    lineHeight: 44,
    marginBottom: 16,
    fontFamily: Platform.OS === "ios" ? "Helvetica Neue" : "sans-serif-light",
  },
  subtitle: {
    fontSize: 14,
    color: Colors.gray[500],
    letterSpacing: 0.5,
  },
  formContainer: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.gray[50],
    borderWidth: 1,
    borderColor: Colors.gray[100],
    height: 56,
  },
  inputIcon: {
    width: 56,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: Colors.gray[100],
  },
  input: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 16,
    fontSize: 15,
    color: Colors.white,
    letterSpacing: 0.5,
  },
  eyeButton: {
    width: 56,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
  },
  signUpButton: {
    marginTop: 16,
    shadowColor: Colors.gold[400],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonGradient: {
    height: 56,
    justifyContent: "center",
    alignItems: "center",
  },
  signUpButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.richBlack,
    letterSpacing: 2,
  },
  footer: {
    marginTop: "auto",
    paddingTop: 32,
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: Colors.gray[500],
  },
  signInLink: {
    color: Colors.gold[400],
    fontWeight: "600",
  },
});
