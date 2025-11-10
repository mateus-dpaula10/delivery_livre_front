import { NavigationContainer } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import AuthRoutes from "./AuthRoutes";
import AppDrawer from "../navigation/AppDrawer";

export default function Routes() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <NavigationContainer>
      {user ? <AppDrawer /> : <AuthRoutes />}
    </NavigationContainer>
  );
}
