# 💳 PAYMENT ARCHITECTURE & DATA MODEL

**Document Version:** 1.0  
**Last Updated:** 2026-04-09  
**Owner:** Lead Architect  
**Status:** 🟡 DRAFT - Pending Review

---

## 🎯 ARCHITECTURE OVERVIEW

The Turpial Sound Marketplace payment system is designed as a **multi-channel escrow platform** that supports:

1. **Automated Integrations:** Mercantil Bank API, Binance Pay API
2. **Manual Verification:** Zelle, Direct Crypto Wallets
3. **Escrow Protection:** Funds held until delivery confirmation or timeout
4. **Dispute Resolution:** Admin intervention for failed/contested transactions

### Core Principles:
- **Idempotency:** Every payment operation must be idempotent (safe to retry)
- **Audit Trail:** Complete transaction history with timestamps
- **State Machine:** Strict state transitions prevent invalid flows
- **Security First:** All webhooks verified, all sensitive data encrypted

---

## 🗄️ DATABASE SCHEMA (Prisma)

### Core Models

```prisma
// ============================================
// PAYMENT METHOD ENUM
// ============================================
enum PaymentMethodType {
  MERCANTIL_C2P          // Mercantil C2P (Card to Phone)
  MERCANTIL_PAGO_MOVIL   // Mercantil Pago Móvil
  MERCANTIL_BOTON_PAGO   // Mercantil Botón de Pago
  BINANCE_PAY            // Binance Pay API (automated)
  ZELLE                  // Zelle (manual verification)
  CRYPTO_WALLET_MANUAL   // Direct crypto wallet (manual)
}

// ============================================
// TRANSACTION STATUS STATE MACHINE
// ============================================
enum TransactionStatus {
  // Initial States
  INITIATED              // User selected payment method
  PENDING_PAYMENT        // Awaiting payment confirmation
  
  // Payment Validation
  PAYMENT_RECEIVED       // Payment detected (webhook/manual)
  VALIDATING             // Admin reviewing manual payment
  PAYMENT_FAILED         // Payment rejected/failed
  
  // Escrow States
  IN_ESCROW              // Funds held, awaiting delivery
  DELIVERY_CONFIRMED     // Buyer confirmed receipt
  
  // Final States
  RELEASED               // Funds released to seller
  REFUNDED               // Funds returned to buyer
  DISPUTED               // Under dispute resolution
  CANCELLED              // Transaction cancelled
}

// ============================================
// MAIN TRANSACTION MODEL
// ============================================
model Transaction {
  id                String              @id @default(cuid())
  
  // Relationships
  buyerId           String
  buyer             User                @relation("BuyerTransactions", fields: [buyerId], references: [id])
  sellerId          String
  seller            User                @relation("SellerTransactions", fields: [sellerId], references: [id])
  listingId         String
  listing           MarketplaceListing  @relation(fields: [listingId], references: [id])
  
  // Payment Details
  paymentMethod     PaymentMethodType
  status            TransactionStatus   @default(INITIATED)
  amount            Decimal             @db.Decimal(10, 2)
  currency          String              @default("USD") // USD, VES, USDT, etc.
  
  // External References
  externalTxId      String?             // Mercantil/Binance transaction ID
  paymentReference  String?             // Zelle reference, wallet hash, etc.
  paymentProofUrl   String?             // Screenshot/proof upload URL
  
  // Escrow Management
  escrowHeldAt      DateTime?           // When funds entered escrow
  escrowReleaseAt   DateTime?           // Scheduled auto-release date (T+7)
  releasedAt        DateTime?           // Actual release timestamp
  
  // Dispute & Notes
  disputeReason     String?
  disputeOpenedAt   DateTime?
  adminNotes        String?             // Internal notes for manual review
  
  // Audit Trail
  statusHistory     TransactionStatusHistory[]
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
  
  @@index([buyerId])
  @@index([sellerId])
  @@index([status])
  @@index([paymentMethod])
  @@index([externalTxId])
}

// ============================================
// STATUS HISTORY (Audit Trail)
// ============================================
model TransactionStatusHistory {
  id            String              @id @default(cuid())
  transactionId String
  transaction   Transaction         @relation(fields: [transactionId], references: [id], onDelete: Cascade)
  
  fromStatus    TransactionStatus?  // null for initial state
  toStatus      TransactionStatus
  changedBy     String?             // userId or "SYSTEM" or "WEBHOOK"
  reason        String?             // Why the status changed
  metadata      Json?               // Additional context (webhook payload, etc.)
  
  createdAt     DateTime            @default(now())
  
  @@index([transactionId])
  @@index([createdAt])
}

// ============================================
// WEBHOOK LOG (Security & Debugging)
// ============================================
model WebhookLog {
  id            String    @id @default(cuid())
  provider      String    // "MERCANTIL", "BINANCE"
  event         String    // Event type from webhook
  payload       Json      // Full webhook payload
  signature     String?   // Webhook signature for verification
  verified      Boolean   @default(false)
  processed     Boolean   @default(false)
  transactionId String?   // Linked transaction if found
  error         String?   // Error message if processing failed
  
  createdAt     DateTime  @default(now())
  
  @@index([provider])
  @@index([transactionId])
  @@index([processed])
}

// ============================================
// PAYOUT RECORD (Seller Payments)
// ============================================
model Payout {
  id            String    @id @default(cuid())
  sellerId      String
  seller        User      @relation(fields: [sellerId], references: [id])
  
  amount        Decimal   @db.Decimal(10, 2)
  currency      String
  method        String    // "BANK_TRANSFER", "CRYPTO", etc.
  status        String    // "PENDING", "PROCESSING", "COMPLETED", "FAILED"
  
  transactionIds String[] // Array of transaction IDs included in this payout
  
  externalPayoutId String? // External payout reference
  completedAt   DateTime?
  failureReason String?
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@index([sellerId])
  @@index([status])
}
```

