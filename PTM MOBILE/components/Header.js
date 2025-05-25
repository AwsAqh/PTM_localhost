import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../styles/them';
import { MaterialIcons } from '@expo/vector-icons'; // Expo vector icons

export default function Header() {
  const navigation = useNavigation();

  const handleLogout = () => {
    // Remove token logic here if needed
    navigation.replace('Login');
  };

  return (
    <View style={styles.header}>
      <View style={styles.ptmTitle}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
          <Text style={styles.title}>PTM</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.headerOptions} onPress={handleLogout}>
        <MaterialIcons name="logout" size={22} color={colors.text} />
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    width: '100%',
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    height: 64,
    borderBottomWidth: 1.5,
    borderBottomColor: '#23263a',
    ...Platform.select({
      ios: {
        shadowColor: '#2196f3',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  ptmTitle: {
    paddingRight: 20,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 2,
  },
  headerOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 20,
  },
  logoutText: {
    color: colors.text,
    fontSize: 18,
    marginLeft: 6,
  },
});
