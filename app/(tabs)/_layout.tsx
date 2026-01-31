import { Tabs } from "expo-router";
import { Shirt, Plus, User } from "lucide-react-native";
import React from "react";
import { Platform, View, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";

import Colors from "@/constants/colors";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.tint,
        tabBarInactiveTintColor: Colors.gray[500],
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          borderTopWidth: 0,
          elevation: 0,
          height: Platform.OS === 'ios' ? 88 : 70,
          paddingTop: 12,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          backgroundColor: Platform.OS === 'ios' ? "transparent" : Colors.richBlack,
        },
        tabBarBackground: () => (
          Platform.OS === 'ios' ? (
            <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          ) : null
        ),
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: "600",
          letterSpacing: 1,
          textTransform: 'uppercase',
          marginTop: 4,
          fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Wardrobe",
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <View style={{ alignItems: 'center' }}>
              <Shirt size={22} color={color} strokeWidth={focused ? 1.5 : 1} />
              {focused && <View style={styles.activeDot} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: "Add",
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <View style={styles.addButtonContainer}>
              <View style={[styles.addButton, { borderColor: focused ? Colors.tint : Colors.gray[500] }]}>
                <Plus size={24} color={Colors.richBlack} strokeWidth={1.5} />
              </View>
            </View>
          ),
          tabBarLabel: () => null, // Hide label for the add button for a cleaner look
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <View style={{ alignItems: 'center' }}>
              <User size={22} color={color} strokeWidth={focused ? 1.5 : 1} />
              {focused && <View style={styles.activeDot} />}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.tint,
    marginTop: 4,
    position: 'absolute',
    bottom: -8,
  },
  addButtonContainer: {
    top: -12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.tint,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.tint,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
  },
});
