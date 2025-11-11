import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Image,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert,
    StyleSheet
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { isStrongPassword } from '../../utils/validatePassword';
import { Ionicons } from '@expo/vector-icons';
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
    isNew?: boolean;
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

export default function ClientProfile() {
    const { user, refreshUser } = useAuth();

    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [passwordValid, setPasswordValid] = useState(true);
    const [photo, setPhoto] = useState<ImageFile | null>(
        user?.photo
        ? { uri: `https://infrasonic-fibular-pat.ngrok-free.dev/storage/${user?.photo}`, name: 'profile.jpg', type: 'image/jpeg', isNew: false }
        : null
    );

    const [addresses, setAddresses] = useState<Address[]>(user?.addresses || []);
    const [newAddress, setNewAddress] = useState<Address>({
        label: '',
        cep: '',
        street: '',
        neighborhood: '',
        city: '',
        state: '',
        number: '',
        complement: '',
        note: ''
    });

    const isFocused = useIsFocused();

    const loadUserData = async () => {
        const updated = await refreshUser();

        if (updated) {
            setName(updated.name);
            setEmail(updated.email);
            setAddresses(updated.addresses || []);
    
            setPhoto(
                updated.photo
                    ? { uri: `https://infrasonic-fibular-pat.ngrok-free.dev/storage/${updated.photo}`, name: 'profile.jpg', type: 'image/jpeg', isNew: false }
                    : null
            );
        }
    };

    useEffect(() => {
        if (isFocused) {
            loadUserData();
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
          let name = asset.fileName || `image_profile_${Date.now()}.jpg`;
          let type = 'image/jpeg';
    
          if (Platform.OS === 'web' && asset.base64) {
            const mimeType = asset.uri?.startsWith('data:')
              ? asset.uri.split(';')[0].replace('data:', '')
              : 'image/jpeg';
            const blob = base64toBlob(asset.base64, mimeType);
            const file = new File([blob], name, { type: mimeType });
            uri = URL.createObjectURL(blob);
            type = mimeType;
    
            setPhoto({
              uri,
              name: file.name,
              type: file.type,
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
    
            setPhoto({
              uri,
              name,
              type,
              isNew: true
            });
          }
        }
    };

    const fetchAddressByCep = async (cep: string) => {
        const cleanedCep = cep.replace(/\D/g, '');
        if (cleanedCep.length !== 8) return;

        try {
            const res = await api.get(`/cep/${cleanedCep}`);
            const data = res.data;

            if (!data.erro) {
                setNewAddress(prev => ({
                    ...prev,
                    street: data.logradouro,
                    neighborhood: data.bairro,
                    city: data.localidade,
                    state: data.uf
                }));
            } else {
                console.warn('CEP não encontrado');
            }
        } catch (err) {
            console.error('Erro ao buscar CEP:', err);
        }
    };

    const addAddress = () => {
        if (!newAddress.label || !newAddress.cep || !newAddress.street) {
            Alert.alert('Erro', 'Preencha ao menos apelido, CEP e rua.');
            return;
        }
        setAddresses(prev => [...prev, { ...newAddress }]);
        setNewAddress({
            label: '',
            cep: '',
            street: '',
            neighborhood: '',
            city: '',
            state: '',
            number: '',
            complement: '',
            note: ''
        });
        Alert.alert('Sucesso', 'Endereço adicionado');
    };

    const removeAddress = async (index: number) => {
        const addrToRemove = addresses[index];

        if (addrToRemove.id) {
            try {
                const token = await AsyncStorage.getItem('@token');
                if (!token) return;

                await api.delete(`/clients/addresses/${addrToRemove.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                setAddresses(prev => prev.filter((_, i) => i !== index));
                Alert.alert('Erro', 'Endereço removido com sucesso.');
            } catch (error) {
                console.error('Erro ao remover endereço:', error);
                Alert.alert('Erro', 'Não foi possível remover o endereço.');
            }
        }
    };

    const handleSave = async () => {
        if (password && !passwordValid) {
            Alert.alert(
                'Senha inválida',
                'A senha deve conter ao menos 8 caracteres, com letra maiúscula, minúscula, número e símbolo.'
            );
            return;
        }

        if (password && password !== passwordConfirmation) {
            Alert.alert('Erro', 'As senhas não coincidem.');
            return;
        }

        const token = await AsyncStorage.getItem('@token');
        if (!token) return;

        const formData = new FormData();

        formData.append('name', name);
        formData.append('email', email);

        if (password) {
            formData.append('password', password);
            formData.append('password_confirmation', passwordConfirmation);
        }

        if (photo?.isNew) {
            if (Platform.OS === 'web') {
                try {
                    const blob = await fetch(photo.uri).then(res => res.blob());
                    const file = new File([blob], photo.name, { type: photo.type });
                    formData.append('photo', file);
                } catch (err) {
                    console.error('Erro ao processar foto web:', err);
                }
            } else {
                formData.append('photo', {
                    uri: photo.uri, 
                    name: photo.name,
                    type: photo.type,
                } as any);
            }
        }

        addresses.forEach((addr, index) => {
            Object.entries(addr).forEach(([key, value]) => {
                formData.append(`addresses[${index}][${key}]`, value ? String(value) : '');
            });
        });

        try {
            formData.append('_method', 'PUT');
            await api.post('/clients/updateProfile', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            Alert.alert('Sucesso', 'Perfil atualizado com sucesso.');
            await refreshUser();
        } catch (err: any) {
            console.error('Erro ao salvar perfil:', err.response?.data || err);
            Alert.alert('Erro', 'Falha ao salvar perfil.');
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
        >
            <ScrollView
                contentContainerStyle={{ padding: 16, paddingBottom: 50 }}
                keyboardShouldPersistTaps="handled"
            >
                <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 12 }}>
                    Perfil do Cliente
                </Text>

                <TextInput
                    placeholder="Nome"
                    value={name}
                    onChangeText={setName}
                    style={styles.input}
                />

                <TextInput
                    placeholder="E-mail"
                    value={email}
                    onChangeText={setEmail}
                    style={styles.input}
                />

                <TextInput
                    placeholder="Nova senha"
                    value={password}
                    secureTextEntry
                    onChangeText={(v) => {
                        setPassword(v);
                        setPasswordValid(isStrongPassword(v));
                    }}
                    style={[
                        styles.input,
                        (password || '').length > 0 && !passwordValid
                            ? { borderColor: 'red' }
                            : {}
                    ]}
                />

                {(password || '').length > 0 && !passwordValid && (
                    <Text style={{ color: 'red', fontSize: 12, marginBottom: 6 }}>
                        A senha deve conter ao menos 8 caracteres, com letra maiúscula, minúscula, número e símbolo.
                    </Text>
                )}

                <TextInput
                    placeholder="Confirme a nova senha"
                    value={passwordConfirmation}
                    secureTextEntry
                    onChangeText={setPasswordConfirmation}
                    style={styles.input}
                />

                <TouchableOpacity style={styles.button} onPress={pickImage}>
                    <Text style={styles.buttonText}>Selecionar foto de perfil</Text>
                </TouchableOpacity>

                {photo && (
                    <Image
                        source={{ uri: photo.uri }}
                        style={{ width: 100, height: 100, borderRadius: 50, marginTop: 10, alignSelf: 'center' }}
                    />
                )}

                <Text style={styles.sectionTitle}>Endereços de entrega</Text>

                {addresses.map((addr, index) => (
                    <View key={index} style={styles.addressCard}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontWeight: 'bold' }}>{addr.label}</Text>
                            <Text>{addr.street}, {addr.number} {addr.complement || ''} - {addr.neighborhood}, {addr.city} / {addr.state}</Text>
                        </View>
                        <TouchableOpacity onPress={() => removeAddress(index)}>
                            <Ionicons name="trash-outline" size={20} color="red" />
                        </TouchableOpacity>
                    </View>
                ))}

                <TextInput
                    placeholder="Apelido do endereço"
                    value={newAddress.label}
                    onChangeText={v => setNewAddress(prev => ({ ...prev, label: v }))}
                    style={styles.input}
                />
                <TextInput
                    placeholder="CEP"
                    value={newAddress.cep}
                    onChangeText={v => setNewAddress(prev => ({ ...prev, cep: v }))}
                    onBlur={() => fetchAddressByCep(newAddress.cep)}
                    style={styles.input}
                />
                <TextInput placeholder="Rua" value={newAddress.street} editable={false} style={styles.input} />
                <TextInput placeholder="Bairro" value={newAddress.neighborhood} editable={false} style={styles.input} />
                <TextInput placeholder="Cidade" value={newAddress.city} editable={false} style={styles.input} />
                <TextInput placeholder="Estado" value={newAddress.state} editable={false} style={styles.input} />
                <TextInput
                    placeholder="Número"
                    value={newAddress.number}
                    onChangeText={v => setNewAddress(prev => ({ ...prev, number: v }))}
                    style={styles.input}
                />
                <TextInput
                    placeholder="Complemento"
                    value={newAddress.complement}
                    onChangeText={v => setNewAddress(prev => ({ ...prev, complement: v }))}
                    style={styles.input}
                />
                <TextInput
                    placeholder="Observações"
                    value={newAddress.note}
                    onChangeText={v => setNewAddress(prev => ({ ...prev, note: v }))}
                    style={styles.input}
                />

                <TouchableOpacity style={styles.buttonSecondary} onPress={addAddress}>
                    <Text style={styles.buttonText}>Adicionar endereço</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.button, { marginTop: 20 }]} onPress={handleSave}>
                    <Text style={styles.buttonText}>Salvar perfil</Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 10,
        marginBottom: 10,
    },
    button: {
        backgroundColor: '#007AFF',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 5,
    },
    buttonSecondary: {
        backgroundColor: '#34C759',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 5,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 8,
    },
    addressCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 10,
        marginBottom: 10,
    }
});