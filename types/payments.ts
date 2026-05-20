/**
 * TURPIAL SOUND MARKETPLACE - PAYMENT TYPES
 * 
 * Strict TypeScript interfaces for multi-channel payment gateway
 * Supports: Mercantil Bank, Binance Pay, Zelle, Manual Crypto
 * 
 * @see /docs/marketplace/02_PAYMENT_ARCHITECTURE.md
 * @see /docs/marketplace/03_API_INTEGRATION_PLAN.md
 */

// ============================================
// PAYMENT METHOD TYPES
// ============================================

export enum PaymentMethodType {
  MERCANTIL_C2P = 'MERCANTIL_C2P',
  MERCANTIL_PAGO_MOVIL = 'MERCANTIL_PAGO_MOVIL',
  MERCANTIL_BOTON_PAGO = 'MERCANTIL_BOTON_PAGO',
  BINANCE_PAY = 'BINANCE_PAY',
  ZELLE = 'ZELLE',
  CRYPTO_WALLET_MANUAL = 'CRYPTO_WALLET_MANUAL',
}

export enum TransactionStatus {
  // Initial States
  INITIATED = 'INITIATED',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  
  // Payment Validation
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  VALIDATING = 'VALIDATING',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  
  // Escrow States
  IN_ESCROW = 'IN_ESCROW',
  DELIVERY_CONFIRMED = 'DELIVERY_CONFIRMED',
  
  // Final States
  RELEASED = 'RELEASED',
  REFUNDED = 'REFUNDED',
  DISPUTED = 'DISPUTED',
  CANCELLED = 'CANCELLED',
}

export enum Currency {
  USD = 'USD',
  VES = 'VES',
  USDT = 'USDT',
  BTC = 'BTC',
  ETH = 'ETH',
  BNB = 'BNB',
}

// ============================================
// MERCANTIL BANK API TYPES
// ============================================

export interface MercantilPaymentRequest {
  amount: number;
  currency: 'VES';
  method: 'C2P' | 'PAGO_MOVIL' | 'BOTON_PAGO';
  customer: {
    phone: string;
    email: string;
    name: string;
  };
  reference: string; // Our internal transaction ID
  description: string;
  callback_url: string;
  return_url: string;
}

export interface MercantilPaymentResponse {
  payment_id: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
  payment_url?: string; // For Botón de Pago
  expires_at: string; // ISO 8601
}

export interface MercantilWebhookPayload {
  event: 'payment.completed' | 'payment.failed' | 'payment.refunded';
  data: {
    payment_id: string;
    reference: string; // Our transaction ID
    amount: number;
    currency: string;
    status: string;
    completed_at?: string;
    failure_reason?: string;
  };
  timestamp: string;
}

export interface MercantilRefundRequest {
  amount: number;
  reason: string;
}

export interface MercantilRefundResponse {
  refund_id: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  estimated_completion: string;
}

// ============================================
// BINANCE PAY API TYPES
// ============================================

export interface BinancePayOrderRequest {
  env: {
    terminalType: 'WEB' | 'APP';
  };
  merchantTradeNo: string; // Our transaction ID
  orderAmount: number;
  currency: 'USDT' | 'BTC' | 'ETH' | 'BNB';
  goods: {
    goodsType: '01' | '02'; // 01=tangible, 02=virtual
    goodsCategory: string;
    referenceGoodsId: string;
    goodsName: string;
  };
  returnUrl: string;
  cancelUrl: string;
  webhookUrl: string;
}

export interface BinancePayOrderResponse {
  status: 'SUCCESS' | 'FAIL';
  code: string;
  data?: {
    prepayId: string;
    terminalType: string;
    expireTime: number; // Unix timestamp
    qrcodeLink: string;
    qrContent: string;
    checkoutUrl: string;
  };
  errorMessage?: string;
}

export interface BinancePayQueryRequest {
  merchantTradeNo: string;
}

export interface BinancePayQueryResponse {
  status: 'SUCCESS' | 'FAIL';
  code: string;
  data?: {
    merchantTradeNo: string;
    status: 'PAID' | 'PENDING' | 'EXPIRED' | 'FAILED';
    transactionId: string;
    totalFee: number;
    currency: string;
    paidAt?: number; // Unix timestamp
  };
}

export interface BinancePayWebhookPayload {
  bizType: 'PAY';
  bizId: string;
  bizIdStr: string;
  bizStatus: 'PAY_SUCCESS' | 'PAY_CLOSED';
  data: {
    merchantTradeNo: string;
    transactionId: string;
    totalFee: string;
    currency: string;
    productType: string;
    productName: string;
    paidAt: number;
  };
}

export interface BinancePayRefundRequest {
  refundRequestId: string; // Our refund ID
  prepayId: string;
  refundAmount: number;
  refundReason: string;
}

// ============================================
// MANUAL PAYMENT TYPES (Zelle, Crypto)
// ============================================

export interface ManualPaymentProof {
  paymentReference: string; // Zelle ref or crypto TX hash
  paymentProofUrl?: string; // Screenshot URL
  network?: 'ETHEREUM' | 'BSC' | 'TRON' | 'BITCOIN'; // For crypto
  notes?: string;
}

