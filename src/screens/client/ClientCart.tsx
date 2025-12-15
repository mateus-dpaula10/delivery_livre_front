import React, { useEffect, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  View,
  Text,
  Image,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';
import { useIsFocused } from '@react-navigation/native';

/* =====================
   TYPES
===================== */
type ProductImage = { id: number; product_id: number; image_path: string };
type ProductVariation = { id: number; type: string; value: string };

type Product = {
  id: number;
  name: string;
  description?: string;
  price: number | string;
  stock_quantity: number;
  company_id: number;
  images: ProductImage[];
};

type CartItem = {
  id: number;
  product: Product;
  quantity: number;
  price: number | string;
  subtotal: number | string;
  variations: ProductVariation[];
  variation_key?: string;
};

type Address = {
  id?: number;
  label: string;
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  number?: string;
};

type Company = {
  id: number;
  final_name: string;
  free_shipping: boolean;
  first_purchase_discount_store: boolean;
  first_purchase_discount_store_value: number | null;
  first_purchase_discount_app: boolean;
  first_purchase_discount_app_value: number | null;
};

/* =====================
   HELPERS
===================== */
const formatPrice = (value: any) =>
  `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`;

/* =====================
   COMPONENT
===================== */
export default function ClientCart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [deliveryInfo, setDeliveryInfo] = useState<{ fee: number; distance: number } | null>(null);
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState<'app' | 'store' | null>(null);

  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      fetchCart();
      fetchAddresses();
    }
  }, [isFocused]);

  /* =====================
     API CALLS
  ===================== */
  const fetchCart = async () => {
    try {
      const token = await AsyncStorage.getItem('@token');
      if (!token) return;

      const { data } = await api.get('/cart', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data?.cart?.items?.length) {
        setCart(data.cart.items);
        setCompany(data.company || null);

        if (data.company?.first_purchase_discount_app) {
          setDiscountValue(data.company.first_purchase_discount_app_value || 0);
          setDiscountType('app');
        } else if (data.company?.first_purchase_discount_store) {
          setDiscountValue(data.company.first_purchase_discount_store_value || 0);
          setDiscountType('store');
        } else {
          setDiscountValue(0);
          setDiscountType(null);
        }
      } else {
        setCart([]);
        setCompany(null);
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar o carrinho');
    }
  };

  const fetchAddresses = async () => {
    try {
      const token = await AsyncStorage.getItem('@token');
      if (!token) return;

      const { data } = await api.get('/clients/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      setAddresses(data.addresses || []);
      if (data.addresses?.length) {
        setSelectedAddress(data.addresses[0]);
        calculateDelivery(data.addresses[0]);
      }
    } catch {}
  };

  const calculateDelivery = async (address: Address) => {
    if (!company || !address) return;

    if (company.free_shipping) {
      setDeliveryInfo({ fee: 0, distance: 0 });
      return;
    }

    try {
      const token = await AsyncStorage.getItem('@token');
      if (!token) return;

      const { data } = await api.post(
        '/delivery/calc',
        {
          address: `${address.street}, ${address.number || ''} - ${address.neighborhood}, ${address.city}`,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setDeliveryInfo({
        fee: Number(data.fee || 0),
        distance: Number(data.distance || 0),
      });
    } catch {
      setDeliveryInfo(null);
    }
  };

  /* =====================
     CART ACTIONS
  ===================== */
  const removeItem = async (itemId: number) => {
    try {
      const token = await AsyncStorage.getItem('@token');
      await api.delete(`/cart/items/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCart(prev => prev.filter(i => i.id !== itemId));
    } catch {
      Alert.alert('Erro', 'Não foi possível remover o produto');
    }
  };

  const incrementQuantity = async (itemId: number) => {
    const token = await AsyncStorage.getItem('@token');
    await api.put(`/cart/items/${itemId}/increment`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchCart();
  };

  const decrementQuantity = async (itemId: number) => {
    const token = await AsyncStorage.getItem('@token');
    await api.put(`/cart/items/${itemId}/decrement`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchCart();
  };

  /* =====================
     TOTALS
  ===================== */
  const getItemsTotal = () =>
    cart.reduce((sum, i) => sum + Number(i.subtotal || 0), 0);

  const getTotal = () => {
    const itemsTotal = getItemsTotal();
    let discount = 0;

    if (discountValue > 0) {
      discount = itemsTotal * (discountValue / 100);
    }

    return itemsTotal - discount + Number(deliveryInfo?.fee || 0);
  };

  /* =====================
     RENDER ITEM
  ===================== */
  const CartItemCard = ({ item }: { item: CartItem }) => (
    <View style={styles.card}>
      {item.product.images?.length > 0 && (
        <Image
          source={{
            uri: `https://apideliverylivre.com.br/storage/${item.product.images[0].image_path}`,
          }}
          style={styles.image}
        />
      )}

      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.productName}>{item.product.name}</Text>
          <TouchableOpacity onPress={() => removeItem(item.id)}>
            <Ionicons name="trash-outline" size={22} color="#e53935" />
          </TouchableOpacity>
        </View>

        {item.variation_key && (
          <Text style={styles.variationKey}>{item.variation_key}</Text>
        )}

        <Text style={styles.price}>{formatPrice(item.price)}</Text>

        <View style={styles.qtyRow}>
          <TouchableOpacity
            onPress={() => decrementQuantity(item.id)}
            disabled={item.quantity <= 1}
          >
            <Ionicons
              name="remove-circle-outline"
              size={26}
              color={item.quantity <= 1 ? '#ccc' : '#555'}
            />
          </TouchableOpacity>

          <Text style={styles.qty}>{item.quantity}</Text>

          <TouchableOpacity
            onPress={() => incrementQuantity(item.id)}
            disabled={item.quantity >= item.product.stock_quantity}
          >
            <Ionicons
              name="add-circle-outline"
              size={26}
              color={item.quantity >= item.product.stock_quantity ? '#ccc' : '#007bff'}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  /* =====================
     RENDER
  ===================== */
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, padding: 16 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Text style={styles.title}>Meu Carrinho</Text>

      {cart.length === 0 ? (
        <Text style={styles.empty}>Seu carrinho está vazio</Text>
      ) : (
        <FlatList
          data={cart}
          keyExtractor={i => i.id.toString()}
          renderItem={({ item }) => <CartItemCard item={item} />}
          ListFooterComponent={
            <View style={styles.footer}>
              <Text>Subtotal: {formatPrice(getItemsTotal())}</Text>

              {discountValue > 0 && (
                <Text style={styles.discount}>
                  🎉 {discountValue}% de desconto ({discountType === 'app' ? 'App' : 'Loja'})
                </Text>
              )}

              {deliveryInfo && (
                <Text>
                  Frete: {deliveryInfo.fee === 0 ? 'Grátis' : formatPrice(deliveryInfo.fee)}
                </Text>
              )}

              <Text style={styles.total}>Total: {formatPrice(getTotal())}</Text>

              <TouchableOpacity style={styles.checkoutBtn} onPress={() => Alert.alert('Checkout')}>
                <Text style={styles.checkoutText}>Prosseguir para pagamento</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </KeyboardAvoidingView>
  );
}

/* =====================
   STYLES
===================== */
const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 16 },

  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 12,
    elevation: 2,
    overflow: 'hidden',
  },
  image: { width: 100, height: '100%' },
  cardContent: { flex: 1, padding: 10 },

  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  productName: { fontWeight: 'bold', fontSize: 16 },

  variationKey: { color: '#007bff', marginVertical: 4 },
  price: { fontWeight: 'bold', marginTop: 4 },

  qtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  qty: { marginHorizontal: 12, fontSize: 16, fontWeight: 'bold' },

  footer: { borderTopWidth: 1, borderColor: '#ddd', paddingTop: 16, marginTop: 16 },
  discount: { color: 'green', marginTop: 4 },
  total: { fontWeight: 'bold', fontSize: 18, marginVertical: 8 },

  checkoutBtn: {
    backgroundColor: '#007bff',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  checkoutText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
