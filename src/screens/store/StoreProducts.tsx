import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { useIsFocused } from '@react-navigation/native';
import { KeyboardAwareFlatList } from 'react-native-keyboard-aware-scroll-view';

import api from '../../services/api';
import { Product } from '../../types/Product';

/* =====================
   TYPES
===================== */
type ImageFile = {
  uri: string;
  name: string;
  type: string;
};

type Category = {
  id: number;
  name: string;
};

const IMAGE_BASE_URL = 'https://apideliverylivre.com.br/storage/';

export default function StoreProducts() {
  const isFocused = useIsFocused();

  /* =====================
     STATES
  ===================== */
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [status, setStatus] = useState<'ativo' | 'em_falta' | 'oculto'>('ativo');

  const [selectedCategory, setSelectedCategory] = useState<number>(0);
  const [newCategory, setNewCategory] = useState('');

  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [images, setImages] = useState<ImageFile[]>([]);

  const [editingId, setEditingId] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  /* =====================
     LOADERS
  ===================== */
  const loadProducts = async () => {
    setLoading(true);
    const res = await api.get('/products');
    setProducts(res.data || []);
    setLoading(false);
  };

  const loadCategories = async () => {
    const token = await AsyncStorage.getItem('@token');
    if (!token) return;

    const res = await api.get('/categories', {
      headers: { Authorization: `Bearer ${token}` },
    });
    setCategories(res.data);
  };

  useEffect(() => {
    if (isFocused) {
      loadProducts();
      loadCategories();
    }
  }, [isFocused]);

  /* =====================
     IMAGE PICKER
  ===================== */
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (result.canceled) return;

    const asset = result.assets[0];

    setImages(prev => [
      ...prev,
      {
        uri: asset.uri,
        name: asset.fileName || `photo_${Date.now()}.jpg`,
        type: asset.type || 'image/jpeg',
      },
    ]);
  };

  /* =====================
     RESET
  ===================== */
  const resetForm = () => {
    setName('');
    setDescription('');
    setPrice('');
    setStock('');
    setStatus('ativo');
    setSelectedCategory(0);
    setNewCategory('');
    setImages([]);
    setExistingImages([]);
    setEditingId(null);
  };

  /* =====================
     SAVE
  ===================== */
  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'Nome é obrigatório');
      return;
    }

    const token = await AsyncStorage.getItem('@token');
    if (!token) return;

    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('price', price);
    formData.append('stock_quantity', stock);
    formData.append('status', status);

    if (newCategory.trim()) {
      formData.append('category', newCategory.trim());
    } else if (selectedCategory > 0) {
      formData.append('category_id', String(selectedCategory));
    }

    existingImages.forEach(img =>
      formData.append('existing_images[]', img)
    );

    images.forEach(img =>
      formData.append(
        'images[]',
        {
          uri: img.uri,
          name: img.name,
          type: img.type,
        } as any
      )
    );

    setSaving(true);

    try {
      if (editingId) {
        await api.post(`/products/${editingId}?_method=PUT`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        await api.post('/products', formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      resetForm();
      loadProducts();
      loadCategories();
    } catch {
      Alert.alert('Erro', 'Erro ao salvar produto');
    } finally {
      setSaving(false);
    }
  };

  /* =====================
     EDIT / DELETE
  ===================== */
  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setName(product.name);
    setDescription(product.description || '');
    setPrice(String(product.price));
    setStock(String(product.stock_quantity));
    setStatus(product.status);

    setSelectedCategory(product.category_id ?? 0);
    setNewCategory('');

    setExistingImages(product.images.map(i => i.image_path));
    setImages([]);
  };

  const handleDeleteProduct = (id: number) => {
    Alert.alert(
      'Excluir produto',
      'Tem certeza que deseja excluir este produto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            const token = await AsyncStorage.getItem('@token');
            if (!token) return;

            try {
              setLoading(true);

              await api.delete(`/products/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });

              setProducts(prev => prev.filter(p => p.id !== id));

              if (editingId === id) {
                resetForm();
              }
            } catch {
              Alert.alert('Erro', 'Erro ao excluir produto');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  /* =====================
     RENDER
  ===================== */
  return (
    <KeyboardAwareFlatList
      data={products}
      keyExtractor={item => item.id.toString()}
      enableOnAndroid
      keyboardOpeningTime={0}
      extraScrollHeight={120}
      contentContainerStyle={{ paddingBottom: 200 }}
      ListHeaderComponent={
        <View style={styles.card}>
          <Text style={styles.title}>
            {editingId ? 'Editar Produto' : 'Novo Produto'}
          </Text>

          <TextInput style={styles.input} placeholder="Nome" value={name} onChangeText={setName} />
          <TextInput style={styles.input} placeholder="Descrição" value={description} onChangeText={setDescription} />
          <TextInput style={styles.input} placeholder="Preço" keyboardType="numeric" value={price} onChangeText={setPrice} />
          <TextInput style={styles.input} placeholder="Estoque" keyboardType="numeric" value={stock} onChangeText={setStock} />

          <Picker selectedValue={status} onValueChange={setStatus}>
            <Picker.Item label="Ativo" value="ativo" />
            <Picker.Item label="Em falta" value="em_falta" />
            <Picker.Item label="Oculto" value="oculto" />
          </Picker>

          <Picker selectedValue={selectedCategory} onValueChange={setSelectedCategory}>
            <Picker.Item label="Selecione uma categoria" value={0} />
            {categories.map(cat => (
              <Picker.Item key={cat.id} label={cat.name} value={cat.id} />
            ))}
          </Picker>

          {selectedCategory === 0 && (
            <TextInput
              style={styles.input}
              placeholder="Nova categoria"
              value={newCategory}
              onChangeText={setNewCategory}
            />
          )}

          <View style={styles.imageRow}>
            {existingImages.map((img, i) => (
              <View key={i} style={styles.imageBox}>
                <Image source={{ uri: IMAGE_BASE_URL + img }} style={styles.image} />

                {editingId && (
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() =>
                      setExistingImages(prev =>
                        prev.filter((_, idx) => idx !== i)
                      )
                    }
                  >
                    <Text style={styles.removeText}>X</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {images.map((img, i) => (
              <View key={`new-${i}`} style={styles.imageBox}>
                <Image source={{ uri: img.uri }} style={styles.image} />

                {editingId && (
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() =>
                      setImages(prev =>
                        prev.filter((_, idx) => idx !== i)
                      )
                    }
                  >
                    <Text style={styles.removeText}>X</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.imageBtn} onPress={pickImage}>
            <Text>Selecionar imagem</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff' }}>Salvar</Text>}
          </TouchableOpacity>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.productCard}>
          {item.images?.[0] && (
            <Image
              source={{ uri: IMAGE_BASE_URL + item.images[0].image_path }}
              style={styles.listImage}
            />
          )}

          <Text style={styles.productName}>{item.name}</Text>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.editBtn} onPress={() => handleEdit(item)}>
              <Text style={styles.actionText}>Editar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteProduct(item.id)}>
              <Text style={styles.actionText}>Excluir</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    />
  );
}

/* =====================
   STYLES
===================== */
const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', padding: 16, margin: 16, borderRadius: 10 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 10, marginTop: 8 },
  imageBtn: { marginTop: 10, padding: 10, borderWidth: 1, borderColor: '#ccc', borderRadius: 6, alignItems: 'center' },
  saveBtn: { marginTop: 16, backgroundColor: '#28a745', padding: 14, borderRadius: 8, alignItems: 'center' },

  imageRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  imageBox: { position: 'relative', marginRight: 8, marginBottom: 8 },
  image: { width: 90, height: 90, borderRadius: 6 },

  removeBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'red',
    borderRadius: 10,
    paddingHorizontal: 6,
  },
  removeText: { color: '#fff', fontWeight: 'bold' },

  productCard: { backgroundColor: '#fff', margin: 16, padding: 12, borderRadius: 8 },
  listImage: { width: '100%', height: 160, borderRadius: 8, marginBottom: 8 },
  productName: { fontWeight: 'bold', fontSize: 16 },

  actions: { flexDirection: 'row', marginTop: 10 },
  editBtn: { backgroundColor: '#007bff', padding: 8, borderRadius: 6, marginRight: 6, flex: 1 },
  deleteBtn: { backgroundColor: '#dc3545', padding: 8, borderRadius: 6, flex: 1 },
  actionText: { color: '#fff', textAlign: 'center' },

  loaderOverlay: {
    position: 'absolute',
    zIndex: 999,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});