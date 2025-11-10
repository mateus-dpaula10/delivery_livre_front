export interface Company {
    id?: number;
    cnpj: string;     
    legal_name: string;     
    final_name: string;     
    phone: string;     
    address: string;     
    plan: string;     
    admin?: Admin;
}

export interface Admin {
    name: string;
    email: string;
    password?: string;
}