import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, router, useSegments, useRootNavigationState } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View, ActivityIndicator, StyleSheet, Platform } from "react-native";
import { httpBatchLink } from "@trpc/client";
import { trpc, transformer } from "@/lib/trpc";
import Constants from "expo-constants";

import { WardrobeProvider } from "@/contexts/WardrobeContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Colors from "@/constants/colors";

SplashScreen.preventAutoHideAsync();

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
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() => {
    let apiBaseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL || "";

    // Normalize URL
    if (apiBaseUrl.endsWith('/api')) {
      apiBaseUrl = apiBaseUrl.slice(0, -4);
    }
    if (apiBaseUrl.endsWith('/')) {
      apiBaseUrl = apiBaseUrl.slice(0, -1);
    }

    let trpcUrl;

    // Always prioritize window origin if available (handles Web and Web-based Simulators)
    if (typeof window !== 'undefined' && window.location && window.location.origin && !window.location.origin.includes('localhost')) {
      trpcUrl = `${window.location.origin}/api/trpc`;
      console.log("[RootLayout] Web-based environment detected. Using origin-based tRPC URL:", trpcUrl);
    } else if (Platform.OS === 'web' && typeof window !== 'undefined') {
      trpcUrl = '/api/trpc';
      console.log("[RootLayout] Local Web detected. Using relative tRPC URL:", trpcUrl);
    } else {
      // For native simulators or remote devices
      const debuggerHost = Constants.expoConfig?.hostUri;
      const localhost = debuggerHost?.split(":")[0] || "localhost";
      const apiBaseUrlFallback = `http://${localhost}:8081/api/trpc`;

      trpcUrl = apiBaseUrl ? `${apiBaseUrl}/api/trpc` : (process.env.EXPO_PUBLIC_API_URL || apiBaseUrlFallback);
      console.log("[RootLayout] Native Platform:", Platform.OS, "Host:", localhost, "URL:", trpcUrl);
    }

    console.log("[RootLayout] Initializing tRPC client with URL:", trpcUrl);

    // Safety guard to ensure the URL is valid before client creation
    let finalUrl = trpcUrl;
    try {
        if (finalUrl && !finalUrl.startsWith('http') && !finalUrl.startsWith('/')) {
            console.warn("[RootLayout] Invalid tRPC URL format, prepending protocol:", finalUrl);
            finalUrl = `https://${finalUrl}`;
        }
    } catch (e) {
        console.error("[RootLayout] URL safety guard error:", e);
    }

    return trpc.createClient({
      links: [
        httpBatchLink({
          url: finalUrl,
          transformer,
        }),
      ],
    });
  });

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
