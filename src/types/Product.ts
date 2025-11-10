export interface Product {
    id: number;
    name: string;
    description: string;
    price: number;
    stock_quantity: number;
    category?: string; 
    status: 'ativo' | 'em_falta' | 'oculto'; 
    variations: {
        id?: number;
        type: string; 
        value: string; 
    }[];
    images: {
        id: number;
        image_path: string;
    }[];
}