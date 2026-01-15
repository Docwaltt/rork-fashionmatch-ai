import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, router, useSegments, useRootNavigationState } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View, ActivityIndicator, StyleSheet } from "react-native";

import { WardrobeProvider } from "@/contexts/WardrobeContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { trpc, trpcClient } from "@/lib/trpc";
import Colors from "@/constants/colors";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isInitialized, isAuthenticated, hasProfile } = useAuth();
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (!isInitialized || !navigationState?.key) return;

    const inAuthGroup = segments[0] === "(tabs)";
    const inOnboarding = segments[0] === "welcome" || segments[0] === "signup" || segments[0] === "login" || segments[0] === "profile-setup";

    console.log("[AuthGate] Auth state:", { isAuthenticated, hasProfile, inAuthGroup, inOnboarding, segments });

    if (!isAuthenticated && inAuthGroup) {
      console.log("[AuthGate] Not authenticated, redirecting to welcome");
      router.replace("/welcome");
    } else if (isAuthenticated && !hasProfile && !inOnboarding) {
      console.log("[AuthGate] Authenticated but no profile, redirecting to profile-setup");
      router.replace("/profile-setup");
    } else if (isAuthenticated && hasProfile && inOnboarding) {
      console.log("[AuthGate] Authenticated with profile, redirecting to tabs");
      router.replace("/(tabs)");
    }
  }, [isInitialized, isAuthenticated, hasProfile, segments, navigationState?.key]);

  if (!isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.gold[400]} />
      </View>
    );
  }

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <AuthGate>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="login" />
        <Stack.Screen name="profile-setup" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen 
          name="styling" 
          options={{ 
            presentation: "card",
          }} 
        />
      </Stack>
    </AuthGate>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <WardrobeProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <RootLayoutNav />
            </GestureHandlerRootView>
          </WardrobeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.richBlack,
  },
});
