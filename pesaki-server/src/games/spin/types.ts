export interface SpinPrize {
  id: string;
  name: string;
  value: number;
  weight: number;
}

export interface SpinResult {
  userId: string;
  betAmount: number;
  prizeId: string;
  prizeValue: number;
  mode: 'real' | 'demo';
  timestamp: Date;
}
