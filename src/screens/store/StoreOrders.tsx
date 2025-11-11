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
  created_at: Date;
  status: string;
  total: number;
  user: { name: string };
  items: OrderItem[];
};

export default function StoreOrders() {
  const [orders, setOrders] = useState<StoreOrder[]>([]);

  const fetchOrders = async () => {
    try {
      const token = await AsyncStorage.getItem('@token');
      const response = await api.get('/orders-store', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(response.data.orders);
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

  const updateStatus = async (orderId: number, status: string) => {
    try {
      const token = await AsyncStorage.getItem('@token');
      await api.patch(
        `/orders-store/${orderId}/status`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert('Sucesso', 'Pedido marcado como em processamento');
      fetchOrders();
    } catch (err: any) {
      console.log(err);
      const message =
        err.response?.data?.message || 'Não foi possível atualizar o status do pedido';
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

  const renderOrderItem = ({ item }: { item: OrderItem }) => (
    <View style={styles.itemContainer}>
      {item.product.images?.[0] && (
        <Image
          source={{
            uri: `https://infrasonic-fibular-pat.ngrok-free.dev/storage/${item.product.images[0].image_path}`,
          }}
          style={styles.itemImage}
          resizeMode="cover"
        />
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

  const renderOrder = ({ item }: { item: StoreOrder }) => (
    <View style={styles.orderContainer}>
      <Text style={styles.orderHeader}>
        Pedido: {item.code} | Status: {getStatusLabel(item.status)}{'\n'}
        Cliente: {item.user.name}{'\n'}
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

      {['awaiting_confirmation', 'pending_payment', 'processing'].includes(item.status) && (
        <TouchableOpacity
          style={styles.button}
          onPress={() => 
            updateStatus(
              item.id, 
              item.status === 'processing' ? 'ready_for_pickup' : 'processing'
            )
          }
        >
          <Text style={styles.buttonText}>
            {item.status === 'processing'
              ? 'Marcar como pronto para retirada'
              : 'Confirmar pedido'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

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
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
  },
});