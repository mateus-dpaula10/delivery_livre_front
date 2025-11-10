import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, TouchableOpacity } from "react-native";
import { FlatList, KeyboardAvoidingView, Platform, Text, TextInput, View } from "react-native";
import { isStrongPassword } from '../../utils/validatePassword';
import api from "../../services/api";
import { Ionicons } from "@expo/vector-icons";

export default function StoreDrivers() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordValid, setPasswordValid] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [plate, setPlate] = useState('');
  const [status, setStatus] = useState<'ativo' | 'inativo'>('ativo');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const isFocused = useIsFocused();

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setPhone('');
    setVehicle('');
    setPlate('');
    setStatus('ativo');
    setEditingId(null);
  }

  const loadDrivers = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('@token');
      const res = await api.get('/drivers', { headers: { Authorization: `Bearer ${token}` } });
      if (Array.isArray(res.data)) {
        setDrivers(res.data);
      } else {
        setDrivers([]);
      }
      setDrivers(res.data);
    } catch (err: any) {
      if (err?.response?.status === 500) {
        setDrivers([]);
      } else {
        Alert.alert('Erro', 'Não foi encontrado nenhum motorista no momento.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) loadDrivers();
  }, [isFocused]);

  const handleSaveDriver = async () => {
    const camposObrigatorios = [
      { label: 'Nome da motorista', value: name },
      { label: 'E-mail', value: email },
      { label: 'Senha', value: password },
      { label: 'Telefone', value: phone },
      { label: 'Veículo', value: vehicle },
      { label: 'Placa', value: plate },
      { label: 'Status', value: status }
    ];

    for (const campo of camposObrigatorios) {
      if (!campo.value || String(campo.value).trim() === '') {
        Alert.alert('Erro', `O campo "${campo.label}" é obrigatório.`);
        return;
      }
    }

    const token = await AsyncStorage.getItem('@token');
    if (!token) return;

    const payload = { name, email, password, phone, vehicle, plate, status };

    setSaving(true);
    try {
      if (editingId) {
        const res = await api.put(`/drivers/${editingId}`, payload, { headers: { Authorization: `Bearer ${token}` } });
        setDrivers(prev => prev.map(d => (d.id === editingId ? res.data : d)));
        Alert.alert('Motorista atualizado com sucesso!');
      } else {
        const res = await api.post('/drivers', payload, { headers: { Authorization: `Bearer ${token}` } });
        setDrivers(prev => [...prev, res.data]);
        Alert.alert('Motorista cadastrado com sucesso!');
      }
      resetForm();
    } catch (err) {
      console.error(err);
      Alert.alert('Erro ao salvar motorista.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditDriver = (driver: any) => {
    setEditingId(driver.id);
    setName(driver.name);
    setEmail(driver.email);
    setPassword(driver.password);
    setPhone(driver.phone);
    setVehicle(driver.vehicle || '');
    setPlate(driver.plate || '');
    setStatus(driver.status || 'ativo');
  };

  const handleDeleteDriver = async (id: number) => {
    const token = await AsyncStorage.getItem('@token');
    if (!token) return;

    Alert.alert('Confirmação', 'Deseja realmente excluir este motorista?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/drivers/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            setDrivers(prev => prev.filter(d => d.id !== id));
            Alert.alert('Motorista excluído com sucesso!');
          } catch (err) {
            console.error(err);
            Alert.alert('Erro ao excluir motorista.');
          }
        }
      }
    ]);
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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <FlatList
        style={{ padding: 16 }}
        data={drivers}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={
          <>
            <Text style={styles.title}>Cadastro de motorista parceiro</Text>

            <TextInput style={styles.input} placeholder="Nome" value={name} onChangeText={setName} />
            <TextInput
              style={styles.input}
              placeholder="E-mail"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Senha"
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  setPasswordValid(isStrongPassword(v));                
                }}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color="#555"
                  style={{ marginHorizontal: 8 }}
                />
              </TouchableOpacity>
            </View>
            {(password || '').length > 0 && !passwordValid && (
              <Text style={{ color: 'red', fontSize: 12, marginBottom: 6 }}>
                A senha deve conter ao menos 8 caracteres, com letra maiúscula, minúscula, número e símbolo.
              </Text>
            )}
            <TextInput style={styles.input} placeholder="Telefone" value={formatPhone(phone)} onChangeText={setPhone} keyboardType="phone-pad" />
            <TextInput style={styles.input} placeholder="Veículo (ex: Moto, Carro)" value={vehicle} onChangeText={setVehicle} />
            <TextInput 
              style={styles.input} 
              placeholder="Placa" 
              value={plate} onChangeText={(text) => {
                let formatted = text
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, '');

                if (formatted.length > 3) 
                  formatted = formatted.slice(0, 3) + '-' + formatted.slice(3, 7);

                setPlate(formatted.slice(0, 8));
              }} 
              autoCapitalize="characters"
              maxLength={8}
            />

            <Text style={styles.label}>Status</Text>
            <View style={styles.row}>
              {['ativo', 'inativo'].map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.button, status === opt && styles.buttonSelected]}
                  onPress={() => setStatus(opt as any)}
                >
                  <Text style={{ color: status === opt ? 'white' : 'black' }}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSaveDriver} disabled={saving}>
              <Text style={{ color: 'white' }}>{editingId ? 'Atualizar motorista' : 'Salvar motorista'}</Text>
            </TouchableOpacity>

            {loading && <Text style={{ marginTop: 16 }}>Carregando motoristas...</Text>}
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: 'bold' }}>{item.name}</Text>
              <Text>Telefone: {item.phone}</Text>
              {item.vehicle && <Text>Veículo: {item.vehicle}</Text>}
              {item.plate && <Text>Placa: {item.plate}</Text>}
              <Text>Status: {item.status}</Text>
            </View>

            <View style={styles.row}>
              <TouchableOpacity style={[styles.button, { backgroundColor: 'blue' }]} onPress={() => handleEditDriver(item)}>
                <Text style={{ color: 'white' }}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, { backgroundColor: 'red' }]} onPress={() => handleDeleteDriver(item.id)}>
                <Text style={{ color: 'white' }}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  passwordContainer: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#ccc", borderRadius: 4, paddingHorizontal: 8, marginTop: 4 },
  passwordInput: { flex: 1, paddingVertical: 8 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  label: { marginTop: 8, fontWeight: 'bold' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 4, padding: 8, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 4 },
  button: { padding: 8, borderWidth: 1, borderColor: '#ccc', borderRadius: 4, marginRight: 4, marginTop: 4 },
  buttonSelected: { backgroundColor: '#007bff', borderColor: '#007bff' },
  saveButton: { backgroundColor: 'green', padding: 12, borderRadius: 4, alignItems: 'center', marginTop: 8 },
  card: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, marginVertical: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});