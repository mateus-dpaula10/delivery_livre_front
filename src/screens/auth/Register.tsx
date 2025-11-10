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
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import api from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { isStrongPassword } from "../../utils/validatePassword";
import logo from "../../../assets/Delivery Livre - Logo horizontal - azul  sem fundo.png";

export default function Register() {
  const navigation = useNavigation();
  const { login } = useAuth();

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
      Alert.alert("Campos obrigatórios", "Preencha todos os campos.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Senha inválida", "As senhas não coincidem.");
      return;
    }

    if (!isStrongPassword(password)) {
      Alert.alert(
        "Senha fraca",
        "Use senha forte com maiúscula, minúscula, número e símbolo."
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

      Alert.alert("Cadastro realizado", "Conta criada com sucesso.");

      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");

      navigation.navigate("Login" as never);
    } catch (err: any) {
      console.error(err.response?.data || err.message);
      Alert.alert(
        "Erro ao cadastrar",
        err.response?.data?.message || "Não foi possível criar a conta."
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
            <Image source={logo} style={styles.logo} resizeMode="contain" />

            <TextInput
              style={styles.input}
              placeholder="Nome completo"
              value={name}
              onChangeText={setName}
            />

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
                style={[styles.input, { flex: 1 }]}
                placeholder="Senha"
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  setPasswordValid(isStrongPassword(v));
                }}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.showPasswordButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.showPasswordText}>
                  {showPassword ? "Ocultar" : "Mostrar"}
                </Text>
              </TouchableOpacity>
            </View>
            {!passwordValid && (
              <Text style={styles.passwordWarning}>
                A senha deve conter ao menos 8 caracteres, com letra maiúscula,
                minúscula, número e símbolo.
              </Text>
            )}

            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Confirmar senha"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity
                style={styles.showPasswordButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Text style={styles.showPasswordText}>
                  {showConfirmPassword ? "Ocultar" : "Mostrar"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.buttonContainer}>
              <Button
                title={loading ? "Carregando..." : "Cadastrar"}
                onPress={handleRegister}
                disabled={loading}
              />
            </View>

            <Text
              style={styles.registerText}
              onPress={() => navigation.navigate("Login" as never)}
            >
              Já tem conta? Faça login
            </Text>
          </View>
        </ScrollView>
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
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    backgroundColor: "#fff",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  showPasswordButton: {
    marginLeft: 8,
  },
  showPasswordText: {
    color: "#007bff",
    fontWeight: "500",
  },
  passwordWarning: {
    color: "red",
    fontSize: 12,
    marginBottom: 8,
  },
  buttonContainer: {
    marginBottom: 16,
  },
  registerText: {
    textAlign: "center",
    color: "#007bff",
  },
});