import { Tabs } from 'expo-router';
import { Home, PlusSquare, User } from 'lucide-react-native';

import Colors from '@/constants/colors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.gold[400],
        tabBarStyle: {
          backgroundColor: Colors.richBlack,
          borderTopColor: Colors.gray[100],
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Add',
          tabBarIcon: ({ color }) => <PlusSquare color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <User color={color} />,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
