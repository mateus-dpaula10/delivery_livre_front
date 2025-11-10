import React from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { useNavigation } from "@react-navigation/native";
import { sidebarOptions } from "../data/sidebarOptions";
import { DrawerContentComponentProps } from "@react-navigation/drawer";
import { Feather } from '@expo/vector-icons'; // ou lucide-react-native

export default function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { user, logout } = useAuth();
  const navigation = useNavigation();
  const role = user?.role || "client";
  const menuItems = sidebarOptions[role] || [];

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, paddingVertical: 20 }}>
      <View style={styles.container}>
        <Text style={styles.title}>Menu</Text>

        {menuItems.map((item, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.menuItem}
            onPress={() => navigation.navigate(item.screen as never)}
          >
            <Feather name={item.icon} size={20} color="#333" />
            <Text style={styles.menuLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity onPress={logout} style={{ marginTop: 20 }}>
          <Text style={styles.logout}>Sair</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 16 },
  menuItem: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  menuLabel: { marginLeft: 8, fontSize: 16, color: "#333" },
  logout: { color: "red", fontSize: 16 },
});