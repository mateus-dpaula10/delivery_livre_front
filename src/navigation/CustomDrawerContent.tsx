import { VStack, Text, Icon } from "native-base";
import { Pressable } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { useNavigation } from "@react-navigation/native";
import { sidebarOptions } from "../data/sidebarOptions";
import { DrawerContentComponentProps, DrawerContentScrollView } from "@react-navigation/drawer";

export default function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { user, logout } = useAuth();
  const navigation = useNavigation();
  const role = user?.role || "client";
  const menuItems = sidebarOptions[role] || [];

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1, paddingVertical: 20 }}>
      <VStack space={4} px={4}>
        <Text color="gray.800" fontSize="xl" bold mb={4}>
          Menu
        </Text>

        {menuItems.map((item, idx) => (
          <Pressable key={idx} onPress={() => navigation.navigate(item.screen as never)}>
            <VStack space={1} mb={2}>
              <Icon as={item.icon} size={5} color="gray.700" />
              <Text color="gray.700">{item.label}</Text>
            </VStack>
          </Pressable>
        ))}

        <Pressable onPress={logout} style={{ marginTop: 20 }}>
          <Text color="red.500">Sair</Text>
        </Pressable>
      </VStack>
    </DrawerContentScrollView>
  );
}