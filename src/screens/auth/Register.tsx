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
  ScrollView,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import api from "../../services/api";
import { isStrongPassword } from "../../utils/validatePassword";
import logo from "../../../assets/Delivery Livre - Logo horizontal - branco sem fundo.png";

export default function RegisterScreen() {
  const navigation = useNavigation<any>();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordValid, setPasswordValid] = useState(true);

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert("Campos obrigatórios", "Preencha todos os campos");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Senha inválida", "As senhas não coincidem");
      return;
    }

    if (!isStrongPassword(password)) {
      Alert.alert(
        "Senha fraca",
        "Use ao menos 8 caracteres com letra maiúscula, minúscula, número e símbolo"
      );
      return;
    }

    setLoading(true);
    try {
      await api.post("/register", {
        name,
        email,
        password,
        password_confirmation: confirmPassword,
      });

      Alert.alert("Cadastro realizado", "Conta criada com sucesso");
      navigation.navigate("Login");
    } catch (err: any) {
      Alert.alert(
        "Erro ao cadastrar",
        err.response?.data?.message || "Não foi possível criar a conta"
      );
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
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View style={styles.container}>
            
            {/* HEADER */}
            <LinearGradient
              colors={["#1E88E5", "#1565C0"]}
              style={styles.header}
            >
              <Image source={logo} style={styles.logo} resizeMode="contain" />
              <Text style={styles.title}>Criar conta</Text>
              <Text style={styles.subtitle}>
                Cadastre-se para começar a usar
              </Text>
            </LinearGradient>

            {/* FORM */}
            <View style={styles.form}>
              {/* NOME */}
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#999" />
                <TextInput
                  style={styles.input}
                  placeholder="Nome completo"
                  placeholderTextColor="#999"
                  value={name}
                  onChangeText={setName}
                />
              </View>

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
                  onChangeText={(v) => {
                    setPassword(v);
                    setPasswordValid(isStrongPassword(v));
                  }}
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

              {!passwordValid && (
                <Text style={styles.passwordWarning}>
                  A senha deve conter ao menos 8 caracteres, com letra maiúscula,
                  minúscula, número e símbolo.
                </Text>
              )}

              {/* CONFIRM PASSWORD */}
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#999" />
                <TextInput
                  style={styles.input}
                  placeholder="Confirmar senha"
                  placeholderTextColor="#999"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity
                  onPress={() =>
                    setShowConfirmPassword(!showConfirmPassword)
                  }
                >
                  <Ionicons
                    name={
                      showConfirmPassword
                        ? "eye-off-outline"
                        : "eye-outline"
                    }
                    size={20}
                    color="#999"
                  />
                </TouchableOpacity>
              </View>

              {/* BUTTON */}
              <TouchableOpacity
                style={styles.button}
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Cadastrar</Text>
                )}
              </TouchableOpacity>

              {/* LOGIN */}
              <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                <Text style={styles.registerText}>
                  Já tem conta?{" "}
                  <Text style={styles.registerBold}>Faça login</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
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

  passwordWarning: {
    color: "#d32f2f",
    fontSize: 12,
    marginBottom: 12,
    marginLeft: 8,
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