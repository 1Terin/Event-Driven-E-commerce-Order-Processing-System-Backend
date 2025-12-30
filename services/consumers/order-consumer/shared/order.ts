export type OrderStatus =
  | 'RECEIVED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED';

export interface Order {
  PK: string;
  orderId: string;
  status: OrderStatus;
  payload: unknown;
  createdAt: string;
  updatedAt: string;
}
