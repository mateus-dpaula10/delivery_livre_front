import React, { useEffect, useState } from 'react';
import {
  FlatList, KeyboardAvoidingView, Platform, View, Text, Image,
  TouchableOpacity, Alert, StyleSheet, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';
import { useIsFocused, useNavigation } from '@react-navigation/native';

/* ===================== TYPES ===================== */
type ProductImage = { id: number; image_path: string };
type ProductVariation = { id: number; type: string; value: string };

type Product = {
  id: number; name: string; description?: string;
  price: number; stock_quantity: number; company_id: number;
  images: ProductImage[];
};

type CartItem = {
  id: number; product: Product; quantity: number; price: number;
  subtotal: number; variation_key?: string; variations: ProductVariation[];
};

type Address = {
  id: number; label: string; street: string; neighborhood: string;
  city: string; state: string; number?: string;
};

type Quote = {
  subtotal: number;
  discount: number;
  discount_percent: number;
  discount_type: 'app' | 'store' | null;
  delivery_fee: number;
  total: number;
};

/* ===================== HELPERS ===================== */
const formatPrice = (v: any) => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;
const apiBase = api.defaults.baseURL ? api.defaults.baseURL.replace(/\/api\/?$/, '') : '';
const buildImageUrl = (path?: string) => (path ? `${apiBase}/storage/${path}` : '');

/* ===================== COMPONENT ===================== */
export default function ClientCart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const isFocused = useIsFocused();
  const navigation = useNavigation<any>();

  useEffect(() => {
    if (isFocused) {
      fetchCart();
      fetchAddresses();
    }
  }, [isFocused]);

  /* ===================== API ===================== */
  const fetchCart = async () => {
    const token = await AsyncStorage.getItem('@token');
    const { data } = await api.get('/cart', { headers: { Authorization: `Bearer ${token}` } });

    setCart(data?.cart?.items || []);

    if (data?.cart) {
      setQuote(prev => ({
        subtotal: data.cart.subtotal,
        discount: data.cart.discount,
        discount_percent: data.cart.discount_percent,
        discount_type: data.cart.discount_type,
        delivery_fee: prev?.delivery_fee || 0,
        total: (data.cart.subtotal - data.cart.discount) + (prev?.delivery_fee || 0)
      }));
    } else {
      setQuote(null);
      setSelectedAddress(null);
    }
  };

  const fetchAddresses = async () => {
    const token = await AsyncStorage.getItem('@token');
    const { data } = await api.get('/clients/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    setAddresses(data.addresses || []);
  };

  const calculateQuote = async (address: Address) => {
    const token = await AsyncStorage.getItem('@token');

    const { data } = await api.post('/delivery/calc', {
      address_id: address.id
    }, { headers: { Authorization: `Bearer ${token}` } });

    setQuote(prev => {
      if (!prev) return null;

      const subtotal = prev.subtotal;
      const discount = prev.discount;
      const delivery = Number(data.fee || 0);

      return {
        ...prev,
        delivery_fee: delivery,
        total: (subtotal - discount) + delivery
      };
    });
  };

  const refresh = async () => {
    await fetchCart();
    if (selectedAddress) await calculateQuote(selectedAddress);
  };

  const inc = async (id: number) => {
    const t = await AsyncStorage.getItem('@token');
    await api.put(`/cart/items/${id}/increment`, {}, { headers: { Authorization: `Bearer ${t}` } });
    refresh();
  };

  const dec = async (id: number) => {
    const t = await AsyncStorage.getItem('@token');
    await api.put(`/cart/items/${id}/decrement`, {}, { headers: { Authorization: `Bearer ${t}` } });
    refresh();
  };

  const remove = async (id: number) => {
    const t = await AsyncStorage.getItem('@token');
    await api.delete(`/cart/items/${id}`, { headers: { Authorization: `Bearer ${t}` } });
    refresh();
  };

  const handleCheckout = async () => {
    if (!selectedAddress || !quote) return Alert.alert('Endereco', 'Selecione um endereco valido');

    try {
      setCheckingOut(true);
      const token = await AsyncStorage.getItem('@token');
      await api.post('/cart/checkout', {
        address_id: selectedAddress.id,
        total: quote.total,
        items: cart.map(i => ({ product_id: i.product.id, quantity: i.quantity }))
      }, { headers: { Authorization: `Bearer ${token}` } });

      Alert.alert('Pedido criado', 'Pedido enviado com sucesso!');
      navigation.navigate('ClientOrders');
    } finally {
      setCheckingOut(false);
    }
  };

  /* ===================== UI ===================== */
  return (
    <KeyboardAvoidingView style={{ flex: 1, padding: 16 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Text style={styles.title}>Meu Carrinho</Text>

      {cart.length === 0 ? <Text style={styles.empty}>Seu carrinho esta vazio</Text> :
        <FlatList data={cart} keyExtractor={i => i.id.toString()} renderItem={({ item }) => {
          const imagePath = item.product.images[0]?.image_path;
          return (
            <View style={styles.card}>
              {imagePath ? (
                <Image source={{ uri: buildImageUrl(imagePath) }} style={styles.image} />
              ) : (
                <View style={styles.imagePlaceholder} />
              )}
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text style={styles.productName}>{item.product.name}</Text>
                  <TouchableOpacity onPress={() => remove(item.id)}>
                    <Ionicons name="trash-outline" size={22} color="#e53935" />
                  </TouchableOpacity>
                </View>
                {item.variation_key && <Text style={styles.variationKey}>{item.variation_key}</Text>}
                <Text style={styles.price}>{formatPrice(item.price)}</Text>
                <View style={styles.qtyRow}>
                  <TouchableOpacity onPress={() => dec(item.id)}><Ionicons name="remove-circle-outline" size={26} /></TouchableOpacity>
                  <Text style={styles.qty}>{item.quantity}</Text>
                  <TouchableOpacity onPress={() => inc(item.id)}><Ionicons name="add-circle-outline" size={26} color="#007bff" /></TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
          ListFooterComponent={
            <View style={styles.footer}>
              <Text style={{ fontWeight: 'bold' }}>Endereco</Text>
              {addresses.map(a => (
                <TouchableOpacity key={a.id} onPress={() => { setSelectedAddress(a); calculateQuote(a); }}
                  style={{ borderWidth: 2, borderColor: selectedAddress?.id === a.id ? '#007bff' : '#ddd', borderRadius: 8, padding: 10, marginBottom: 6 }}>
                  <Text>{a.label}</Text>
                  <Text>{a.street}, {a.number} - {a.neighborhood}</Text>
                </TouchableOpacity>
              ))}
              {quote && <>
                <Text>Subtotal: {formatPrice(quote.subtotal)}</Text>
                {quote.discount > 0 && <Text style={{ color: 'green' }}>Desconto: {quote.discount_percent}% ({quote.discount_type})</Text>}
                <Text>Frete: {quote.delivery_fee === 0 ? 'Gratis' : formatPrice(quote.delivery_fee)}</Text>
                <Text style={styles.total}>Total: {formatPrice(quote.total)}</Text>
              </>}
              <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout}>
                {checkingOut ? <ActivityIndicator color="#fff" /> : <Text style={styles.checkoutText}>Finalizar pedido</Text>}
              </TouchableOpacity>
            </View>
          } />
      }
    </KeyboardAvoidingView>
  );
}

/* ===================== STYLES ===================== */
const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  empty: { textAlign: 'center', marginTop: 40 },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 10, marginBottom: 12, elevation: 2 },
  image: { width: 100, height: '100%' },
  imagePlaceholder: { width: 100, height: '100%', backgroundColor: '#f1f1f1' },
  cardContent: { flex: 1, padding: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  productName: { fontWeight: 'bold', fontSize: 16 },
  variationKey: { color: '#007bff' },
  price: { fontWeight: 'bold' },
  footer: { borderTopWidth: 1, borderColor: '#ddd', paddingTop: 16 },
  total: { fontWeight: 'bold', fontSize: 18 },
  checkoutBtn: { backgroundColor: '#007bff', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  checkoutText: { color: '#fff', fontWeight: 'bold' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  qty: { marginHorizontal: 12, fontWeight: 'bold' }
});
