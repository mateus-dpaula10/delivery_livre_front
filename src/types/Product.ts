export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock_quantity: number;

  // Categoria
  category_id?: number | null;
  category?: string; // nome (caso venha via accessor no back)

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