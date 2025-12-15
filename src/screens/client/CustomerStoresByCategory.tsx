import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

/* =====================
   TYPES
===================== */
type Store = {
  id: number;
  final_name: string;
  category: string;
  logo?: string;
  products: { id: number; name: string }[];
  opening_hours?: string;
};

type RootStackParamList = {
  CustomerStoresByCategory: {
    category?: string;
    search?: string;
  };
  CustomerStoresProducts: { store: Store };
};

type Props = NativeStackScreenProps<
  RootStackParamList,
  'CustomerStoresByCategory'
>;

/* =====================
   COMPONENT
===================== */
export default function CustomerStoresByCategory({ route, navigation }: Props) {
  const { category, search } = route.params;

  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  /* =====================
     FETCH (ONCE)
  ===================== */
  useEffect(() => {
    let mounted = true;

    const testInternet = async () => {
      try {
        const res = await fetch('https://www.google.com', { method: 'GET' });
        console.log('🌍 INTERNET OK:', res.status);
      } catch (err) {
        console.log('🚫 SEM INTERNET:', err);
      }
    };

    const testDomain = async () => {
      try {
        const res = await fetch('https://apideliverylivre.com.br', {
          method: 'GET',
        });
        console.log('🌐 DOMAIN OK:', res.status);
      } catch (err) {
        console.log('❌ DOMAIN FAIL:', err);
      }
    };

    const fetchStores = async () => {
      try {
        console.log('📡 FETCH STORES START');
        await testInternet();
        await testDomain();

        const res = await api.get('/companies-with-products');

        console.log('✅ STORES RESPONSE:', res.data);

        if (mounted) {
          setStores(res.data || []);
        }
      } catch (err: any) {
        console.log('🔥 AXIOS ERROR');
        console.log('MESSAGE:', err?.message);
        console.log('CODE:', err?.code);
        console.log('BASE URL:', err?.config?.baseURL);
        console.log('URL:', err?.config?.url);

        if (err?.response) {
          console.log('STATUS:', err.response.status);
          console.log('DATA:', err.response.data);
        } else {
          console.log('❌ SEM RESPONSE (SSL / DNS / NETWORK)');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchStores();

    return () => {
      mounted = false;
    };
  }, []);

  /* =====================
     NORMALIZE
  ===================== */
  const normalize = (text?: string) =>
    text
      ?.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  /* =====================
     FILTER
  ===================== */
  const filteredStores = useMemo(() => {
    return stores.filter(store => {
      const matchesCategory =
        !category ||
        normalize(store.category) === normalize(category);

      const matchesSearch =
        !search ||
        store.final_name
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        store.products?.some(p =>
          p.name.toLowerCase().includes(search.toLowerCase())
        );

      return matchesCategory && matchesSearch;
    });
  }, [stores, category, search]);

  const headerTitle = category
    ? category
    : search
    ? `Resultados para "${search}"`
    : 'Lojas';

  /* =====================
     RENDER
  ===================== */
  return (
    <FlatList
      data={filteredStores}
      keyExtractor={item => item.id.toString()}
      contentContainerStyle={{ padding: 16 }}
      ListHeaderComponent={
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} />
          </TouchableOpacity>
          <Text style={styles.title}>{headerTitle}</Text>
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() =>
            navigation.navigate('CustomerStoresProducts', { store: item })
          }
        >
          {item.logo && (
            <Image
              source={{
                uri: `https://apideliverylivre.com.br/storage/${item.logo.replace(
                  /^\/+/,
                  ''
                )}`,
              }}
              style={styles.logo}
            />
          )}

          <View>
            <Text style={styles.name}>{item.final_name}</Text>
            <Text style={styles.category}>{item.category}</Text>
          </View>
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        !loading ? (
          <Text style={styles.empty}>Nenhuma loja encontrada</Text>
        ) : null
      }
    />
  );
}

/* =====================
   STYLES
===================== */
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: { fontSize: 20, fontWeight: 'bold' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 12,
    marginRight: 12,
  },
  name: { fontWeight: 'bold', fontSize: 16 },
  category: { fontSize: 12, color: '#777', marginTop: 2 },
  empty: { textAlign: 'center', marginTop: 40, color: '#666' },
});
