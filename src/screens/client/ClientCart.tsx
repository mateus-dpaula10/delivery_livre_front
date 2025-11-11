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
  StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';
import { useIsFocused } from '@react-navigation/native';

type ProductImage = { id: number; product_id: number; image_path: string };
type ProductVariation = { id: number; type: string; value: string };
type Product = {
  id: number;
  name: string;
  description?: string;
  price: number;
  stock_quantity: number;
  company_id: number;
  images: ProductImage[];
};

type CartItem = {
  id: number;
  product: Product;
  quantity: number;
  price: number;
  subtotal: number;
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
  complement?: string;
  note?: string;
};

type Company = {
  id: number;
  legal_name: string;
  final_name: string;
  cnpj: string;
  phone: string;
  address: string;
  plan: string | null;
  active: boolean;
  email: string;
  category: string | null;
  status: string | null;
  logo: string | null;
  delivery_fee: number;
  delivery_radius: number;
  opening_hours: string | null;
  free_shipping: boolean;
  first_purchase_discount_store: boolean;
  first_purchase_discount_store_value: number | null;
  first_purchase_discount_app: boolean;
  first_purchase_discount_app_value: number | null;
  created_at?: string;
  updated_at?: string;
};

export default function ClientCart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const isFocused = useIsFocused();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [deliveryInfo, setDeliveryInfo] = useState<{ fee: number; distance: number } | null>(null);
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState<string | null>(null);

  useEffect(() => {
    if (isFocused) {
      fetchCart();
      fetchAddresses();
    } 
  }, [isFocused]);

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
    } catch (err) {
      console.error('Erro ao carregar carrinho:', err);
      Alert.alert('Erro', 'Não foi possível carregar o carrinho');
    }
  };

  const calculateDelivery = async (address: Address) => {
    if (!address || !company || !cart.length) return;

    try {
      if (company?.free_shipping) {
        setDeliveryInfo({ fee: 0, distance: 0 });
        return;
      }

      const token = await AsyncStorage.getItem('@token');
      if (!token) return;

      const { data } = await api.post(
        '/delivery/calc',
        {
          address: `${address.street}, ${address.number || ''} - ${address.neighborhood}, ${address.city} - ${address.state}, ${address.cep}`,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setDeliveryInfo({ fee: data.fee, distance: data.distance });
    } catch (err) {
      console.error('Erro ao calcular frete:', err);
      setDeliveryInfo(null);
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
    } catch (err) {
      console.error('Erro ao buscar endereços:', err);
    }
  };

  const removeItem = async (itemId: number) => {
    try {
      const token = await AsyncStorage.getItem('@token');
      await api.delete(`/cart/items/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCart(prev => prev.filter(c => c.id !== itemId));
    } catch (err) {
      console.error(err);
      Alert.alert('Erro', 'Não foi possível remover o produto');
    }
  };

  const incrementQuantity = async (itemId: number) => {
    try {
      const token = await AsyncStorage.getItem('@token');
      await api.put(`/cart/items/${itemId}/increment`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchCart();
    } catch (err) {
      console.error('Erro ao aumentar quantidade:', err);
    }
  };

  const decrementQuantity = async (itemId: number) => {
    try {
      const token = await AsyncStorage.getItem('@token');
      await api.put(`/cart/items/${itemId}/decrement`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchCart();
    } catch (err) {
      console.error('Erro ao diminuir quantidade:', err);
    }
  };

  const getTotal = () => {
    const itemsTotal = cart.reduce((sum, item) => sum + item.subtotal, 0);

    let discountAmount = 0;
    if (company) {
      if (company.first_purchase_discount_store) {
        discountAmount = itemsTotal * ((company.first_purchase_discount_store_value || 0) / 100);
      } else if (company.first_purchase_discount_app) {
        discountAmount = itemsTotal * ((company.first_purchase_discount_app_value || 0) / 100);
      }
    }

    const fee = deliveryInfo ? deliveryInfo.fee : 0;

    const total = itemsTotal - discountAmount + fee;
    return total;
  };

  const checkout = async () => {
    if (!cart.length) return Alert.alert('Aviso', 'Seu carrinho está vazio');

    if (!selectedAddress) return Alert.alert('Aviso', 'Selecione um endereço acima. Caso não apareça, adicione um ao seu perfil.');

    try {
      const token = await AsyncStorage.getItem('@token');
      const total = getTotal();

      await api.post(
        '/cart/checkout',
        {
          address_id: selectedAddress.id,
          total,
          items: cart.map(c => ({
            product_id: c.product.id,
            quantity: c.quantity,
            variation_ids: c.variations.map(v => v.id),
          })),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert('Sucesso', 'Pedido criado com sucesso');
      setCart([]);
    } catch (err) {
      console.error(err);
      Alert.alert('Erro', 'Erro no checkout');
    }
  };

  const CartItemCard = ({ item }: { item: CartItem }) => (
    <View style={styles.card}>
      {item.product.images?.length > 0 && (
        <Image
          source={{
            uri: `https://infrasonic-fibular-pat.ngrok-free.dev/storage/${item.product.images[0].image_path}`,
          }}
          style={styles.image}
        />
      )}

      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.productName}>{item.product.name}</Text>
          <TouchableOpacity onPress={() => removeItem(item.id)}>
            <Ionicons name="trash-outline" size={22} color="red" />
          </TouchableOpacity>
        </View>

        <Text numberOfLines={2} style={styles.description}>
          {item.product.description}
        </Text>

        {item.variation_key && (
          <Text style={styles.variationKey}>{item.variation_key}</Text>
        )}

        <Text style={styles.price}>
          R$ {Number(item.price).toFixed(2).replace('.', ',')}
        </Text>

        <View style={styles.qtyRow}>
          <TouchableOpacity
            onPress={() => decrementQuantity(item.id)}
            disabled={item.quantity <= 1}
          >
            <Ionicons
              name="remove-circle-outline"
              size={24}
              color={item.quantity <= 1 ? '#ccc' : 'gray'}
            />
          </TouchableOpacity>

          <Text style={styles.qty}>{item.quantity}</Text>

          <TouchableOpacity
            onPress={() => incrementQuantity(item.id)}
            disabled={item.quantity >= item.product.stock_quantity}
          >
            <Ionicons
              name="add-circle-outline"
              size={24}
              color={
                item.quantity >= item.product.stock_quantity ? '#ccc' : 'blue'
              }
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, padding: 16 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <Text style={styles.title}>Meu Carrinho</Text>

      {addresses.length > 0 && cart.length > 0 && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontWeight: 'bold', marginBottom: 6 }}>Selecione o endereço de entrega:</Text>
          {addresses.map(addr => (
            <TouchableOpacity
              key={addr.id}
              onPress={() => {
                setSelectedAddress(addr);
                calculateDelivery(addr);
              }}
              style={{
                padding: 10,
                borderWidth: 1,
                borderColor: selectedAddress?.id === addr.id ? '#007bff' : '#ccc',
                borderRadius: 8,
                marginBottom: 6,
              }}
            >
              <Text>{`${addr.street}, ${addr.number || ''} - ${addr.neighborhood}, ${addr.city} - ${addr.state}, ${addr.cep}`}</Text>
            </TouchableOpacity>
          ))}
          {deliveryInfo && (
            <Text style={{ marginTop: 6, fontWeight: 'bold' }}>
              {company?.free_shipping
                ? 'Frete: Grátis'
                : `Frete: R$ ${deliveryInfo.fee.toFixed(2).replace('.', ',')} (${deliveryInfo.distance.toFixed(2)} km)`
              }
            </Text>
          )}
        </View>
      )}

      {cart.length === 0 ? (
        <Text style={styles.emptyCart}>Seu carrinho está vazio</Text>
      ) : (
        <FlatList
          data={cart}
          keyExtractor={item => item.id.toString()}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => <CartItemCard item={item} />}
          ListFooterComponent={
            <View style={styles.footer}>
              <View style={styles.footerRow}>
                <Text>Subtotal: R$ {cart.reduce((s, c) => s + c.subtotal, 0).toFixed(2).replace('.', ',')}</Text>

                {discountValue > 0 && (
                  <Text style={{ color: 'green' }}>
                    🎉 {discountValue}% de desconto ({discountType === 'app' ? 'App' : 'Loja'})
                  </Text>
                )}

                {deliveryInfo && (
                  <Text>Frete: R$ {deliveryInfo.fee.toFixed(2).replace('.', ',')}</Text>
                )}

                <Text style={styles.totalLabel}>
                  Total: R$ {getTotal().toFixed(2).replace('.', ',')}
                </Text>
              </View>
              <TouchableOpacity style={styles.checkoutBtn} onPress={checkout}>
                <Text style={styles.checkoutText}>Prosseguir para pagamento</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  image: { width: 100, height: '100%', resizeMode: 'cover' },
  cardContent: { flex: 1, padding: 10 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productName: { fontWeight: 'bold', fontSize: 16 },
  description: { fontSize: 13, color: '#666', marginVertical: 4 },
  variationKey: { fontSize: 13, color: '#007bff', marginBottom: 4 },
  price: { fontSize: 14, color: '#333' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  qty: { marginHorizontal: 10, fontSize: 16, fontWeight: 'bold' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  emptyCart: { textAlign: 'center', marginTop: 40, fontSize: 16, color: '#555' },
  footer: {
    borderTopWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 16,
    marginTop: 12,
  },
  footerRow: { flexDirection: 'column', justifyContent: 'space-between', marginBottom: 12, gap: '10' },
  totalLabel: { fontWeight: 'bold', fontSize: 16 },
  totalValue: { fontWeight: 'bold', fontSize: 16 },
  checkoutBtn: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkoutText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});