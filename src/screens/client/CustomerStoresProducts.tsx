import React, { useState, useMemo } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';
import { AxiosError } from 'axios';

type ProductImage = { id: number; product_id: number; image_path: string };
type ProductVariation = { id: number; type: string; value: string };
type Category = { id: number; name: string };
type Product = {
  id: number;
  name: string;
  description?: string;
  price: number;
  stock_quantity: number;
  status: 'ativo' | 'em_falta' | 'oculto';
  company_id: number;
  category_id?: number;
  category?: Category;
  images: ProductImage[];
  variations?: ProductVariation[];
};
type Store = { id: number; final_name: string; products: Product[] };
type CartItem = {
  product: Product;
  quantity: number;
  selectedVariations: Record<string, ProductVariation>;
};
type SelectedVariation = ProductVariation & { quantity: number };

export default function CustomerStoresProducts({ route }: any) {
  const { store } = route.params;
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'price' | null>(null);

  const categories = useMemo(() => {
    const unique = new Map<number, Category>();
    store.products.forEach((p: any) => {
      if (p.category) unique.set(p.category.id, p.category);
    });
    return Array.from(unique.values());
  }, [store.products]);

  const filteredProducts = useMemo(() => {
    let prods = [...store.products];
    if (selectedCategory) prods = prods.filter(p => p.category_id === selectedCategory.id);
    if (sortBy === 'name') prods.sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === 'price') prods.sort((a, b) => a.price - b.price);
    return prods;
  }, [store.products, selectedCategory, sortBy]);

  const getVariationKey = (variations: Record<string, ProductVariation>) =>
    Object.values(variations)
      .sort((a, b) => a.id - b.id)
      .map(v => v.id)
      .join('-');

  const updateCart = (
    product: Product,
    delta: number,
    selectedVariations: Record<string, ProductVariation>
  ) => {
    const variationKey = getVariationKey(selectedVariations);

    setCart(prev => {
      const existing = prev.find(
        c => c.product.id === product.id && getVariationKey(c.selectedVariations) === variationKey
      );

      if (existing) {
        const newQty = existing.quantity + delta;
        if (newQty <= 0)
          return prev.filter(
            c => !(c.product.id === product.id && getVariationKey(c.selectedVariations) === variationKey)
          );
        return prev.map(c =>
          c.product.id === product.id && getVariationKey(c.selectedVariations) === variationKey
            ? { ...c, quantity: newQty }
            : c
        );
      } else if (delta > 0) {
        return [...prev, { product, quantity: delta, selectedVariations }];
      }

      return prev;
    });
  };

  const addToCart = async () => {
    if (!cart.length) return Alert.alert('Selecione produtos');

    try {
      const token = await AsyncStorage.getItem('@token');
      const companyIds = cart.map(c => c.product.company_id);
      if ([...new Set(companyIds)].length > 1)
        return Alert.alert('Só é possível adicionar produtos da mesma loja ao carrinho');

      await api.post(
        '/cart',
        {
          products: cart.map(c => ({
            id: c.product.id,
            quantity: c.quantity,
            variation_ids: Object.values(c.selectedVariations).map(v => Number(v.id)),
          })),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert('Produtos adicionados ao carrinho');
      setCart([]);
    } catch (err: unknown) {
      console.error(err);
      let message = 'Não foi possível adicionar ao carrinho';
      if (err instanceof AxiosError) message = err.response?.data?.message || message;
      Alert.alert(message);
    }
  };

  function ProductCard({ product }: { product: Product }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedVariations, setSelectedVariations] = useState<Record<string, SelectedVariation>>({});

    const outOfStock = product.stock_quantity <= 0;

    const prevImage = () =>
      setCurrentIndex(i => (i - 1 + product.images.length) % product.images.length);
    const nextImage = () =>
      setCurrentIndex(i => (i + 1) % product.images.length);

    const handleSelectVariation = (variation: ProductVariation) => {
      setSelectedVariations(prev => ({
        ...prev,
        [variation.type]: { ...variation, quantity: prev[variation.type]?.quantity || 1 },
      }));
    };

    const cartItem = cart.find(
      c => c.product.id === product.id && getVariationKey(c.selectedVariations) === getVariationKey(selectedVariations)
    );
    const quantity = cartItem?.quantity || 0;

    const variationsByType = product.variations?.reduce((acc, v) => {
      if (!acc[v.type]) acc[v.type] = [];
      acc[v.type].push(v);
      return acc;
    }, {} as Record<string, ProductVariation[]>);

    const allVariationsSelected = variationsByType
      ? Object.keys(variationsByType).every(type => selectedVariations[type])
      : true;

    return (
      <View style={styles.card}>
        {product.images.length > 0 && (
          <View style={{ position: 'relative', width: '100%', height: 200 }}>
            <Image
              source={{ uri: `https://infrasonic-fibular-pat.ngrok-free.dev/storage/${product.images[currentIndex].image_path}` }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
            <View style={styles.imageNav}>
              <TouchableOpacity onPress={prevImage}>
                <Ionicons name="chevron-back-circle" size={32} color="white" />
              </TouchableOpacity>
              <TouchableOpacity onPress={nextImage}>
                <Ionicons name="chevron-forward-circle" size={32} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ padding: 12 }}>
          <Text style={styles.title}>{product.name}</Text>
          {product.description && <Text style={styles.description}>{product.description}</Text>}
          <Text style={styles.price}>R$ {Number(product.price).toFixed(2).replace('.', ',')}</Text>

          {variationsByType &&
            Object.entries(variationsByType).map(([type, vars]) => (
              <View key={type} style={{ marginVertical: 6 }}>
                <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>{type}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {vars.map(v => (
                    <TouchableOpacity
                      key={v.id}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderWidth: 1,
                        borderColor: '#007bff',
                        borderRadius: 4,
                        marginRight: 6,
                        marginBottom: 6,
                        backgroundColor: selectedVariations[type]?.id === v.id ? '#007bff' : 'white',
                      }}
                      onPress={() => handleSelectVariation(v)}
                    >
                      <Text style={{ color: selectedVariations[type]?.id === v.id ? 'white' : '#007bff' }}>
                        {v.value}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))
          }

          {outOfStock && <Text style={styles.outOfStock}>Esgotado</Text>}

          {!outOfStock && allVariationsSelected && (
            <View style={styles.qtyRow}>
              <TouchableOpacity onPress={() => updateCart(product, -1, selectedVariations)} disabled={quantity <= 0}>
                <Text style={{ fontSize: 24, color: quantity <= 0 ? '#aaa' : 'gray' }}>−</Text>
              </TouchableOpacity>
              <Text style={{ marginHorizontal: 12, fontSize: 16 }}>{quantity}</Text>
              <TouchableOpacity
                onPress={() => updateCart(product, 1, selectedVariations)}
                disabled={quantity >= product.stock_quantity}
              >
                <Text style={{ fontSize: 24, color: quantity >= product.stock_quantity ? '#aaa' : 'blue' }}>+</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={[styles.addBtn, (!allVariationsSelected || outOfStock) && { backgroundColor: 'lightgray' }]}
            onPress={() => updateCart(product, 1, selectedVariations)}
            disabled={!allVariationsSelected || outOfStock}
          >
            <Text style={styles.addBtnText}>{outOfStock ? 'Indisponível' : 'Adicionar ao carrinho'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}>
      <FlatList
        ListHeaderComponent={
          <View style={{ marginTop: 40, paddingHorizontal: 16 }}>
            <Text style={styles.storeTitle}>{store.final_name}</Text>

            {categories.length > 0 && (
              <View style={styles.filters}>
                <Text style={styles.filterLabel}>Categorias:</Text>
                <View style={styles.filterOptions}>
                  <TouchableOpacity style={[styles.filterBtn, !selectedCategory && styles.filterBtnActive]} onPress={() => setSelectedCategory(null)}>
                    <Text style={!selectedCategory ? styles.filterTextActive : styles.filterText}>Todos</Text>
                  </TouchableOpacity>
                  {categories.map(cat => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.filterBtn, selectedCategory?.id === cat.id && styles.filterBtnActive]}
                      onPress={() => setSelectedCategory(cat)}
                    >
                      <Text style={selectedCategory?.id === cat.id ? styles.filterTextActive : styles.filterText}>{cat.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.filters}>
              <Text style={styles.filterLabel}>Ordenar por:</Text>
              <View style={styles.filterOptions}>
                <TouchableOpacity style={[styles.filterBtn, sortBy === 'name' && styles.filterBtnActive]} onPress={() => setSortBy('name')}>
                  <Text style={sortBy === 'name' ? styles.filterTextActive : styles.filterText}>Nome</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.filterBtn, sortBy === 'price' && styles.filterBtnActive]} onPress={() => setSortBy('price')}>
                  <Text style={sortBy === 'price' ? styles.filterTextActive : styles.filterText}>Preço</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        }
        data={filteredProducts}
        keyExtractor={p => p.id.toString()}
        renderItem={({ item }) => <ProductCard product={item} />}
        ListFooterComponent={
          cart.length > 0 ? (
            <TouchableOpacity style={styles.footerBtn} onPress={addToCart}>
              <Text style={styles.footerBtnText}>Adicionar {cart.reduce((sum, c) => sum + c.quantity, 0)} produto(s) ao carrinho</Text>
            </TouchableOpacity>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, backgroundColor: '#fff', margin: 8, overflow: 'hidden', elevation: 2 },
  imageNav: { position: 'absolute', top: '50%', left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8 },
  title: { fontWeight: 'bold', fontSize: 16 },
  description: { fontSize: 12, color: '#666' },
  price: { fontSize: 14, fontWeight: 'bold', marginVertical: 4 },
  outOfStock: { color: 'red', fontWeight: 'bold', marginTop: 6 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  addBtn: { backgroundColor: 'blue', padding: 10, borderRadius: 6, marginTop: 8, alignItems: 'center' },
  addBtnText: { color: 'white', fontWeight: 'bold' },
  storeTitle: { fontWeight: 'bold', fontSize: 20, marginBottom: 12 },
  filters: { marginBottom: 12 },
  filterLabel: { fontWeight: 'bold', marginBottom: 6 },
  filterOptions: { flexDirection: 'row', flexWrap: 'wrap' },
  filterBtn: { borderWidth: 1, borderColor: '#007bff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginRight: 8, marginBottom: 8 },
  filterBtnActive: { backgroundColor: '#007bff' },
  filterText: { color: '#007bff' },
  filterTextActive: { color: 'white', fontWeight: 'bold' },
  footerBtn: { backgroundColor: 'blue', margin: 16, padding: 14, borderRadius: 8, alignItems: 'center' },
  footerBtnText: { color: 'white', fontWeight: 'bold' },
});