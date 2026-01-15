import { router } from "expo-router";
import { ArrowLeft, Eye, EyeOff, Mail, Lock } from "lucide-react-native";
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

export default function LoginScreen() {
  const { signIn, isSigningIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email");
      return;
    }
    if (!password) {
      Alert.alert("Error", "Please enter your password");
      return;
    }

    try {
      await signIn(email.trim(), password);
      console.log("[Login] Sign in successful");
      router.replace("/(tabs)");
    } catch (error: any) {
      console.error("[Login] Error:", error);
      let message = "Failed to sign in";
      if (error?.code === "auth/invalid-credential") {
        message = "Invalid email or password";
      } else if (error?.code === "auth/user-not-found") {
        message = "No account found with this email";
      } else if (error?.code === "auth/wrong-password") {
        message = "Incorrect password";
      }
      Alert.alert("Sign In Failed", message);
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
              <Text style={styles.title}>WELCOME{"\n"}BACK</Text>
              <Text style={styles.subtitle}>
                Sign in to continue styling with Dressya
              </Text>
            </View>

            <View style={styles.formContainer}>
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

              <TouchableOpacity style={styles.forgotButton}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.signInButton, isSigningIn && styles.buttonDisabled]}
                onPress={handleSignIn}
                disabled={isSigningIn}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={[Colors.gold[400], Colors.gold[500]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.buttonGradient}
                >
                  {isSigningIn ? (
                    <ActivityIndicator color={Colors.richBlack} />
                  ) : (
                    <Text style={styles.signInButtonText}>SIGN IN</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Do not have an account?{" "}
                <Text
                  style={styles.signUpLink}
                  onPress={() => router.replace("/signup")}
                >
                  Create One
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
    marginTop: 40,
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
  forgotButton: {
    alignSelf: "flex-end",
  },
  forgotText: {
    fontSize: 13,
    color: Colors.gold[400],
    letterSpacing: 0.5,
  },
  signInButton: {
    marginTop: 8,
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
  signInButtonText: {
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
  signUpLink: {
    color: Colors.gold[400],
    fontWeight: "600",
  },
});