---

## 🔄 STATE MACHINE LOGIC

### Valid State Transitions

```typescript
const VALID_TRANSITIONS: Record<TransactionStatus, TransactionStatus[]> = {
  // From INITIATED
  INITIATED: ['PENDING_PAYMENT', 'CANCELLED'],
  
  // From PENDING_PAYMENT
  PENDING_PAYMENT: [
    'PAYMENT_RECEIVED',    // Automated webhook
    'VALIDATING',          // Manual payment submitted
    'PAYMENT_FAILED',      // Payment declined
    'CANCELLED'
  ],
  
  // From PAYMENT_RECEIVED (automated)
  PAYMENT_RECEIVED: [
    'IN_ESCROW',           // Auto-move to escrow
    'PAYMENT_FAILED'       // Chargeback/reversal
  ],
  
  // From VALIDATING (manual)
  VALIDATING: [
    'IN_ESCROW',           // Admin approved
    'PAYMENT_FAILED',      // Admin rejected
    'CANCELLED'
  ],
  
  // From IN_ESCROW
  IN_ESCROW: [
    'DELIVERY_CONFIRMED',  // Buyer confirmed
    'RELEASED',            // Auto-release after T+7
    'DISPUTED',            // Buyer opened dispute
    'REFUNDED'             // Admin refund
  ],
  
  // From DELIVERY_CONFIRMED
  DELIVERY_CONFIRMED: [
    'RELEASED',            // Immediate release
    'DISPUTED'             // Late dispute
  ],
  
  // From DISPUTED
  DISPUTED: [
    'RELEASED',            // Dispute resolved in seller's favor
    'REFUNDED',            // Dispute resolved in buyer's favor
    'IN_ESCROW'            // Dispute withdrawn
  ],
  
  // Terminal States (no transitions)
  RELEASED: [],
  REFUNDED: [],
  PAYMENT_FAILED: [],
  CANCELLED: []
};
```

### State Transition Rules

```typescript
/**
 * Validates if a state transition is allowed
 */
function canTransition(
  from: TransactionStatus,
  to: TransactionStatus
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Executes a state transition with audit logging
 */
async function transitionStatus(
  transactionId: string,
  toStatus: TransactionStatus,
  changedBy: string,
  reason?: string,
  metadata?: any
): Promise<Transaction> {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId }
  });
  
  if (!transaction) {
    throw new Error('Transaction not found');
  }
  
  if (!canTransition(transaction.status, toStatus)) {
    throw new Error(
      `Invalid transition: ${transaction.status} -> ${toStatus}`
    );
  }
  
  // Update transaction and create history record
  return await prisma.$transaction([
    prisma.transaction.update({
      where: { id: transactionId },
      data: { status: toStatus }
    }),
    prisma.transactionStatusHistory.create({
      data: {
        transactionId,
        fromStatus: transaction.status,
        toStatus,
        changedBy,
        reason,
        metadata
      }
    })
  ]);
}
```

---

## ⏱️ ESCROW RELEASE LOGIC

### Release Triggers

1. **Buyer Confirmation (Immediate)**
   - Buyer clicks "I received the item"
   - Status: `IN_ESCROW` → `DELIVERY_CONFIRMED` → `RELEASED`
   - Funds released within 24 hours

2. **Auto-Release (T+7 Default)**
   - If buyer doesn't confirm after 7 days
   - Status: `IN_ESCROW` → `RELEASED`
   - Scheduled job checks `escrowReleaseAt` timestamp

3. **Admin Override**
   - Manual release by admin
   - Requires admin notes/justification

### Implementation Strategy

