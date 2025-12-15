import { createDrawerNavigator } from "@react-navigation/drawer";
import CustomDrawerContent from "./CustomDrawerContent";
import { useAuth } from "../contexts/AuthContext";
import ManageUsers from "../screens/admin/ManageUsers";
import StoreProducts from "../screens/store/StoreProducts";
import StoreProfile from "../screens/store/StoreProfile";
import CustomerStoresProducts from "../screens/client/CustomerStoresProducts";
import ClientCart from "../screens/client/ClientCart";
import ClientOrders from "../screens/client/ClientOrders";
import ClientProfile from "../screens/client/ClientProfile";
import StoreOrders from "../screens/store/StoreOrders";
import StoreDrivers from "../screens/store/StoreDrivers";
import AdminDashboard from "../screens/admin/AdminDashboard";
import StoreDashboard from "../screens/store/StoreDashboard";
import CustomerCategories from "../screens/client/CustomerCategories";
import CustomerStoresByCategory from "../screens/client/CustomerStoresByCategory";

const Drawer = createDrawerNavigator();

export default function AppDrawer() {
  const { user } = useAuth();
  const role = user?.role || "client";

  const screens: Record<string, { name: string; component: any; title: string }[]> = {
    admin: [
      { name: "ManageUsers", component: ManageUsers, title: "Gerenciar Usuários" },
      { name: "AdminDashboard", component: AdminDashboard, title: "Dashboard Administração" },
    ],
    store: [
      { name: "StoreDashboard", component: StoreDashboard, title: "Dashboard Administração" },
      { name: "StoreProducts", component: StoreProducts, title: "Produtos" },
      { name: "StoreProfile", component: StoreProfile, title: "Perfil da Loja" },
      { name: "StoreOrders", component: StoreOrders, title: "Pedidos" },
      { name: "StoreDrivers", component: StoreDrivers, title: "Entregadores" }
    ],
    client: [
      { name: "CustomerCategories", component: CustomerCategories, title: "Lojas" },
      { name: "CustomerStoresByCategory", component: CustomerStoresByCategory, title: "Lojas por Categoria" },
      { name: "CustomerStoresProducts", component: CustomerStoresProducts, title: "Produtos da Loja" },
      { name: "ClientCart", component: ClientCart, title: "Carrinho" },
      { name: "ClientOrders", component: ClientOrders, title: "Meus Pedidos" },
      { name: "ClientProfile", component: ClientProfile, title: "Meu Perfil" },
    ]
  };

  return (
    <Drawer.Navigator drawerContent={(props) => <CustomDrawerContent {...props} />}>
      {screens[role]?.map((s) => (
        <Drawer.Screen key={s.name} name={s.name} component={s.component} options={{ title: s.title }} />
      ))}
    </Drawer.Navigator>
  );
}