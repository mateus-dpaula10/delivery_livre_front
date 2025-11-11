import React, { useEffect, useState } from 'react';
import { 
  View, Text, TextInput, Button, Image, StyleSheet, 
  KeyboardAvoidingView, Platform, ScrollView, Alert, TouchableOpacity, 
  FlatList,
  Switch
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';
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
  file?: File,
  isNew?: boolean
};

type OpeningHour = {
  day: string;
  open: string;
  close: string;
};

export default function StoreProfile() {
  const [name, setName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState<string>('active');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [deliveryRadius, setDeliveryRadius] = useState('');
  const [freeShipping, setFreeShipping] = useState(false);
  const [firstPurchaseDiscountStore, setFirstPurchaseDiscountStore] = useState(false);
  const [firstPurchaseDiscountStoreValue, setFirstPurchaseDiscountStoreValue] = useState<number | null>(null);
  const [firstPurchaseDiscountApp, setFirstPurchaseDiscountApp] = useState(false);
  const [firstPurchaseDiscountAppValue, setFirstPurchaseDiscountAppValue] = useState<number | null>(null);
  const [logo, setLogo] = useState<ImageFile | null>(null);
  const [openingHours, setOpeningHours] = useState<OpeningHour[]>([]);
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState('cpf');

  const categories = [
    'Supermercado',
    'Padaria',
    'Restaurante',
    'Bebidas',
    'Doces e Sobremesas',
    'Farmácia',
    'Pet Shop',
    'Moda e Acessórios',
    'Eletrônicos',
    'Casa e Decoração',
    'Saúde e Beleza',
    'Esporte e Lazer',
    'Livraria'
  ];

  const daysOfWeek = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];

  const loadCompany = async () => {
    const token = await AsyncStorage.getItem('@token');
    if (!token) return;

    try {
      const res = await api.get('/companies/me', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const company = res.data;

      setName(company.final_name || '');
      setCnpj(company.cnpj || '');
      setPhone(company.phone || '');
      setEmail(company.email || '');
      setPixKey(company.pix_key || '');
      setPixKeyType(company.pix_key_type || '');
      setAddress(company.address || '');
      setCep(company.cep || '');
      setStreet(company.street || '');
      setNumber(company.number ? String(company.number) : '');
      setNeighborhood(company.neighborhood || '');
      setCity(company.city || '');
      setState(company.state || '');
      if (company.category && categories.includes(company.category)) {
        setCategory(company.category);
      } else {
        setCategory('');
      }
      setStatus(company.status || 'active');
      setDeliveryFee(company.delivery_fee != null ? Number(company.delivery_fee).toFixed(2).replace('.', ',') : '');
      setDeliveryRadius(company.delivery_radius != null ? String(company.delivery_radius) : '');
      setFreeShipping(company.free_shipping ?? false);
      setFirstPurchaseDiscountStore(company.first_purchase_discount_store ?? false);
      setFirstPurchaseDiscountStoreValue(company.first_purchase_discount_store_value ?? '');
      setFirstPurchaseDiscountApp(company.first_purchase_discount_app ?? false);
      setFirstPurchaseDiscountAppValue(company.first_purchase_discount_app_value ?? '');

      let hours: OpeningHour[] = [];
      if (company.opening_hours) {
        if (typeof company.opening_hours === "string") {
          try {
            hours = JSON.parse(company.opening_hours);
          } catch (e) {
            console.error("Erro ao parsear opening_hours:", e);
            hours = [];
          }
        } else {
          hours = company.opening_hours;
        }
      }
      setOpeningHours(hours);

      if (company.logo) {
        setLogo({
          uri: `https://infrasonic-fibular-pat.ngrok-free.dev/storage/${company.logo}`,
          name: 'logo.jpg',
          type: 'image/jpeg',
          isNew: false
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      loadCompany();
    }
  }, [isFocused]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
      base64: Platform.OS === 'web' ? true : false,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      let uri = asset.uri;
      let name = asset.fileName || `logo_${Date.now()}.jpg`;
      let type = 'image/jpeg';

      if (Platform.OS === 'web' && asset.base64) {
        const mimeType = asset.uri?.startsWith('data:')
          ? asset.uri.split(';')[0].replace('data:', '')
          : 'image/jpeg';
        const blob = base64toBlob(asset.base64, mimeType);
        const file = new File([blob], name, { type: mimeType });
        uri = URL.createObjectURL(blob);
        type = mimeType;

        setLogo({
          uri,
          name: file.name,
          type: file.type,
          file,
          isNew: true
        });
      } else {
        if (Platform.OS !== 'web' && asset.uri.startsWith('content://')) {
          const fileName = asset.uri.split('/').pop();
          const destPath = `${(FileSystem as any).cacheDirectory}${fileName}`;
          await (FileSystem as any).copyAsync({ from: asset.uri, to: destPath });
          uri = destPath;
        }

        const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
        type = ext === 'png' ? 'image/png' : 'image/jpeg';

        setLogo({
          uri,
          name,
          type,
          isNew: true
        });
      }
    }
  };

  const handleSave = async () => {
    if (firstPurchaseDiscountStore && firstPurchaseDiscountApp) {
      Alert.alert('Erro', 'Apenas um tipo de desconto pode estar ativo por vez.');
      return;
    }

    if (firstPurchaseDiscountStore && !firstPurchaseDiscountStoreValue) {
      Alert.alert('Erro', 'Selecione o percentual para o desconto da loja.');
      return;
    }

    if (firstPurchaseDiscountApp && !firstPurchaseDiscountAppValue) {
      Alert.alert('Erro', 'Selecione o percentual para o desconto do app.');
      return;
    }

    const camposObrigatorios = [
      { label: 'Nome da loja', value: name },
      { label: 'CNPJ', value: cnpj },
      { label: 'Telefone', value: phone },
      { label: 'E-mail', value: email },
      { label: 'CEP', value: cep },
      { label: 'Rua', value: street },
      { label: 'Número', value: number },
      { label: 'Bairro', value: neighborhood },
      { label: 'Cidade', value: city },
      { label: 'Estado', value: state },
      { label: 'Tipo de chave PIX', value: pixKeyType },
      { label: 'Chave PIX', value: pixKey },
      { label: 'Categoria', value: category },
      { label: 'Status', value: status }
    ];

    for (const campo of camposObrigatorios) {
      if (!campo.value || String(campo.value).trim() === '') {
        Alert.alert('Erro', `O campo "${campo.label}" é obrigatório.`);
        return;
      }
    }

    if (!freeShipping && (!deliveryFee || !deliveryRadius)) {
      Alert.alert('Erro', 'Informe a taxa e o raio de entrega, ou ative o frete grátis.');
      return;
    }

    const token = await AsyncStorage.getItem('@token');
    if (!token) return;

    const formData = new FormData();
    formData.append('final_name', name);
    formData.append('phone', phone);
    formData.append('email', email);
    formData.append('cep', cep);
    formData.append('street', street);
    formData.append('number', number);
    formData.append('neighborhood', neighborhood);
    formData.append('city', city);
    formData.append('state', state);
    formData.append('pix_key', pixKey);
    formData.append('pix_key_type', pixKeyType);
    formData.append('category', category);
    formData.append('status', status);
    formData.append('delivery_fee', deliveryFee);
    formData.append('delivery_radius', deliveryRadius);
    formData.append('free_shipping', freeShipping ? '1' : '0');

    formData.append('first_purchase_discount_store', firstPurchaseDiscountStore ? '1' : '0');
    if (firstPurchaseDiscountStore && firstPurchaseDiscountStoreValue) {
      formData.append('first_purchase_discount_store_value', String(firstPurchaseDiscountStoreValue));
    } else {
      formData.append('first_purchase_discount_store_value', '');
    }

    formData.append('first_purchase_discount_app', firstPurchaseDiscountApp ? '1' : '0');
    if (firstPurchaseDiscountApp && firstPurchaseDiscountAppValue) {
      formData.append('first_purchase_discount_app_value', String(firstPurchaseDiscountAppValue));
    } else {
      formData.append('first_purchase_discount_app_value', '');
    }

    openingHours.forEach((h, index) => {
      formData.append(`opening_hours[${index}][day]`, h.day);
      formData.append(`opening_hours[${index}][open]`, h.open);
      formData.append(`opening_hours[${index}][close]`, h.close);
    });

    if (logo?.isNew) {
      if (Platform.OS === 'web' && logo.file) {
        formData.append('logo', logo.file, logo.name);
      } else {
        formData.append('logo', {
          uri: Platform.OS === 'android' ? logo.uri : logo.uri.replace('file://', ''),
          name: logo.name,
          type: logo.type,
        } as any);
      }
    }

    try {
      const res = await api.post('/companies/addInfo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        },
      });
      Alert.alert('Sucesso', 'Loja salva com sucesso!');
    } catch (err) {
      console.error(err);
      Alert.alert('Erro', 'Não foi possível salvar a loja.');
    }
  }

  const handleAddOpeningHour = () => {
    setOpeningHours((prev) => [...prev, { day: '', open: '', close: '' }]);
  };

  const handleRemoveOpeningHour = (index: number) => {
    const updated = [...openingHours];
    updated.splice(index, 1);
    setOpeningHours(updated);
  };

  const handleChangeOpeningHour = (index: number, key: keyof OpeningHour, value: string) => {
    const updated = [...openingHours];

    if (key === "day" && value) {
      const countSameDay = updated.filter((h, i) => h.day === value && i !== index).length;
      if (countSameDay >= 2) {
        Alert.alert(
          "Limite atingido",
          `O dia ${value} já possui 2 registros de horários.`
        );
        return;
      }
    }

    updated[index][key] = value;
    setOpeningHours(updated);
  };

  function formatPhone(value: string) {
    const digits = value.replace(/\D/g, ""); 
    if (digits.length <= 10) {
      return digits.replace(/(\d{0,2})(\d{0,4})(\d{0,4})/, (match, ddd, part1, part2) => {
        if (!part1) return ddd;
        if (!part2) return `(${ddd}) ${part1}`;
        return `(${ddd}) ${part1}-${part2}`;
      });
    } else {
      return digits.replace(/(\d{0,2})(\d{0,5})(\d{0,4})/, (match, ddd, part1, part2) => {
        if (!part1) return ddd;
        if (!part2) return `(${ddd}) ${part1}`;
        return `(${ddd}) ${part1}-${part2}`;
      });
    }
  }

  const handleToggleStore = (value: boolean) => {
    setFirstPurchaseDiscountStore(value);    
    if (value) {
      setFirstPurchaseDiscountApp(false);
      setFirstPurchaseDiscountAppValue(null);
      setFirstPurchaseDiscountStoreValue(null);
    } else {
      setFirstPurchaseDiscountStoreValue(null);
    }
  }

  const handleToggleApp = (value: boolean) => {
    setFirstPurchaseDiscountApp(value);
    if (value) {
      setFirstPurchaseDiscountStore(false);
      setFirstPurchaseDiscountStoreValue(null);
      setFirstPurchaseDiscountAppValue(null);
    } else {
      setFirstPurchaseDiscountAppValue(null);
    }
  }

  const handleSearchCep = async () => {
    if (!cep) return Alert.alert('Erro', 'Digite o CEP');

    try {
      const cleanCep = cep.replace(/\D/g, '');
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();

      if (data.erro) {
        Alert.alert('Erro', 'CEP não encontrado');
        return;
      }

      setStreet(`${data.logradouro}`);
      setNeighborhood(data.bairro);
      setCity(data.localidade);
      setState(data.uf);
    } catch (err) {
      console.error(err);
      Alert.alert('Erro', 'Não foi possível buscar o CEP');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
    <FlatList
      style={{ padding: 16 }}
      data={openingHours}
      keyExtractor={(_, index) => index.toString()}
      ListHeaderComponent={
        <>
          <Text style={styles.title}>Perfil da Loja</Text>

          <TextInput style={styles.input} placeholder="Nome da loja" value={name} onChangeText={setName} />
          <TextInput style={styles.input} placeholder="CNPJ" value={cnpj} editable={false} />
          <TextInput style={styles.input} placeholder="Telefone" value={formatPhone(phone)} onChangeText={(text) => setPhone(text.replace(/\D/g, ""))} />
          <TextInput style={styles.input} placeholder="E-mail" value={email} onChangeText={setEmail} />

          <Text style={styles.label}>Endereço do CNPJ</Text>
          <TextInput style={styles.input} placeholder="Endereço" value={address} editable={false} />

          <Text style={styles.label}>Endereço da loja</Text>
          <Text style={styles.label}>CEP</Text>
          <TextInput
            style={styles.input}
            placeholder="Digite o CEP para buscar e preencher os dados abaixo dinamicamente"
            value={cep}
            onChangeText={(text) => {
              let digits = text.replace(/\D/g, '');
              digits = digits.slice(0, 8);
              if (digits.length > 5) {
                digits = digits.slice(0, 5) + '-' + digits.slice(5);
              }
              setCep(digits);
            }}
            keyboardType="numeric"
            maxLength={9}
            onBlur={handleSearchCep}
          />
          <TextInput
            style={styles.input}
            placeholder="Rua"
            value={street}
            onChangeText={setStreet}
            editable={false}
          />
          <TextInput
            style={styles.input}
            placeholder="Número"
            keyboardType="numeric"
            value={number}
            onChangeText={setNumber}
          />
          <TextInput
            style={styles.input}
            placeholder="Bairro"
            value={neighborhood}
            onChangeText={setNeighborhood}
            editable={false}
          />
          <TextInput
            style={styles.input}
            placeholder="Cidade"
            value={city}
            onChangeText={setCity}
            editable={false}
          />
          <TextInput
            style={styles.input}
            placeholder="Estado"
            value={state}
            onChangeText={setState}
            editable={false}
          />

          <Text style={styles.label}>Chave PIX</Text>
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={pixKeyType} onValueChange={(v) => setPixKeyType(v)}>
              <Picker.Item label="Selecione o tipo da chave" value="" />
              <Picker.Item label="CPF" value="cpf" />
              <Picker.Item label="CNPJ" value="cnpj" />
              <Picker.Item label="E-mail" value="email" />
              <Picker.Item label="Telefone" value="phone" />
            </Picker>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Digite a chave PIX"
            value={pixKey}
            onChangeText={setPixKey}
          />

          <Text style={styles.label}>Categoria</Text>
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={category} onValueChange={(v) => setCategory(v)}>
              <Picker.Item label="Selecione a categoria" value="" />
              {categories.map((cat, i) => (
                <Picker.Item key={i} label={cat} value={cat} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Status</Text>
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={status} onValueChange={(v) => setStatus(v)}>
              <Picker.Item label="Ativa" value="active" />
              <Picker.Item label="Pausada" value="suspended" />
            </Picker>
          </View>

          <TextInput 
            style={styles.input} 
            placeholder="Taxa de entrega (R$)" 
            value={deliveryFee} 
            onChangeText={(text) => {
              setDeliveryFee(text);
              if (text) setFreeShipping(false);
            }}
          />
          <TextInput 
            style={styles.input} 
            placeholder="Raio de entrega (km)" 
            value={deliveryRadius} 
            onChangeText={(text) => {
              setDeliveryRadius(text);
              if (text) setFreeShipping(false);
            }} 
          />

          <View style={{ marginVertical: 12 }}>
            <Text style={{ fontWeight: 'bold', marginBottom: 6 }}>Configurações da Loja</Text>

            <View style={styles.switchRow}>
              <Text>🚚 Frete grátis</Text>
              <Switch
                value={freeShipping}
                onValueChange={(v) => {
                  setFreeShipping(v);
                  if (v) {
                    setDeliveryFee('');
                    setDeliveryRadius('');
                  }
                }}
                disabled={!!deliveryFee || !!deliveryRadius}
              />
            </View>

            <View style={styles.switchRow}>
              <Text>🎉 Desc. 1ª compra (loja)</Text>
              <Switch
                value={firstPurchaseDiscountStore}
                onValueChange={handleToggleStore}
              />
            </View>

            {firstPurchaseDiscountStore && (
              <Picker
                selectedValue={firstPurchaseDiscountStoreValue}
                onValueChange={(value) => setFirstPurchaseDiscountStoreValue(Number(value))}
              >
                <Picker.Item label="Selecione..." value={null} />
                <Picker.Item label="15%" value={15} />
                <Picker.Item label="20%" value={20} />
                <Picker.Item label="25%" value={25} />
              </Picker>
            )}

            <View style={styles.switchRow}>
              <Text>📱 Desc. 1ª compra (app)</Text>
              <Switch
                value={firstPurchaseDiscountApp}
                onValueChange={handleToggleApp}
              />
            </View>

            {firstPurchaseDiscountApp && (
              <Picker
                selectedValue={firstPurchaseDiscountAppValue}
                onValueChange={(value) => setFirstPurchaseDiscountAppValue(Number(value))}
              >
                <Picker.Item label="Selecione..." value={null} />
                <Picker.Item label="15%" value={15} />
                <Picker.Item label="20%" value={20} />
                <Picker.Item label="25%" value={25} />
              </Picker>
            )}
          </View>

          <TouchableOpacity style={styles.button} onPress={pickImage}>
            <Text style={styles.buttonText}>Selecionar logo</Text>
          </TouchableOpacity>
          {logo && (
            <Image source={{ uri: logo.uri }} style={{ width: 120, height: 120, marginTop: 10, borderRadius: 8 }} />
          )}
        </>
      }
      renderItem={({ item, index }) => (
        <View style={styles.openingHourRow}>
          <View style={{ flex: 2 }}>
            <Picker
              selectedValue={item.day}
              onValueChange={(v) => handleChangeOpeningHour(index, 'day', v)}
            >
              <Picker.Item label="Selecione o dia" value="" />
              {daysOfWeek.map((d, i) => <Picker.Item key={i} label={d} value={d} />)}
            </Picker>
          </View>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Abre"
            value={item.open}
            onChangeText={(v) => handleChangeOpeningHour(index, 'open', v)}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Fecha"
            value={item.close}
            onChangeText={(v) => handleChangeOpeningHour(index, 'close', v)}
          />
          <TouchableOpacity onPress={() => handleRemoveOpeningHour(index)}>
            <Text style={{ color: 'red', marginLeft: 8 }}>Remover</Text>
          </TouchableOpacity>
        </View>
      )}
      ListFooterComponent={
        <>
          <TouchableOpacity
            style={[styles.button, { marginTop: 8 }]}
            onPress={handleAddOpeningHour}
          >
            <Text style={styles.buttonText}>Adicionar horário</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: 'green', marginTop: 16 }]}
            onPress={handleSave}
          >
            <Text style={[styles.buttonText, { color: 'white' }]}>Salvar loja</Text>
          </TouchableOpacity>
        </>
      }
    />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  label: { fontWeight: '600', marginTop: 12, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: 'white', fontWeight: 'bold' },
  openingHourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  discountSelect: {
    marginTop: 12,
  },
  picker: {
    borderWidth: 1,
    borderColor: '#ccc',
  }
});