
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  ALL = 'ALL'
}

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER'
}

export enum PaymentMethod {
  CASH = 'CASH',
  BKASH = 'BKASH',
  NAGAD = 'NAGAD',
  BANK = 'BANK'
}

export interface Transaction {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  type: TransactionType;
  method: PaymentMethod;
  date: string;
}

export interface UserProfile {
  email: string;
  name: string;
  mobile: string;
  pass: string;
  role: UserRole;
  username: string;
  avatar: string;
  bio?: string;
}

export interface DashboardStats {
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
}

export interface Advertisement {
  id: string;
  title: string;
  link: string;
  imageUrl: string;
  active: boolean;
  createdAt: string;
}
