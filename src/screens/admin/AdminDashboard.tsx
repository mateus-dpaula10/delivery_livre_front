import { useEffect, useState } from "react";
import api from "../../services/api";
import { Company } from "../../types/Store";
import { useIsFocused } from "@react-navigation/native";
import { Alert, Button, FlatList, Image, StyleSheet, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Banner = {
  id?: number;
  title: string;
  image_url: string;
  target_company_id?: number | null;
}

export default function AdminDashboard() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [banner, setBanner] = useState<Banner>({
    title: "",
    image_url: "",
    target_company_id: null
  });
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      loadCompanies();
      loadBanners();
    }
  }, [isFocused]);

  async function loadBanners() {
    try {
      const { data } = await api.get("/banners");
      setBanners(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erro ao carregar banners", err);
      setBanners([]);
    }
  }

  async function loadCompanies() {
    try {
      const { data } = await api.get("/companies");
      setCompanies(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erro ao carregar empresas", err);
      setCompanies([]);
    }
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) {
      setBanner((b) => ({ ...b, image_url: result.assets[0].uri }));
    }
  }

  async function handleSubmit() {
    try {
      if (!banner.title || !banner.image_url)
        return Alert.alert("Preencha título e imagem!");
      
      const token = await AsyncStorage.getItem("@token");
      if (!token) return;

      const formData = new FormData();
      formData.append("title", banner.title);
      if (banner.target_company_id)
        formData.append("target_company_id", String(banner.target_company_id));

      if (banner.id) {
        formData.append("_method", "PUT");
      }

      if (banner.image_url.startsWith("file://")) {
        const filename = banner.image_url.split("/").pop()!;
        const ext = filename.split(".").pop();
        const type = ext ? `image/${ext}` : "image/jpeg";

        formData.append("image", {
          uri: banner.image_url,
          name: filename,
          type,
        } as any);
      }

      const endpoint = banner.id
        ? `/banners/${banner.id}/update`
        : `/banners`;

      await api.post(endpoint, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      Alert.alert(
        "Sucesso",
        banner.id ? "Banner atualizado!" : "Banner criado!"
      );

      setBanner({ title: "", image_url: "", target_company_id: null });
      loadBanners();
    } catch (err: any) {
      console.error("Erro ao salvar banner:", err.response?.data || err.message);
      Alert.alert(
        "Erro",
        err.response?.data?.message || "Não foi possível salvar o banner."
      );
    }
  }

  function handleEdit(item: Banner) {
    setBanner(item);
  }

  async function handleDelete(id?: number) {
    try {
      if (!id) return;
      await api.delete(`/banners/${id}/delete`);
      Alert.alert("Sucesso", "Banner excluído!");
      loadBanners();
    } catch (err) {
      console.error("Erro ao excluir banner", err);
    }
  }

  return (
    <FlatList
      style={{ padding: 16 }}
      data={banners}
      keyExtractor={(item) => item.id?.toString() ?? Math.random().toString()}
      ListHeaderComponent={
        <>
          <Text style={styles.title}>Gerenciar Banners</Text>

          <TextInput
            style={styles.input}
            placeholder="Título do banner"
            value={banner.title}
            onChangeText={(v) => setBanner((b) => ({ ...b, title: v }))}
          />

          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={banner.target_company_id ?? "all"}
              onValueChange={(value) =>
                setBanner((b) => ({
                  ...b,
                  target_company_id: value === "all" ? null : Number(value)
                }))
              }
            >
              <Picker.Item label="Todas as lojas" value="all" />
              {companies.map((c) => (
                <Picker.Item
                  key={c.id}
                  label={c.final_name}
                  value={c.id}
                />
              ))}
            </Picker>
          </View>

          <Button title="Selecionar Imagem" onPress={pickImage} />
          {banner.image_url ? (
            <Image
              source={{ uri: banner.image_url }}
              style={{ height: 150, borderRadius: 8, marginVertical: 10 }}
              resizeMode="cover"
            />
          ) : null}

          <Button
            title={banner.id ? "Atualizar Banner" : "Cadastrar Banner"}
            onPress={handleSubmit}
          />

          <Text style={[styles.title, { marginTop: 20 }]}>
            Banners Cadastrados
          </Text>
        </>
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
          <Text>
            Loja:{" "}
            {item.target_company_id
              ? companies.find((c) => c.id === item.target_company_id)?.final_name
              : "Todas"}
          </Text>
          <Button title="Editar" onPress={() => handleEdit(item)} />
          <Button title="Excluir" color="red" onPress={() => handleDelete(item.id)} />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: "bold", marginVertical: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 8,
  },
  card: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    marginBottom: 8,
  },
  cardTitle: { fontWeight: "bold", fontSize: 16 },
});