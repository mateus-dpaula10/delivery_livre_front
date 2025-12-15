import { Home, ShoppingCart, Truck, User, ClipboardList, ClipboardCheck, Users } from 'lucide-react-native';

export const sidebarOptions: Record<string, { label: string; screen: string; icon: any }[]> = {
    client: [
        { label: 'Lojas', screen: 'CustomerCategories', icon: ClipboardList },
        { label: 'Carrinho', screen: 'ClientCart', icon: ShoppingCart },
        { label: 'Meus Pedidos', screen: 'ClientOrders', icon: ClipboardCheck },
        { label: 'Perfil', screen: 'ClientProfile', icon: User }
    ],
    store: [
        { label: 'Painel', screen: 'StoreDashboard', icon: Home },
        { label: 'Produtos', screen: 'StoreProducts', icon: ShoppingCart },
        { label: 'Pedidos Recebidos', screen: 'StoreOrders', icon: Truck },
        { label: 'Motoristas Parceiros', screen: 'StoreDrivers', icon: Users },
        { label: 'Perfil', screen: 'StoreProfile', icon: User }
    ],
    delivery: [
        { label: 'Pedidos', screen: 'DeliveryOrders', icon: Truck },
        { label: 'Entregas', screen: 'DeliveryTasks', icon: Truck },
        { label: 'Perfil', screen: 'DeliveryProfile', icon: User }
    ],
    admin: [
        { label: 'Painel', screen: 'AdminDashboard', icon: Home },
        { label: 'Lojas', screen: 'ManageUsers', icon: ClipboardList }
    ]
};