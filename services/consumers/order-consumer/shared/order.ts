export type OrderStatus =
  | 'RECEIVED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED';

export interface Order {
  orderId: string;
  status: OrderStatus;
  payload: unknown;
  createdAt: string;
  updatedAt: string;
}
