import { useEffect, useState } from "react";
import api from "../../services/api";
import { Company } from "../../types/Store";
import { useIsFocused } from "@react-navigation/native";
import { Alert, Button, FlatList, Image, Share, StyleSheet, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Banner = {
  id?: number;
  title: string;
  image_url: string;
  target_company_id?: number | null;
}

export default function StoreDashboard() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      loadBanners();
    }
  }, [isFocused]);

  async function loadBanners() {
    try {
      const { data } = await api.get("/banners-company");
      setBanners(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erro ao carregar banners", err);
      setBanners([]);
    }
  }

  async function handleShare(banner: Banner) {
    try {
      await Share.share({
        message: `Confira nosso banner: ${banner.title}\n${banner.image_url}`,
      });
    } catch (error) {
      Alert.alert("Erro", "Não foi possível compartilhar o banner.");
    }
  }

  return (
    <FlatList
      style={{ padding: 16 }}
      data={banners}
      keyExtractor={(item) => item.id?.toString() ?? Math.random().toString()}
      ListHeaderComponent={
        <Text style={styles.title}>Banners disponíveis para sua loja</Text>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          {item.image_url ? (
            <Image
              source={{ uri: item.image_url }}
              style={{ height: 100, borderRadius: 6, marginBottom: 8 }}
              resizeMode="cover"
            />
          ) : null}
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.scopeText}>
            {item.target_company_id
              ? "Exclusivo da sua loja"
              : "Disponível para todas as lojas"}
          </Text>
          <Button
            title="Compartilhar"
            onPress={() => handleShare(item)}
            color="#007AFF"
          />
        </View>
      )}
      ListEmptyComponent={
        <Text style={{ textAlign: "center", marginTop: 20 }}>
          Nenhum banner disponível.
        </Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  title: { 
    fontSize: 18, 
    fontWeight: "bold", 
    marginVertical: 8 
  },
  card: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  scopeText: {
    color: "#555",
    marginBottom: 8,
  },
});