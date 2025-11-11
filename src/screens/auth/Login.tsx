import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../services/api";
import logo from "../../../assets/Delivery Livre - Logo horizontal - azul  sem fundo.png"; 
import { Ionicons } from "@expo/vector-icons";

export default function LoginScreen() {
  const { login } = useAuth();
  const navigation = useNavigation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Campos obrigatórios", "Preencha todos os campos");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/login", { email, password });
      const { user, access_token } = response.data;
      
      if (!user || !access_token) {
        throw new Error("Resposta da API está incompleta.");
      }

      await login(user, access_token);
    } catch (err: any) {
      console.log(err.response?.data || err.message);
      Alert.alert("Erro ao logar", "Credenciais inválidas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />          

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.input}
              placeholder="Senha"
              value={password}
              onChangeText={setPassword}
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

          <View style={styles.buttonContainer}>
            <Button
              title={loading ? "Carregando..." : "Entrar"}
              onPress={handleLogin}
              disabled={loading}
            />
          </View>

          <Text
            style={styles.registerText}
            onPress={() => navigation.navigate("Register" as never)}
          >
            Não tem conta? Cadastre-se
          </Text>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#f0f0f0",
  },
  logo: {
    width: "100%",
    height: 240,
    alignSelf: "center",
    marginBottom: 0,
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,                  
    height: 50,
    borderWidth: 0,           
    paddingHorizontal: 8,     
    backgroundColor: "#fff",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 8,
    marginBottom: 16,
    backgroundColor: "#fff",
  },
  showPasswordButton: {
    marginLeft: 8,
  },
  showPasswordText: {
    color: "#007bff",
    fontWeight: "500",
  },
  buttonContainer: {
    marginBottom: 16,
  },
  registerText: {
    textAlign: "center",
    color: "#007bff",
  },
});