import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider } from './AuthContext';

import OtkliciScreen from './screens/OtkliciScreen';
import DajuRabotuScreen from './screens/DajuRabotuScreen';
import PoiskScreen from './screens/PoiskScreen';
import ProfileScreen from './screens/ProfileScreen';
import RegistrationScreen from './screens/RegistrationScreen';
import LoginScreen from './screens/LoginScreen';
import ChatListScreen from './screens/ChatListScreen';
import ChatScreen from './screens/ChatScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function ProfileStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{ title: 'Профиль' }}
      />
      <Stack.Screen
        name="Авторизация"
        component={LoginScreen}
        options={{ presentation: 'modal', headerShown: false }}
      />
      <Stack.Screen
        name="Регистрация"
        component={RegistrationScreen}
        options={{ presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}

function ChatStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ChatList"
        component={ChatListScreen}
        options={{ title: 'Чаты' }}
      />
      <Stack.Screen
        name="ChatConversation"
        component={ChatScreen}
      />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Отклики':
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              break;
            case 'Даю работу':
              iconName = focused ? 'briefcase' : 'briefcase-outline';
              break;
            case 'Поиск':
              iconName = focused ? 'search' : 'search-outline';
              break;
            case 'Чаты':
              iconName = focused ? 'chatbox-ellipses' : 'chatbox-ellipses-outline';
              break;
            case 'Профиль':
              iconName = focused ? 'person' : 'person-outline';
              break;
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Отклики" component={OtkliciScreen} options={{headerShown: true, title: 'Отклики'}} />
      <Tab.Screen name="Даю работу" component={DajuRabotuScreen} options={{headerShown: true, title: 'Даю работу'}}/>
      <Tab.Screen name="Поиск" component={PoiskScreen} options={{headerShown: true, title: 'Поиск'}}/>
      <Tab.Screen
        name="Чаты"
        component={ChatStack}
      />
      <Tab.Screen
        name="Профиль"
        component={ProfileStack}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <MainTabs />
      </NavigationContainer>
    </AuthProvider>
  );
}
