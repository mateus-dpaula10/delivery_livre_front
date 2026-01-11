import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { useAuth } from "../../contexts/AuthContext";
import api from "../../services/api";
import logo from "../../../assets/Delivery Livre - Logo horizontal - branco sem fundo.png";

export default function LoginScreen() {
  const { login } = useAuth();
  const navigation = useNavigation<any>();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Campos obrigatórios", "Preencha email e senha");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/login", { email, password });
      const { user, access_token } = response.data;

      if (!user || !access_token) {
        throw new Error("Resposta inválida da API");
      }

      await login(user, access_token);
    } catch (err: any) {
      Alert.alert("Erro ao entrar", "Email ou senha inválidos");
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
          
          {/* HEADER */}
          <LinearGradient
            colors={["#1E88E5", "#1565C0"]}
            style={styles.header}
          >
            <Image source={logo} style={styles.logo} resizeMode="contain" />

            <Text style={styles.title}>Bem-vindo de volta 👋</Text>
            <Text style={styles.subtitle}>
              Entre para continuar seus pedidos
            </Text>
          </LinearGradient>

          {/* FORM */}
          <View style={styles.form}>
            {/* EMAIL */}
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#999" />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* PASSWORD */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#999" />
              <TextInput
                style={styles.input}
                placeholder="Senha"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#999"
                />
              </TouchableOpacity>
            </View>

            {/* ESQUECI SENHA */}
            {/* <TouchableOpacity
              style={styles.forgot}
              onPress={() => navigation.navigate("ForgotPasswordScreen")}
            >
              <Text style={styles.forgotText}>Esqueci minha senha</Text>
            </TouchableOpacity> */}

            {/* BUTTON */}
            <TouchableOpacity
              style={styles.button}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Entrar</Text>
              )}
            </TouchableOpacity>

            {/* REGISTER */}
            <TouchableOpacity onPress={() => navigation.navigate("Register")}>
              <Text style={styles.registerText}>
                Não tem conta?{" "}
                <Text style={styles.registerBold}>Cadastre-se</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },

  header: {
    height: 300,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },

  logo: {
    width: 400,
    height: 80,
    marginBottom: 16,
  },

  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
  },

  subtitle: {
    fontSize: 14,
    color: "#E3F2FD",
    marginTop: 4,
  },

  form: {
    flex: 1,
    padding: 24,
    marginTop: -40,
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 54,
    marginBottom: 16,
    elevation: 2,
  },

  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#333",
  },

  forgot: {
    alignItems: "flex-end",
    marginBottom: 24,
  },

  forgotText: {
    color: "#1E88E5",
    fontWeight: "500",
  },

  button: {
    backgroundColor: "#1E88E5",
    height: 54,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },

  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },

  registerText: {
    textAlign: "center",
    color: "#555",
  },

  registerBold: {
    color: "#1E88E5",
    fontWeight: "bold",
  },
});