export interface ManualPaymentValidation {
  approved: boolean;
  adminNotes: string;
  validatedBy: string; // Admin user ID
  validatedAt: Date;
}

// ============================================
// TRANSACTION TYPES
// ============================================

export interface Transaction {
  id: string;
  
  // Relationships
  buyerId: string;
  sellerId: string;
  listingId: string;
  
  // Payment Details
  paymentMethod: PaymentMethodType;
  status: TransactionStatus;
  amount: number;
  currency: Currency;
  
  // External References
  externalTxId?: string; // Mercantil/Binance transaction ID
  paymentReference?: string; // Zelle ref, crypto hash
  paymentProofUrl?: string;
  
  // Escrow Management
  escrowHeldAt?: Date;
  escrowReleaseAt?: Date; // T+7 auto-release date
  releasedAt?: Date;
  
  // Dispute
  disputeReason?: string;
  disputeOpenedAt?: Date;
  adminNotes?: string;
  
  // Audit
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionStatusHistory {
  id: string;
  transactionId: string;
  fromStatus?: TransactionStatus;
  toStatus: TransactionStatus;
  changedBy: string; // userId or "SYSTEM" or "WEBHOOK"
  reason?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

// ============================================
// WEBHOOK LOG TYPES
// ============================================

export interface WebhookLog {
  id: string;
  provider: 'MERCANTIL' | 'BINANCE';
  event: string;
  payload: Record<string, any>;
  signature?: string;
  verified: boolean;
  processed: boolean;
  transactionId?: string;
  error?: string;
  createdAt: Date;
}

// ============================================
// DISPUTE TYPES
// ============================================

export enum DisputeReason {
  ITEM_NOT_RECEIVED = 'ITEM_NOT_RECEIVED',
  ITEM_NOT_AS_DESCRIBED = 'ITEM_NOT_AS_DESCRIBED',
  DAMAGED_ITEM = 'DAMAGED_ITEM',
  WRONG_ITEM = 'WRONG_ITEM',
  SELLER_UNRESPONSIVE = 'SELLER_UNRESPONSIVE',
  PAYMENT_ISSUE = 'PAYMENT_ISSUE',
  OTHER = 'OTHER',
}

export enum DisputeStatus {
  OPEN = 'OPEN',
  AWAITING_SELLER_RESPONSE = 'AWAITING_SELLER_RESPONSE',
  EVIDENCE_COLLECTION = 'EVIDENCE_COLLECTION',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum DisputeResolution {
  REFUND_BUYER = 'REFUND_BUYER',
  RELEASE_SELLER = 'RELEASE_SELLER',
  PARTIAL_REFUND = 'PARTIAL_REFUND',
}

export interface Dispute {
  id: string;
  transactionId: string;
  openedBy: string; // Buyer user ID
  reason: DisputeReason;
  description: string;
  evidence: DisputeEvidence[];
  status: DisputeStatus;
  resolution?: DisputeResolution;
  resolvedBy?: string; // Admin user ID
  resolvedAt?: Date;
  adminNotes?: string;
  responseDeadline: Date; // Seller has 48 hours
  createdAt: Date;
  updatedAt: Date;
}

export interface DisputeEvidence {
  id: string;
  disputeId: string;
  submittedBy: string; // User ID (buyer or seller)
  type: 'TEXT' | 'IMAGE' | 'DOCUMENT';
  content: string; // Text or URL
  description?: string;
  createdAt: Date;
}

// ============================================
// PAYOUT TYPES
// ============================================

export enum PayoutStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface Payout {
  id: string;
  sellerId: string;
  amount: number;
  currency: Currency;
  method: string; // "BANK_TRANSFER", "CRYPTO", etc.
  status: PayoutStatus;
  transactionIds: string[]; // Transactions included in this payout
  externalPayoutId?: string;
  completedAt?: Date;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface CreateTransactionRequest {
  listingId: string;
  paymentMethod: PaymentMethodType;
  amount: number;
  currency: Currency;
}

export interface CreateTransactionResponse {
  transaction: Transaction;
  paymentUrl?: string; // For redirect-based methods
  qrCode?: string; // For QR-based methods
  instructions?: string; // For manual methods
}

export interface SubmitPaymentProofRequest {
  transactionId: string;
  proof: ManualPaymentProof;
}

export interface ValidatePaymentRequest {
  transactionId: string;
  validation: ManualPaymentValidation;
}

export interface ConfirmDeliveryRequest {
  transactionId: string;
  rating?: number; // 1-5 stars
  review?: string;
}

export interface OpenDisputeRequest {
  transactionId: string;
  reason: DisputeReason;
  description: string;
  evidence?: Array<{
    type: 'TEXT' | 'IMAGE' | 'DOCUMENT';
    content: string;
    description?: string;
  }>;
}

export interface ResolveDisputeRequest {
  transactionId: string;
  resolution: DisputeResolution;
  adminNotes: string;
  partialAmount?: number; // For partial refunds
}

// ============================================
// STATE MACHINE TYPES
// ============================================

export type TransactionStatusTransition = {
  from: TransactionStatus;
  to: TransactionStatus;
  allowed: boolean;
  requiresAdmin?: boolean;
};

export const VALID_TRANSITIONS: Record<TransactionStatus, TransactionStatus[]> = {
  [TransactionStatus.INITIATED]: [
    TransactionStatus.PENDING_PAYMENT,
    TransactionStatus.CANCELLED,
  ],
  [TransactionStatus.PENDING_PAYMENT]: [
    TransactionStatus.PAYMENT_RECEIVED,
    TransactionStatus.VALIDATING,
    TransactionStatus.PAYMENT_FAILED,
    TransactionStatus.CANCELLED,
  ],
  [TransactionStatus.PAYMENT_RECEIVED]: [
    TransactionStatus.IN_ESCROW,
    TransactionStatus.PAYMENT_FAILED,
  ],
  [TransactionStatus.VALIDATING]: [
    TransactionStatus.IN_ESCROW,
    TransactionStatus.PAYMENT_FAILED,
    TransactionStatus.CANCELLED,
  ],
  [TransactionStatus.IN_ESCROW]: [
    TransactionStatus.DELIVERY_CONFIRMED,
    TransactionStatus.RELEASED,
    TransactionStatus.DISPUTED,
    TransactionStatus.REFUNDED,
  ],
  [TransactionStatus.DELIVERY_CONFIRMED]: [
    TransactionStatus.RELEASED,
    TransactionStatus.DISPUTED,
  ],
  [TransactionStatus.DISPUTED]: [
    TransactionStatus.RELEASED,
    TransactionStatus.REFUNDED,
    TransactionStatus.IN_ESCROW,
  ],
  // Terminal states (no transitions)
  [TransactionStatus.RELEASED]: [],
  [TransactionStatus.REFUNDED]: [],
  [TransactionStatus.PAYMENT_FAILED]: [],
  [TransactionStatus.CANCELLED]: [],
};

// ============================================
// UTILITY TYPES
// ============================================

export interface PaymentMethodConfig {
  type: PaymentMethodType;
  name: string;
  description: string;
  currencies: Currency[];
  isAutomated: boolean; // true for API-based, false for manual
  estimatedTime: string; // "Instant", "2-5 minutes", "Manual review"
  fees?: {
    percentage?: number;
    fixed?: number;
    currency: Currency;
  };
}

export const PAYMENT_METHODS: PaymentMethodConfig[] = [
  {
    type: PaymentMethodType.MERCANTIL_C2P,
    name: 'Mercantil C2P',
    description: 'Pago con tarjeta vinculada a teléfono',
    currencies: [Currency.VES],
    isAutomated: true,
    estimatedTime: 'Instant',
  },
  {
    type: PaymentMethodType.MERCANTIL_PAGO_MOVIL,
    name: 'Pago Móvil',
    description: 'Transferencia interbancaria móvil',
    currencies: [Currency.VES],
    isAutomated: true,
    estimatedTime: '2-5 minutes',
  },
  {
    type: PaymentMethodType.MERCANTIL_BOTON_PAGO,
    name: 'Botón de Pago Mercantil',
    description: 'Pago seguro con redirección',
    currencies: [Currency.VES],
    isAutomated: true,
    estimatedTime: 'Instant',
  },
  {
    type: PaymentMethodType.BINANCE_PAY,
    name: 'Binance Pay',
    description: 'Pago con criptomonedas',
    currencies: [Currency.USDT, Currency.BTC, Currency.ETH, Currency.BNB],
    isAutomated: true,
    estimatedTime: '5-15 minutes',
  },
  {
    type: PaymentMethodType.ZELLE,
    name: 'Zelle',
    description: 'Transferencia bancaria USA (verificación manual)',
    currencies: [Currency.USD],
    isAutomated: false,
    estimatedTime: 'Manual review (2 hours)',
  },
  {
    type: PaymentMethodType.CRYPTO_WALLET_MANUAL,
    name: 'Wallet Directa',
    description: 'Envío directo a wallet (verificación manual)',
    currencies: [Currency.USDT, Currency.BTC, Currency.ETH],
    isAutomated: false,
    estimatedTime: 'Manual review (after 6 confirmations)',
  },
];

// ============================================
// ERROR TYPES
// ============================================

export class PaymentError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
    public details?: any
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}

export class InvalidTransitionError extends PaymentError {
  constructor(from: TransactionStatus, to: TransactionStatus) {
    super(
      `Invalid state transition: ${from} -> ${to}`,
      'INVALID_TRANSITION',
      400,
      { from, to }
    );
    this.name = 'InvalidTransitionError';
  }
}

export class WebhookVerificationError extends PaymentError {
  constructor(provider: string) {
    super(
      `Webhook signature verification failed for ${provider}`,
      'WEBHOOK_VERIFICATION_FAILED',
      403,
      { provider }
    );
    this.name = 'WebhookVerificationError';
  }
}
