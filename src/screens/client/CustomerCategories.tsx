import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Keyboard,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

type RootStackParamList = {
  CustomerCategories: undefined;
  CustomerStoresByCategory: {
    category?: string;
    search?: string;
  };
};

type Props = NativeStackScreenProps<
  RootStackParamList,
  'CustomerCategories'
>;

const categories = [
  { name: 'Supermercado', image: 'https://apideliverylivre.com.br/categories/supermercado.jpg' },
  { name: 'Padaria', image: 'https://apideliverylivre.com.br/categories/padaria.jpg' },
  { name: 'Restaurante', image: 'https://apideliverylivre.com.br/categories/restaurante.jpg' },
  { name: 'Bebidas', image: 'https://apideliverylivre.com.br/categories/bebidas.jpg' },
  { name: 'Hortifruti', image: 'https://apideliverylivre.com.br/categories/hortifruti.jpg' },
  { name: 'Água e Gás', image: 'https://apideliverylivre.com.br/categories/agua_gas.jpg' },
  { name: 'Lanchonete', image: 'https://apideliverylivre.com.br/categories/lanchonete.jpg' },
  { name: 'Açougue', image: 'https://apideliverylivre.com.br/categories/acougue.jpg' },
  { name: 'Frios', image: 'https://apideliverylivre.com.br/categories/frios.jpg' },
  { name: 'Variedades', image: 'https://apideliverylivre.com.br/categories/variedades.jpg' },
  { name: 'Naturais', image: 'https://apideliverylivre.com.br/categories/naturais.jpg' },
  { name: 'Açaí', image: 'https://apideliverylivre.com.br/categories/acai.jpg' },
  { name: 'Gelados', image: 'https://apideliverylivre.com.br/categories/gelados.jpg' },
  { name: 'Pizzaria', image: 'https://apideliverylivre.com.br/categories/pizzaria.jpg' },
  { name: 'Comidas Orientais', image: 'https://apideliverylivre.com.br/categories/comidas_orientais.jpg' },
];

export default function CustomerCategories({ navigation }: Props) {
  const [search, setSearch] = useState('');

  const handleSearch = () => {
    if (!search.trim()) return;

    Keyboard.dismiss();

    navigation.navigate('CustomerStoresByCategory', {
      search: search.trim(),
    });
  };

  return (
    <FlatList
      data={categories}
      keyExtractor={item => item.name}
      numColumns={2}
      columnWrapperStyle={{ justifyContent: 'space-between' }}
      contentContainerStyle={{ padding: 16 }}
      ListHeaderComponent={
        <View>
          <Text style={styles.title}>Categorias</Text>

          {/* 🔍 BUSCA POR LOJA OU PRODUTO */}
          <TextInput
            placeholder="Buscar loja ou produto"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            style={styles.searchInput}
          />
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() =>
            navigation.navigate('CustomerStoresByCategory', {
              category: item.name,
            })
          }
        >
          <Image source={{ uri: item.image }} style={styles.image} />
          <Text style={styles.text}>{item.name}</Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
  },

  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    backgroundColor: '#fff',
  },

  card: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    alignItems: 'center',
  },

  image: {
    width: '100%',
    height: 100,
    borderRadius: 12,
    marginBottom: 6,
  },

  text: {
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
});