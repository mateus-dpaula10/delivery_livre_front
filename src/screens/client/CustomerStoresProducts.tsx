import React, { useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';
import { AxiosError } from 'axios';

/* =====================
   TYPES
===================== */
type ProductImage = {
  id: number;
  product_id: number;
  image_path: string;
};

type ProductVariation = {
  id: number;
  type: string;
  value: string;
};

type Category = {
  id: number;
  name: string;
};

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

type CartItem = {
  product: Product;
  quantity: number;
  selectedVariations: Record<string, ProductVariation>;
};

export default function CustomerStoresProducts({ route, navigation }: any) {
  const { store } = route.params;

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  /* =====================
     MEMOS
  ===================== */
  const categories = useMemo<Category[]>(() => {
    const map = new Map<number, Category>();
    store.products.forEach((p: Product) => {
      if (p.category) map.set(p.category.id, p.category);
    });
    return Array.from(map.values());
  }, [store.products]);

  const filteredProducts = useMemo<Product[]>(() => {
    if (!selectedCategory) return store.products;
    return store.products.filter(
      p => p.category_id === selectedCategory.id
    );
  }, [store.products, selectedCategory]);

  /* =====================
     CART HELPERS
  ===================== */
  const getVariationKey = (vars: Record<string, ProductVariation>) =>
    Object.values(vars).map(v => v.id).sort().join('-');

  const updateCart = (
    product: Product,
    delta: number,
    selectedVariations: Record<string, ProductVariation>
  ) => {
    const key = getVariationKey(selectedVariations);

    setCart(prev => {
      const existing = prev.find(
        c =>
          c.product.id === product.id &&
          getVariationKey(c.selectedVariations) === key
      );

      if (existing) {
        const newQty = existing.quantity + delta;
        if (newQty <= 0) return prev.filter(c => c !== existing);
        return prev.map(c =>
          c === existing ? { ...c, quantity: newQty } : c
        );
      }

      if (delta > 0) {
        return [...prev, { product, quantity: 1, selectedVariations }];
      }

      return prev;
    });
  };

  const addToCart = async () => {
    if (!cart.length) {
      Alert.alert('Selecione produtos');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('@token');
      await api.post(
        '/cart',
        {
          products: cart.map(c => ({
            id: c.product.id,
            quantity: c.quantity,
            variation_ids: Object.values(c.selectedVariations).map(v => v.id),
          })),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert('Produtos adicionados ao carrinho');
      setCart([]);
    } catch (err) {
      let message = 'Erro ao adicionar ao carrinho';
      if (err instanceof AxiosError) {
        message = err.response?.data?.message || message;
      }
      Alert.alert(message);
    }
  };

  /* =====================
     PRODUCT CARD
  ===================== */
  function ProductCard({ product }: { product: Product }) {
    const [selectedVariations, setSelectedVariations] = useState<
      Record<string, ProductVariation>
    >({});

    const outOfStock = product.stock_quantity <= 0;

    const variationsByType = product.variations?.reduce((acc, v) => {
      if (!acc[v.type]) acc[v.type] = [];
      acc[v.type].push(v);
      return acc;
    }, {} as Record<string, ProductVariation[]>);

    const allVariationsSelected = variationsByType
      ? Object.keys(variationsByType).every(
          type => selectedVariations[type]
        )
      : true;

    const cartItem = cart.find(
      c =>
        c.product.id === product.id &&
        getVariationKey(c.selectedVariations) ===
          getVariationKey(selectedVariations)
    );

    const quantity = cartItem?.quantity || 0;

    return (
      <View style={styles.card}>
        {product.images.length > 0 && (
          <Image
            source={{
              uri: `https://apideliverylivre.com.br/storage/${product.images[0].image_path}`,
            }}
            style={styles.image}
          />
        )}

        <View style={styles.cardContent}>
          <Text style={styles.title}>{product.name}</Text>

          {product.description && (
            <Text style={styles.description}>
              {product.description}
            </Text>
          )}

          <Text style={styles.price}>
            R$ {Number(product.price).toFixed(2).replace('.', ',')}
          </Text>

          {variationsByType &&
            Object.entries(variationsByType).map(([type, vars]) => (
              <View key={type} style={{ marginTop: 8 }}>
                <Text style={styles.variationLabel}>{type}</Text>
                <View style={styles.variationRow}>
                  {vars.map(v => (
                    <TouchableOpacity
                      key={v.id}
                      style={[
                        styles.variationBtn,
                        selectedVariations[type]?.id === v.id &&
                          styles.variationBtnActive,
                      ]}
                      onPress={() =>
                        setSelectedVariations(prev => ({
                          ...prev,
                          [type]: v,
                        }))
                      }
                    >
                      <Text
                        style={
                          selectedVariations[type]?.id === v.id
                            ? styles.variationTextActive
                            : styles.variationText
                        }
                      >
                        {v.value}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}

          {!outOfStock && allVariationsSelected && (
            <View style={styles.qtyRow}>
              <TouchableOpacity
                onPress={() =>
                  updateCart(product, -1, selectedVariations)
                }
              >
                <Ionicons name="remove-circle-outline" size={26} />
              </TouchableOpacity>

              <Text style={styles.qty}>{quantity}</Text>

              <TouchableOpacity
                onPress={() =>
                  updateCart(product, 1, selectedVariations)
                }
              >
                <Ionicons name="add-circle-outline" size={26} />
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            disabled={!allVariationsSelected || outOfStock}
            onPress={() =>
              updateCart(product, 1, selectedVariations)
            }
            style={[
              styles.addBtn,
              (!allVariationsSelected || outOfStock) &&
                styles.addBtnDisabled,
            ]}
          >
            <Text style={styles.addBtnText}>
              {outOfStock ? 'Indisponível' : 'Adicionar'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  /* =====================
     RENDER
  ===================== */
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <FlatList
        data={filteredProducts}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => <ProductCard product={item} />}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}
        ListHeaderComponent={
          <View style={styles.header}>
            {/* 🔙 VOLTAR PARA STORES BY CATEGORY */}
            <View style={styles.headerTop}>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate(
                    'CustomerStoresByCategory',
                    { category: store.category }
                  )
                }
              >
                <Ionicons name="chevron-back" size={28} />
              </TouchableOpacity>

              <Text style={styles.storeTitle}>
                {store.final_name}
              </Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[
                  styles.chip,
                  !selectedCategory && styles.chipActive,
                ]}
                onPress={() => setSelectedCategory(null)}
              >
                <Text
                  style={
                    !selectedCategory
                      ? styles.chipTextActive
                      : styles.chipText
                  }
                >
                  Todos
                </Text>
              </TouchableOpacity>

              {categories.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.chip,
                    selectedCategory?.id === cat.id &&
                      styles.chipActive,
                  ]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text
                    style={
                      selectedCategory?.id === cat.id
                        ? styles.chipTextActive
                        : styles.chipText
                    }
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        }
        ListFooterComponent={
          cart.length > 0 ? (
            <TouchableOpacity
              style={styles.footerBtn}
              onPress={addToCart}
            >
              <Text style={styles.footerBtnText}>
                Adicionar{' '}
                {cart.reduce((s, i) => s + i.quantity, 0)} item(s)
              </Text>
            </TouchableOpacity>
          ) : null
        }
      />
    </KeyboardAvoidingView>
  );
}

/* =====================
   STYLES
===================== */
const styles = StyleSheet.create({
  header: { padding: 16 },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  storeTitle: { fontSize: 20, fontWeight: 'bold' },

  chip: {
    borderWidth: 1,
    borderColor: '#007bff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
  },
  chipActive: { backgroundColor: '#007bff' },
  chipText: { color: '#007bff' },
  chipTextActive: { color: '#fff', fontWeight: 'bold' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 8,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 180,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  cardContent: { padding: 12 },

  title: { fontSize: 16, fontWeight: 'bold' },
  description: { fontSize: 13, color: '#666', marginVertical: 4 },
  price: { fontSize: 15, fontWeight: 'bold', marginVertical: 6 },

  variationLabel: { fontWeight: 'bold', marginBottom: 4 },
  variationRow: { flexDirection: 'row', flexWrap: 'wrap' },
  variationBtn: {
    borderWidth: 1,
    borderColor: '#007bff',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
  },
  variationBtnActive: { backgroundColor: '#007bff' },
  variationText: { color: '#007bff' },
  variationTextActive: { color: '#fff' },

  qtyRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  qty: { marginHorizontal: 12, fontSize: 16 },

  addBtn: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  addBtnDisabled: { backgroundColor: '#ccc' },
  addBtnText: { color: '#fff', fontWeight: 'bold' },

  footerBtn: {
    backgroundColor: '#007bff',
    margin: 16,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  footerBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
