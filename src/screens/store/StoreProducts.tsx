import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, FlatList, ScrollView, StyleSheet, useWindowDimensions, Platform, KeyboardAvoidingView, Alert } from 'react-native';
import LayoutWithSidebar from '../../components/LayoutWithSidebar';
import api from '../../services/api';
import { Product } from '../../types/Product';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Picker } from '@react-native-picker/picker';
import { useIsFocused } from '@react-navigation/native';

const base64toBlob = (base64: string, mime: string) => {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mime });
};

type ImageFile = {
  uri: string;
  name: string;
  type: string;
  file?: File;
};

export default function StoreProducts() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [images, setImages] = useState<ImageFile[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [status, setStatus] = useState<'ativo' | 'em_falta' | 'oculto'>('ativo');
  const [variations, setVariations] = useState<{ type: string; value: string }[]>([]);
  const [variationType, setVariationType] = useState('');
  const [variationValue, setVariationValue] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
      base64: Platform.OS === 'web' ? true : false,
    });

    if (!result.canceled) {
      const asset = result.assets[0];

      if (Platform.OS === 'web' && asset.base64) {
        const mimeType = asset.uri?.startsWith('data:') ? asset.uri.split(';')[0].replace('data:', '') : 'image/jpeg';
        const blob = base64toBlob(asset.base64, mimeType);
        const file = new File([blob], asset.fileName || `photo_${Date.now()}.jpg`, { type: mimeType });

        setImages((prev) => [
          ...prev,
          { uri: URL.createObjectURL(blob), name: file.name, type: file.type, file },
        ]);
      } else {
        let localUri = asset.uri;
        if (Platform.OS !== 'web' && asset.uri.startsWith('content://')) {
          const fileName = asset.uri.split('/').pop();
          const destPath = `${(FileSystem as any).cacheDirectory}${fileName}`;
          await (FileSystem as any).copyAsync({ from: asset.uri, to: destPath });
          localUri = destPath;
        }

        const ext = localUri.split('.').pop()?.toLowerCase() || 'jpg';
        let mimeType = 'image/jpeg';
        if (ext === 'png') mimeType = 'image/png';

        setImages((prev) => [
          ...prev,
          { uri: localUri, name: asset.fileName || `photo_${Date.now()}.${ext}`, type: mimeType },
        ]);
      }
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setPrice('');
    setStock('');
    setCategory('');
    setStatus('ativo');
    setVariations([]);
    setImages([]);
    setExistingImages([]);
    setEditingId(null);
  };

  const handleAddProduct = async () => {
    const token = await AsyncStorage.getItem('@token');
    if (!token) return;

    if (!name.trim()) {
      Alert.alert("O nome do produto é obrigatório");
      return;
    }

    if (!category.trim()) {
      Alert.alert("Selecione ou digite uma categoria");
      return;
    }

    if (!price) {
      Alert.alert("Digite um preço válido");
      return;
    }

    if (!stock || isNaN(Number(stock))) {
      Alert.alert("Digite a quantidade em estoque");
      return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('price', price);
    formData.append('stock_quantity', stock);
    formData.append('category', category);
    formData.append('status', status);

    variations.forEach((v, index) => {
      formData.append(`variations[${index}][type]`, v.type);
      formData.append(`variations[${index}][value]`, v.value);
    });

    existingImages.forEach(path => formData.append('existing_images[]', path));
    images.forEach(image => {
      if (Platform.OS === 'web' && image.file) {
        formData.append('images[]', image.file, image.name);
      } else {
        formData.append('images[]', { uri: image.uri, name: image.name, type: image.type } as any);
      }
    });

    setSaving(true);
    try {
      if (editingId) {
        const response = await api.post(`/products/${editingId}?_method=PUT`, formData, {
          headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` },
        });
        setProducts((prev) => prev.map(p => (p.id === editingId ? response.data : p)));
        Alert.alert("Produto atualizado com sucesso!");
      } else {
        const response = await api.post('/products', formData, {
          headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` },
        });
        setProducts((prev) => [...prev, response.data]);
          Alert.alert("Produto cadastrado com sucesso!");
      }
      resetForm();
    } catch (err: any) {
      console.error(err);
      Alert.alert('Erro ao cadastrar/atualizar produto. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingId(product.id);
    setName(product.name);
    setDescription(product.description);
    setPrice(String(product.price));
    setStock(String(product.stock_quantity));
    setCategory(product.category || '');
    setStatus(product.status as any || 'ativo');
    setVariations(product.variations || []);
    setExistingImages(product.images.map(img => img.image_path));
    setImages([]);
  };

  const handleDeleteProduct = async (id: number) => {
    const token = await AsyncStorage.getItem('@token');
    if (!token) return;

    try {
      await api.delete(`/products/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setProducts((prev) => prev.filter(p => p.id !== id));
      Alert.alert("Produto excluído com sucesso!");
    } catch (err) {
      console.error(err);
      Alert.alert('Erro ao excluir produto. Tente novamente.');
    }
  };

  useEffect(() => {
    if (categories.length === 1 && !category) {
      setCategory(categories[0]);
    }
  }, [categories, category])

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/products');
      if (Array.isArray(res.data)) {
        setProducts(res.data);
      } else {
        setProducts([]);
      }
    } catch (err: any) {
      Alert.alert('Aviso', 'Não foi encontrado nenhum produto no momento.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    const token = await AsyncStorage.getItem('@token');
    if (!token) return;
    try {
      const res = await api.get('/categories', { headers: { Authorization: `Bearer ${token}` } });
      setCategories(res.data.map((c: any) => c.name));
    } catch (err) {
      console.error(err);
    }
  };

  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      loadProducts();
      loadCategories();
    }
  }, [isFocused]);

  const getImageUrl = (path: string) => `https://infrasonic-fibular-pat.ngrok-free.dev/storage/${path}`;
  const { width } = useWindowDimensions();
  const numColumns = width < 500 ? 1 : width < 900 ? 2 : 3;

  return (    
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <FlatList
        style={{ padding: 16 }}
        data={products}
        numColumns={numColumns}
        columnWrapperStyle={numColumns > 1 ? { justifyContent: 'space-between' } : undefined}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={
          <>
            <Text style={styles.title}>Cadastro de produto</Text>
    
            <TextInput style={styles.input} placeholder="Nome do produto" value={name} onChangeText={setName} />
    
            <Text style={styles.label}>Categoria</Text>
            <Picker
                selectedValue={category}
                onValueChange={(value) => setCategory(value)}
                style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 4 }}
            >
                {categories.map((cat, i) => (
                    <Picker.Item key={i} label={cat} value={cat} />
                ))}
            </Picker>
    
            <TextInput
                placeholder="Ou digite nova categoria"
                value={category}
                onChangeText={setCategory}
                style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 4, padding: 8, marginTop: 4 }}
            />
    
            <Text style={styles.label}>Status</Text>
            <View style={styles.row}>
                {['ativo', 'em_falta', 'oculto'].map(opt => (
                    <TouchableOpacity key={opt} style={[styles.button, status === opt && styles.buttonSelected]} onPress={() => setStatus(opt as any)}>
                    <Text style={styles.buttonText}>{opt}</Text>
                    </TouchableOpacity>
                ))}
            </View>
    
            <Text style={styles.label}>Variações</Text>
            <View style={styles.row}>
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Tipo" value={variationType} onChangeText={setVariationType} />
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Valor" value={variationValue} onChangeText={setVariationValue} />
                <TouchableOpacity style={styles.button} onPress={() => {
                    if (variationType && variationValue) {
                    setVariations([...variations, { type: variationType, value: variationValue }]);
                    setVariationType('');
                    setVariationValue('');
                    }
                }}>
                    <Text>+</Text>
                </TouchableOpacity>
            </View>
    
            {variations.length > 0 && variations.map((v, i) => (
                <View key={i} style={styles.row}>
                    <Text>{v.type}: {v.value}</Text>
                    <TouchableOpacity onPress={() => setVariations(variations.filter((_, idx) => idx !== i))}>
                    <Text style={{ color: 'red', marginLeft: 8 }}>X</Text>
                    </TouchableOpacity>
                </View>
            ))}
    
            <TextInput style={[styles.input, { height: 60 }]} placeholder="Descrição" value={description} multiline numberOfLines={3} onChangeText={setDescription} />
            <TextInput style={styles.input} placeholder="Preço" keyboardType="numeric" value={price} onChangeText={setPrice} />
            <TextInput style={styles.input} placeholder="Estoque" keyboardType="numeric" value={stock} onChangeText={setStock} />
    
            <TouchableOpacity style={styles.button} onPress={pickImage}>
                <Text>Selecionar imagem</Text>
            </TouchableOpacity>
    
            {existingImages.map((imgPath, index) => (
                <View key={`old-${index}`} style={{ marginTop: 8, position: 'relative' }}>
                    <Image source={{ uri: getImageUrl(imgPath) }} style={{ width: 100, height: 100 }} />
                    <TouchableOpacity style={styles.deleteButton} onPress={() => setExistingImages(prev => prev.filter((_, i) => i !== index))}>
                    <Text style={{ color: 'white' }}>X</Text>
                    </TouchableOpacity>
                </View>
            ))}
    
            {images.map((img, index) => (
                <View key={`new-${index}`} style={{ marginTop: 8, position: 'relative' }}>
                    <Image source={{ uri: img.uri }} style={{ width: 100, height: 100 }} />
                    <TouchableOpacity style={styles.deleteButton} onPress={() => setImages(prev => prev.filter((_, i) => i !== index))}>
                    <Text style={{ color: 'white' }}>X</Text>
                    </TouchableOpacity>
                </View>
            ))}
    
            <TouchableOpacity style={styles.saveButton} onPress={handleAddProduct} disabled={saving}>
                <Text style={{ color: 'white' }}>Salvar produto</Text>
            </TouchableOpacity>
    
            {loading && <Text style={{ marginTop: 16 }}>Carregando produtos...</Text>}
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.productCard}>
            {item.images && item.images.length > 0 ? (
              <Image source={{ uri: getImageUrl(item.images[0].image_path) }} style={{ width: 100, height: 100 }} />
            ) : <Text>Sem imagem</Text>}
            <Text style={{ fontWeight: 'bold' }}>{item.name}</Text>
            <Text>{item.description}</Text>
            <Text>Preço: R$ {Number(item.price).toFixed(2).replace('.', ',')}</Text>
            <Text>Estoque: {item.stock_quantity}</Text>
            <Text>Categoria: {item.category}</Text>
            <Text>Status: {item.status}</Text>

            {item.variations && item.variations.length > 0 && (
              <Text>Variações: {item.variations.map(v => `${v.type}: ${v.value}`).join(', ')}</Text>
            )}

            <View style={styles.row}>
              <TouchableOpacity style={[styles.button, { backgroundColor: 'blue' }]} onPress={() => handleEditProduct(item)}>
                <Text style={{ color: 'white' }}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, { backgroundColor: 'red' }]} onPress={() => handleDeleteProduct(item.id)}>
                <Text style={{ color: 'white' }}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  label: { marginTop: 8, fontWeight: 'bold' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 4, padding: 8, marginTop: 4 },
  button: { padding: 8, borderWidth: 1, borderColor: '#ccc', borderRadius: 4, marginRight: 4, marginTop: 4 },
  buttonSelected: { backgroundColor: '#007bff', color: 'white' },
  buttonText: { color: 'black' },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 4 },
  deleteButton: { position: 'absolute', top: 0, right: 0, backgroundColor: 'red', padding: 4, borderRadius: 4 },
  saveButton: { backgroundColor: 'green', padding: 12, borderRadius: 4, alignItems: 'center', marginTop: 8 },
  productCard: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, marginVertical: 8, flex: 1 }
});