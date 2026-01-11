import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';
import { useIsFocused } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';

type ProductImage = {
  id: number;
  product_id: number;
  image_path: string;
};

type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
  stock_quantity: number;
  company_id: number;
  images: ProductImage[];
};

type OrderItem = {
  id: number;
  product: Product;
  quantity: number;
  price: string | number;
};

type StoreOrder = {
  id: number;
  code: string;
  created_at: string;
  status: string;
  payment_status?: string | null;
  total: number;
  user: { name: string };
  items: OrderItem[];
};

export default function StoreOrders() {
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [statusSelections, setStatusSelections] = useState<Record<number, string>>({});
  const apiBase = api.defaults.baseURL
    ? api.defaults.baseURL.replace(/\/api\/?$/, '')
    : '';
  const buildImageUrl = (path?: string) => (path ? `${apiBase}/storage/${path}` : '');
  const statusOptions = [
    { value: 'pending', label: 'pendente' },
    { value: 'processing', label: 'em processamento' },
    { value: 'completed', label: 'concluído' },
    { value: 'canceled', label: 'cancelado' },
    { value: 'ready_for_pickup', label: 'pronto para retirada' },
  ];

  const fetchOrders = async () => {
    try {
      const token = await AsyncStorage.getItem('@token');
      const response = await api.get('/orders-store', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const nextOrders = response.data.orders || [];
      setOrders(nextOrders);
      setStatusSelections(prev => {
        const next = { ...prev };
        nextOrders.forEach((order: StoreOrder) => {
          next[order.id] = order.status;
        });
        return next;
      });
    } catch (err) {
      console.error(err);
      Alert.alert('Erro', 'Não foi possível carregar os pedidos');
    }
  };

  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      fetchOrders();
    }
  }, [isFocused]);

  const updateStatus = async (
    orderId: number,
    currentPaymentStatus: string | null,
    nextStatus: string
  ) => {
    if (nextStatus === 'processing' && currentPaymentStatus === 'awaiting_confirmation') {
      Alert.alert(
        'Pagamento pendente',
        'Confirme o pagamento PIX antes de iniciar o processamento.'
      );
      return;
    }

    try {
      const token = await AsyncStorage.getItem('@token');
      await api.patch(
        `/orders-store/${orderId}/status`,
        { status: nextStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert('Sucesso', 'Status atualizado');
      fetchOrders();
    } catch (err: any) {
      console.log(err);
      const message =
        err.response?.data?.message || 'Não foi possível atualizar o status do pedido';
      Alert.alert('Erro', message);
    }
  };

  const confirmPixPayment = async (orderId: number, currentStatus: string) => {
    try {
      const token = await AsyncStorage.getItem('@token');
      const nextStatus = currentStatus === 'awaiting_confirmation' ? 'pending' : currentStatus;
      await api.patch(
        `/orders-store/${orderId}/status`,
        { status: nextStatus, payment_status: 'paid' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert('Sucesso', 'Pagamento PIX confirmado.');
      fetchOrders();
    } catch (err: any) {
      const message =
        err.response?.data?.message || 'Não foi possível confirmar o pagamento PIX';
      Alert.alert('Erro', message);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'pendente';
      case 'processing':
        return 'em processamento';
      case 'completed':
        return 'concluído';
      case 'canceled':
        return 'cancelado';
      case 'ready_for_pickup':
        return 'pronto para retirada';
      case 'awaiting_confirmation':
        return 'aguardando confirmação do pagamento (PIX)';
      case 'pending_payment':
        return 'aguardando pagamento na retirada';
      default:
        return status;
    }
  };

  const getPaymentLabel = (status: string) => {
    switch (status) {
      case 'awaiting_confirmation':
        return 'aguardando confirmação do pagamento (PIX)';
      case 'pending_payment':
        return 'pagamento na retirada';
      case 'paid':
        return 'pago';
      default:
        return status;
    }
  };

  const renderOrderItem = ({ item }: { item: OrderItem }) => (
    <View style={styles.itemContainer}>
      {item.product.images?.[0]?.image_path ? (
        <Image
          source={{
            uri: buildImageUrl(item.product.images[0].image_path),
          }}
          style={styles.itemImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.itemImagePlaceholder} />
      )}
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{item.product.name}</Text>
        <Text style={styles.itemDescription} numberOfLines={2}>
          {item.product.description}
        </Text>
        <Text style={styles.itemText}>
          Preço unitário: R$ {Number(item.price).toFixed(2).replace('.', ',')}
        </Text>
        <Text style={styles.itemText}>Quantidade: {item.quantity}</Text>
      </View>
    </View>
  );

  const renderOrder = ({ item }: { item: StoreOrder }) => {
    const selectedStatus = statusSelections[item.id] ?? item.status;
    const paymentStatus = item.payment_status
      ?? (item.status === 'awaiting_confirmation' || item.status === 'pending_payment'
        ? item.status
        : null);
    const statusDisabled = selectedStatus === item.status;
    const pixAwaitingConfirmation = paymentStatus === 'awaiting_confirmation';

    return (
      <View style={styles.orderContainer}>
        <Text style={styles.orderHeader}>
          Pedido: {item.code} | Status: {getStatusLabel(item.status)}{'\n'}
          Cliente: {item.user?.name || 'Cliente'}{'\n'}
          {paymentStatus ? `Pagamento: ${getPaymentLabel(paymentStatus)}\n` : ''}
          Data do pedido: {new Date(item.created_at).toLocaleString()}
        </Text>

        <FlatList
          data={item.items}
          keyExtractor={(i) => i.id.toString()}
          renderItem={renderOrderItem}
        />

        <Text style={styles.orderTotal}>
          Total: R$ {Number(item.total).toFixed(2).replace('.', ',')}
        </Text>

        <View style={styles.statusRow}>
          <Picker
            selectedValue={selectedStatus}
            onValueChange={(value) =>
              setStatusSelections(prev => ({ ...prev, [item.id]: value }))
            }
            style={styles.statusPicker}
            itemStyle={styles.statusPickerItem}
          >
            {statusOptions.map(option => (
              <Picker.Item
                key={option.value}
                label={option.label}
                value={option.value}
              />
            ))}
          </Picker>
          {pixAwaitingConfirmation && (
            <TouchableOpacity
              style={[styles.button, styles.pixConfirmButton]}
              onPress={() => confirmPixPayment(item.id, item.status)}
            >
              <Text style={styles.buttonText}>Confirmar PIX</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.button, statusDisabled && styles.buttonDisabled]}
            onPress={() => updateStatus(item.id, paymentStatus, selectedStatus)}
            disabled={statusDisabled}
          >
            <Text style={styles.buttonText}>Atualizar status</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Pedidos da Loja</Text>

        {orders.length === 0 ? (
          <Text style={styles.emptyText}>Nenhum pedido pendente</Text>
        ) : (
          <FlatList
            data={orders}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderOrder}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#666',
  },
  orderContainer: {
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  orderHeader: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  orderTotal: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
    marginTop: 8,
  },
  itemContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  itemImage: {
    width: 100,
    height: 100,
  },
  itemImagePlaceholder: {
    width: 100,
    height: 100,
    backgroundColor: '#f1f1f1',
  },
  itemContent: {
    flex: 1,
    padding: 10,
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 13,
    color: '#666',
  },
  itemText: {
    fontSize: 13,
    color: '#333',
    marginTop: 2,
  },
  button: {
    marginTop: 10,
    backgroundColor: '#22c55e',
    paddingVertical: 10,
    borderRadius: 8,
  },
  pixConfirmButton: {
    backgroundColor: '#f59e0b',
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
  },
  statusRow: {
    marginTop: 10,
    borderTopWidth: 1,
    borderColor: '#eee',
    paddingTop: 10,
  },
  statusPicker: {
    backgroundColor: '#f8fafc',
  },
  statusPickerItem: {
    fontSize: 14,
  },
});