```typescript
// Cron job runs daily at 00:00 UTC
async function processAutoReleases() {
  const now = new Date();
  
  const eligibleTransactions = await prisma.transaction.findMany({
    where: {
      status: 'IN_ESCROW',
      escrowReleaseAt: {
        lte: now // Release date has passed
      }
    }
  });
  
  for (const tx of eligibleTransactions) {
    await transitionStatus(
      tx.id,
      'RELEASED',
      'SYSTEM',
      'Auto-release after escrow period'
    );
    
    // Trigger payout to seller
    await createSellerPayout(tx.sellerId, tx.amount, tx.currency);
    
    // Send notifications
    await notifyBuyer(tx.buyerId, 'escrow_released');
    await notifySeller(tx.sellerId, 'payment_released');
  }
}
```

---

## 🔐 SECURITY CONSIDERATIONS

### Webhook Signature Verification

```typescript
import crypto from 'crypto';

function verifyMercantilWebhook(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

### Idempotency Keys

```typescript
// Prevent duplicate payment processing
async function processPayment(
  transactionId: string,
  idempotencyKey: string
) {
  const existing = await redis.get(`payment:${idempotencyKey}`);
  
  if (existing) {
    return JSON.parse(existing); // Return cached result
  }
  
  const result = await executePayment(transactionId);
  
  await redis.set(
    `payment:${idempotencyKey}`,
    JSON.stringify(result),
    'EX',
    86400 // 24 hour cache
  );
  
  return result;
}
```

### Rate Limiting

```typescript
// Prevent webhook spam/DDoS
import { Ratelimit } from '@upstash/ratelimit';

const webhookRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
  analytics: true
});

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const { success } = await webhookRateLimit.limit(ip);
  
  if (!success) {
    return new Response('Too Many Requests', { status: 429 });
  }
  
  // Process webhook...
}
```

---

## 📊 PAYMENT METHOD SPECIFICS

### Mercantil Bank
- **Methods:** C2P, Pago Móvil, Botón de Pago
- **Currency:** VES (Bolívares)
- **Settlement:** Immediate (webhook notification)
- **Webhook Events:** `payment.success`, `payment.failed`, `payment.refunded`

### Binance Pay
- **Methods:** USDT, BTC, ETH, BNB
- **Currency:** Crypto (converted to USD equivalent)
- **Settlement:** 1-3 confirmations (5-15 minutes)
- **Webhook Events:** `payment.completed`, `payment.expired`

### Zelle (Manual)
- **Currency:** USD
- **Verification:** Admin reviews screenshot + reference number
- **Settlement:** Manual approval (SLA: 2 hours during business hours)

### Crypto Wallet (Manual)
- **Currency:** USDT, BTC, ETH
- **Verification:** Admin checks blockchain explorer with provided hash
- **Settlement:** Manual approval after 6+ confirmations

---

## 🔄 INTEGRATION POINTS

### Required API Endpoints

```typescript
// Payment initiation
POST /api/marketplace/transactions/create
POST /api/marketplace/transactions/:id/pay

// Webhooks
POST /api/webhooks/mercantil
POST /api/webhooks/binance

// Manual verification
POST /api/marketplace/transactions/:id/submit-proof
PATCH /api/admin/transactions/:id/validate

// Buyer actions
POST /api/marketplace/transactions/:id/confirm-delivery
POST /api/marketplace/transactions/:id/dispute

// Admin actions
PATCH /api/admin/transactions/:id/release
PATCH /api/admin/transactions/:id/refund
```

---

## 📈 MONITORING & ALERTS

### Key Metrics to Track

1. **Payment Success Rate:** % of successful payments by method
2. **Escrow Duration:** Average time in escrow before release
3. **Dispute Rate:** % of transactions disputed
4. **Manual Validation Time:** Time to approve manual payments
5. **Webhook Failures:** Failed webhook deliveries requiring retry

### Alert Triggers

- Payment success rate drops below 95%
- Manual validation queue exceeds 50 pending
- Webhook failure rate exceeds 5%
- Disputed transaction not resolved within 48 hours

---

## 🚀 NEXT STEPS

1. **Review & Approve Schema:** Get stakeholder sign-off on data model
2. **Create Prisma Migration:** Generate and test migration scripts
3. **Implement State Machine:** Build transition validation logic
4. **Setup Webhook Infrastructure:** Create endpoints with signature verification
5. **Build Admin Dashboard:** Manual validation interface

---

**Related Documents:**
- [`01_ROADMAP_AND_STATUS.md`](./01_ROADMAP_AND_STATUS.md)
- [`03_API_INTEGRATION_PLAN.md`](./03_API_INTEGRATION_PLAN.md)
- [`04_DISPUTES_&_SECURITY.md`](./04_DISPUTES_&_SECURITY.md)
