import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Button, FlatList, Alert, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Switch } from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import axios from "axios";
import { Picker } from "@react-native-picker/picker";
import api from "../../services/api";
import { useIsFocused } from "@react-navigation/native";

type Company = {
  id?: number;
  cnpj: string;
  legal_name: string;
  final_name: string;
  phone: string;
  address: string;
  plan: string;
  weighable?: boolean;
  admin?: {
    name: string;
    email: string;
  };
};

type Admin = {
  name: string;
  email: string;
  password: string;
};

export default function ManageUsers() {
  const { token } = useAuth();
  const [company, setCompany] = useState<Company>({
    cnpj: "",
    legal_name: "",
    final_name: "",
    phone: "",
    address: "",
    plan: "padrao",
  });
  const [admin, setAdmin] = useState<Admin>({ name: "", email: "", password: "" });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const isFocused = useIsFocused();

  async function loadCompanies() {
    try {
      setLoading(true);
      const { data } = await api.get<Company[]>("/companies");
      setCompanies(data);
    } catch (err) {
      console.error("Erro ao carregar empresas", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isFocused) {
      loadCompanies();
    }
  }, [isFocused]);

  const fetchCNPJData = async (cnpj: string) => {
    try {
      const cleanCNPJ = cnpj.replace(/\D/g, '');
      const { data } = await axios.get(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`);

      setCompany(c => ({
        ...c,
        legal_name: data.razao_social || '',
        phone: data.ddd_telefone_1 ? `${data.ddd_telefone_1}` : '',
        address: `${data.descricao_tipo_de_logradouro} ${data.logradouro}, ${data.numero} - ${data.bairro}, ${data.municipio} - ${data.uf}, ${data.cep}`,
      }));
    } catch (error) {
        Alert.alert('Erro ao buscar CNPJ', 'CNPJ inválido ou não encontrado.');
    }
  };  

  async function handleSubmit() {
    try {
      const payload = { ...company, admin };

      if (company.id) {
        await api.put(`/companies/${company.id}`, payload);
        Alert.alert("Sucesso", "Empresa atualizada!");
      } else {
        await api.post("/companies", payload);
        Alert.alert("Sucesso", "Empresa criada!");
      }

      setCompany({ 
        cnpj: "", 
        legal_name: "", 
        final_name: "", 
        phone: "", 
        address: "", 
        plan: ""
      });
      setAdmin({ name: "", email: "", password: "" });
      loadCompanies();
    } catch (err) {
      console.error("Erro ao salvar empresa", err);
      Alert.alert("Erro", "Não foi possível salvar a empresa.");
    }
  }

  const handleEdit = (company: Company) => {
    setCompany({
        id: company.id,
        cnpj: company.cnpj ?? "",
        legal_name: company.legal_name ?? "",
        final_name: company.final_name ?? "",
        phone: company.phone ?? "",
        address: company.address ?? "",
        plan: company.plan ?? ""
    });

    if (company.admin) {
        setAdmin({
        name: company.admin.name ?? "",
        email: company.admin.email ?? "",
        password: "",
        });
    } else {
        setAdmin({ name: "", email: "", password: "" });
    }
  };

  async function handleDelete(id?: number) {
    try {
      if (!id) return;
      await api.delete(`/companies/${id}`);
      Alert.alert("Sucesso", "Empresa excluída!");
      loadCompanies();
    } catch (err) {
      console.error("Erro ao excluir empresa", err);
    }
  }

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
        data={companies}
        keyExtractor={(item) => item.id?.toString() ?? Math.random().toString()}
        ListHeaderComponent={
          <>
            <Text style={styles.title}>Cadastro da Loja</Text>

            <TextInput
              style={styles.input}
              placeholder="CNPJ"
              value={company.cnpj}
              onChangeText={(v) => setCompany((c) => ({ ...c, cnpj: v }))}
              onBlur={() => fetchCNPJData(company.cnpj)}
            />
            <TextInput
              style={styles.input}
              placeholder="Razão Social"
              value={company.legal_name}
              onChangeText={(v) => setCompany((c) => ({ ...c, legal_name: v }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Telefone"
              value={formatPhone(company.phone)}
              onChangeText={(v) => setCompany((c) => ({ ...c, phone: v }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Endereço"
              value={company.address}
              onChangeText={(v) => setCompany((c) => ({ ...c, address: v }))}
            />
            <TextInput 
              style={styles.input}
              placeholder="Nome da loja" 
              value={company.final_name} 
              onChangeText={v => setCompany(c => ({ ...c, final_name: v }))} 
            />    

            <View style={styles.pickerWrapper}>
              <Picker
                  selectedValue={company.plan}
                  onValueChange={(value) =>
                      setCompany((c) => ({ ...c, plan: value }))
                  }
              >
                  <Picker.Item label="Plano padrão" value="padrao" />
              </Picker>
            </View>

            <Text style={styles.subtitle}>Admin da Loja</Text>
            <TextInput
              style={styles.input}
              placeholder="Nome"
              value={admin.name}
              onChangeText={(v) => setAdmin((a) => ({ ...a, name: v }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={admin.email}
              onChangeText={(v) => setAdmin((a) => ({ ...a, email: v }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Senha"
              secureTextEntry
              value={admin.password}
              onChangeText={(v) => setAdmin((a) => ({ ...a, password: v }))}
            />

            <Button title={company.id ? "Atualizar" : "Cadastrar"} onPress={handleSubmit} />

            <Text style={[styles.title, { marginTop: 20 }]}>Empresas Cadastradas</Text>
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.final_name}</Text>
            <Text>CNPJ: {item.cnpj}</Text>
            <Text>Admin: {item.admin?.email || "Não cadastrado"}</Text>
            <Button title="Editar" onPress={() => handleEdit(item)} />
            <Button title="Excluir" color="red" onPress={() => handleDelete(item.id)} />
          </View>
        )}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 18, fontWeight: "bold", marginVertical: 8 },
  subtitle: { fontSize: 16, fontWeight: "600", marginTop: 16 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
  },
  card: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    marginBottom: 8,
  },
  cardTitle: { fontWeight: "bold", fontSize: 16 },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    overflow: "hidden",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 6,
  },
});