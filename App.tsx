import "react-native-gesture-handler";
import "react-native-reanimated";

import React from "react";
import { NativeBaseProvider } from "native-base";
import { AuthProvider } from "./src/contexts/AuthContext";
import Routes from "./src/routes";

export default function App() {
  return (
    <NativeBaseProvider>
      <AuthProvider>
        <Routes />
      </AuthProvider>
    </NativeBaseProvider>
  );
}