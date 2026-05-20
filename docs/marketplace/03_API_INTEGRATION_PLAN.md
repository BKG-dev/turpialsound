# 🔌 API INTEGRATION PLAN

**Document Version:** 1.0  
**Last Updated:** 2026-04-09  
**Owner:** Lead Architect  
**Status:** 🟡 DRAFT - Pending Credentials

---

## 🎯 INTEGRATION OVERVIEW

This document details the technical implementation for integrating:
1. **Mercantil Bank API** (C2P, Pago Móvil, Botón de Pago)
2. **Binance Pay API** (Crypto payments)
3. **Manual Payment Verification** (Zelle, Direct Wallets)

---

## 🏦 MERCANTIL BANK INTEGRATION

### API Documentation Reference
- **Portal:** https://apiportal.mercantilbanco.com/mercantil-banco/produccion/
- **Environment:** Sandbox (testing) → Production
- **Authentication:** OAuth 2.0 / API Key (TBD based on docs)

### Supported Payment Methods

#### 1. C2P (Card to Phone)
**Description:** Customer pays using their card linked to phone number

**Flow:**
```
1. Customer initiates payment
2. Backend calls Mercantil C2P API with amount + phone
3. Customer receives SMS to authorize
4. Customer confirms via SMS/app
5. Webhook notifies our system
6. Transaction moves to IN_ESCROW
```

#### 2. Pago Móvil
**Description:** Interbank mobile payment system (Venezuela standard)

**Flow:**
```
1. Customer selects Pago Móvil
2. System displays our merchant phone/ID
3. Customer makes transfer from their bank app
4. Customer submits reference number
5. Webhook confirms payment (if automated)
6. OR Admin validates manually
```

#### 3. Botón de Pago
**Description:** Payment button widget (similar to PayPal button)

**Flow:**
```
1. Customer clicks "Pay with Mercantil"
2. Redirects to Mercantil hosted page
3. Customer logs in and authorizes
4. Redirects back with payment token
5. Backend confirms payment via API
6. Transaction moves to IN_ESCROW
```

---

### Mercantil API Endpoints (Estimated)

```typescript
// Base URL (Sandbox)
const MERCANTIL_BASE_URL = process.env.MERCANTIL_API_URL;
const MERCANTIL_API_KEY = process.env.MERCANTIL_API_KEY;

// ============================================
// 1. CREATE PAYMENT
// ============================================
POST /api/v1/payments/create
Headers:
  Authorization: Bearer {API_KEY}
  Content-Type: application/json

Request Body:
{
  "amount": 1000.50,
  "currency": "VES",
  "method": "C2P" | "PAGO_MOVIL" | "BOTON_PAGO",
  "customer": {
    "phone": "+58412XXXXXXX",
    "email": "customer@example.com",
    "name": "Juan Pérez"
  },
  "reference": "TXN-123456", // Our internal transaction ID
  "description": "Compra en Turpial Sound Marketplace",
  "callback_url": "https://turpialsound.com/api/webhooks/mercantil",
  "return_url": "https://turpialsound.com/marketplace/payment/success"
}

Response:
{
  "payment_id": "MERC-789012",
  "status": "PENDING",
  "payment_url": "https://pay.mercantil.com/...", // For Botón de Pago
  "expires_at": "2026-04-09T16:00:00Z"
}

// ============================================
// 2. CHECK PAYMENT STATUS
// ============================================
GET /api/v1/payments/{payment_id}
Headers:
  Authorization: Bearer {API_KEY}

Response:
{
  "payment_id": "MERC-789012",
  "status": "COMPLETED" | "PENDING" | "FAILED" | "EXPIRED",
  "amount": 1000.50,
  "currency": "VES",
  "reference": "TXN-123456",
  "completed_at": "2026-04-09T15:45:00Z"
}

// ============================================
// 3. REFUND PAYMENT
// ============================================
POST /api/v1/payments/{payment_id}/refund
Headers:
  Authorization: Bearer {API_KEY}
  Content-Type: application/json

Request Body:
{
  "amount": 1000.50, // Full or partial refund
  "reason": "Producto no disponible"
}

Response:
{
  "refund_id": "REF-456789",
  "status": "PROCESSING",
  "estimated_completion": "2026-04-10T15:00:00Z"
}
```

---

### Mercantil Webhook Implementation

```typescript
// /app/api/webhooks/mercantil/route.ts

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { transitionStatus } from '@/lib/payment-state-machine';

export async function POST(request: NextRequest) {
  try {
    // 1. Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-mercantil-signature');
    
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      );
    }
    
    // 2. Verify webhook signature
    const isValid = verifyMercantilSignature(
      rawBody,
      signature,
      process.env.MERCANTIL_WEBHOOK_SECRET!
    );
    
    if (!isValid) {
      await logWebhook('MERCANTIL', rawBody, signature, false);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 403 }
      );
    }
    
    // 3. Parse payload
    const payload = JSON.parse(rawBody);
    
    // 4. Log webhook
    await logWebhook('MERCANTIL', payload, signature, true);
    
    // 5. Process event
    await processMercantilEvent(payload);
    
    // 6. Return 200 immediately (acknowledge receipt)
    return NextResponse.json({ received: true });
    
  } catch (error) {
    console.error('Mercantil webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// SIGNATURE VERIFICATION
// ============================================
function verifyMercantilSignature(
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

// ============================================
// EVENT PROCESSOR
// ============================================
async function processMercantilEvent(payload: any) {
  const { event, data } = payload;
  
  switch (event) {
    case 'payment.completed':
      await handlePaymentCompleted(data);
      break;
      
    case 'payment.failed':
      await handlePaymentFailed(data);
      break;
      
    case 'payment.refunded':
      await handlePaymentRefunded(data);
      break;
      
    default:
      console.warn('Unknown Mercantil event:', event);
  }
}

async function handlePaymentCompleted(data: any) {
  const { payment_id, reference, amount } = data;
  
  // Find transaction by our internal reference
  const transaction = await prisma.transaction.findFirst({
    where: { id: reference }
  });
  
  if (!transaction) {
    throw new Error(`Transaction not found: ${reference}`);
  }
  
  // Update transaction
  await prisma.transaction.update({
    where: { id: transaction.id },
    data: {
      externalTxId: payment_id,
      status: 'PAYMENT_RECEIVED'
    }
  });
  
  // Transition to escrow
  await transitionStatus(
    transaction.id,
    'IN_ESCROW',
    'WEBHOOK',
    'Payment confirmed by Mercantil',
    { payment_id, amount }
  );
  
  // Set escrow release date (T+7)
  const releaseDate = new Date();
  releaseDate.setDate(releaseDate.getDate() + 7);
  
  await prisma.transaction.update({
    where: { id: transaction.id },
    data: {
      escrowHeldAt: new Date(),
      escrowReleaseAt: releaseDate
    }
  });
  
  // Send notifications
  // await notifyBuyer(transaction.buyerId, 'payment_confirmed');
  // await notifySeller(transaction.sellerId, 'sale_pending');
}
```

---

## 💰 BINANCE PAY INTEGRATION

### API Documentation Reference
- **Portal:** https://developers.binance.com/docs/binance-pay/introduction
- **Environment:** Testnet → Mainnet
- **Authentication:** API Key + Secret (HMAC SHA256)

### Integration Strategy Decision

**OPTION A: Merchant API (Automated)** ✅ RECOMMENDED
- Full API integration
- Automatic payment detection
- Webhook notifications
- Better UX (no manual steps)

**OPTION B: Manual Wallet Verification**
- Customer sends to our wallet address
- Customer submits transaction hash
- Admin verifies on blockchain explorer
- Slower, more manual work

---

### Binance Pay API Endpoints

```typescript
// Base URL
const BINANCE_PAY_URL = 'https://bpay.binanceapi.com';
const BINANCE_API_KEY = process.env.BINANCE_PAY_API_KEY;
const BINANCE_SECRET = process.env.BINANCE_PAY_SECRET;

// ============================================
// 1. CREATE ORDER
// ============================================
POST /binancepay/openapi/v2/order
Headers:
  Content-Type: application/json
  BinancePay-Timestamp: {timestamp}
  BinancePay-Nonce: {random_string}
  BinancePay-Certificate-SN: {api_key}
  BinancePay-Signature: {signature}

Request Body:
{
  "env": {
    "terminalType": "WEB"
  },
  "merchantTradeNo": "TXN-123456", // Our transaction ID
  "orderAmount": 50.00,
  "currency": "USDT",
  "goods": {
    "goodsType": "02", // Virtual goods
    "goodsCategory": "Z000", // Others
    "referenceGoodsId": "LISTING-789",
    "goodsName": "Turpial Sound Marketplace Item"
  },
  "returnUrl": "https://turpialsound.com/marketplace/payment/success",
  "cancelUrl": "https://turpialsound.com/marketplace/payment/cancel",
  "webhookUrl": "https://turpialsound.com/api/webhooks/binance"
}

Response:
{
  "status": "SUCCESS",
  "code": "000000",
  "data": {
    "prepayId": "29383937493038367292",
    "terminalType": "WEB",
    "expireTime": 1650000000000,
    "qrcodeLink": "https://qr.binance.com/...",
    "qrContent": "...",
    "checkoutUrl": "https://pay.binance.com/checkout/..."
  }
}

// ============================================
// 2. QUERY ORDER
// ============================================
POST /binancepay/openapi/v2/order/query
Headers: [Same as above]

Request Body:
{
  "merchantTradeNo": "TXN-123456"
}

Response:
{
  "status": "SUCCESS",
  "code": "000000",
  "data": {
    "merchantTradeNo": "TXN-123456",
    "status": "PAID" | "PENDING" | "EXPIRED" | "FAILED",
    "transactionId": "BINANCE-TX-123",
    "totalFee": 50.00,
    "currency": "USDT",
    "paidAt": 1650000000000
  }
}

// ============================================
// 3. REFUND
// ============================================
POST /binancepay/openapi/v2/refund
Headers: [Same as above]

Request Body:
{
  "refundRequestId": "REF-123456", // Our refund ID
  "prepayId": "29383937493038367292",
  "refundAmount": 50.00,
  "refundReason": "Product unavailable"
}
```

---

### Binance Pay Webhook Implementation

```typescript
// /app/api/webhooks/binance/route.ts

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('binancepay-signature');
    
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      );
    }
    
    // Verify signature
    const isValid = verifyBinanceSignature(
      rawBody,
      signature,
      process.env.BINANCE_PAY_SECRET!
    );
    
    if (!isValid) {
      await logWebhook('BINANCE', rawBody, signature, false);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 403 }
      );
    }
    
    const payload = JSON.parse(rawBody);
    await logWebhook('BINANCE', payload, signature, true);
    
    // Process event
    await processBinanceEvent(payload);
    
    return NextResponse.json({ returnCode: 'SUCCESS' });
    
  } catch (error) {
    console.error('Binance webhook error:', error);
    return NextResponse.json(
      { returnCode: 'FAIL' },
      { status: 500 }
    );
  }
}

function verifyBinanceSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const timestamp = JSON.parse(payload).bizIdStr; // Binance uses bizIdStr
  const expectedSignature = crypto
    .createHmac('sha512', secret)
    .update(timestamp + payload)
    .digest('hex')
    .toUpperCase();
  
  return signature === expectedSignature;
}

async function processBinanceEvent(payload: any) {
  const { bizType, bizStatus, data } = payload;
  
  if (bizType === 'PAY' && bizStatus === 'PAY_SUCCESS') {
    await handleBinancePaymentSuccess(data);
  } else if (bizType === 'PAY' && bizStatus === 'PAY_CLOSED') {
    await handleBinancePaymentFailed(data);
  }
}
```

---

## 📝 MANUAL PAYMENT VERIFICATION

### Zelle Flow

```typescript
// Customer submits Zelle payment proof
POST /api/marketplace/transactions/:id/submit-proof

Request Body:
{
  "paymentReference": "ZELLE-REF-123456",
  "paymentProofUrl": "https://storage.../screenshot.jpg",
  "notes": "Sent from my Bank of America account"
}

// Admin validates
PATCH /api/admin/transactions/:id/validate

Request Body:
{
  "approved": true,
  "adminNotes": "Verified in Zelle dashboard"
}
```

### Crypto Wallet Flow

```typescript
// Customer submits transaction hash
POST /api/marketplace/transactions/:id/submit-proof

Request Body:
{
  "paymentReference": "0x1234567890abcdef...", // TX hash
  "network": "ETHEREUM" | "BSC" | "TRON",
  "notes": "Sent 50 USDT"
}

// Admin verifies on blockchain explorer
// Then approves via admin panel
```

---

## 🔄 RETRY & ERROR HANDLING

### Webhook Retry Strategy

```typescript
// If webhook processing fails, implement exponential backoff
const RETRY_DELAYS = [1000, 5000, 15000, 60000, 300000]; // ms

async function processWebhookWithRetry(
  webhookId: string,
  processor: () => Promise<void>
) {
  for (let attempt = 0; attempt < RETRY_DELAYS.length; attempt++) {
    try {
      await processor();
      
      // Mark as processed
      await prisma.webhookLog.update({
        where: { id: webhookId },
        data: { processed: true }
      });
      
      return;
    } catch (error) {
      console.error(`Webhook retry ${attempt + 1} failed:`, error);
      
      if (attempt < RETRY_DELAYS.length - 1) {
        await new Promise(resolve => 
          setTimeout(resolve, RETRY_DELAYS[attempt])
        );
      } else {
        // Final failure - alert admin
        await prisma.webhookLog.update({
          where: { id: webhookId },
          data: { 
            error: error.message,
            processed: false
          }
        });
        
        // Send alert
        // await alertAdmin('webhook_failed', { webhookId, error });
      }
    }
  }
}
```

---

## 🧪 TESTING STRATEGY

### Sandbox/Testnet Testing

1. **Mercantil Sandbox**
   - Request sandbox credentials from Mercantil
   - Test all 3 payment methods (C2P, Pago Móvil, Botón)
   - Verify webhook delivery and signature
   - Test refund flow

2. **Binance Testnet**
   - Use Binance Pay testnet environment
   - Test USDT, BTC, ETH payments
   - Verify webhook events
   - Test order expiration

3. **Manual Methods**
   - Mock admin validation flow
   - Test proof upload (images, text)
   - Verify state transitions

---

## 📋 ENVIRONMENT VARIABLES NEEDED

```env
# Mercantil Bank
MERCANTIL_API_URL=https://sandbox.mercantilbanco.com/api
MERCANTIL_API_KEY=your_api_key
MERCANTIL_WEBHOOK_SECRET=your_webhook_secret

# Binance Pay
BINANCE_PAY_API_KEY=your_api_key
BINANCE_PAY_SECRET=your_secret
BINANCE_PAY_ENV=testnet # or mainnet

# Manual Payments
ZELLE_ADMIN_EMAIL=admin@turpialsound.com
CRYPTO_WALLET_ADDRESS_USDT=0x...
CRYPTO_WALLET_ADDRESS_BTC=bc1...

# Notifications
SENDGRID_API_KEY=your_key
ADMIN_ALERT_EMAIL=alerts@turpialsound.com
```

---

## 🚀 IMPLEMENTATION CHECKLIST

### Phase 1: Mercantil Integration
- [ ] Request sandbox credentials
- [ ] Implement API client with authentication
- [ ] Create payment initiation endpoints
- [ ] Build webhook receiver with signature verification
- [ ] Test all 3 payment methods in sandbox
- [ ] Implement refund functionality
- [ ] Add error handling and retries

### Phase 2: Binance Pay Integration
- [ ] Setup Binance Pay merchant account
- [ ] Implement HMAC signature generation
- [ ] Create order creation endpoint
- [ ] Build webhook receiver
- [ ] Test with testnet USDT
- [ ] Implement order query for status checks
- [ ] Add refund support

### Phase 3: Manual Verification
- [ ] Build proof upload endpoint (with file storage)
- [ ] Create admin validation UI
- [ ] Implement blockchain explorer links
- [ ] Add admin notification system
- [ ] Test end-to-end manual flow

---

**Related Documents:**
- [`01_ROADMAP_AND_STATUS.md`](./01_ROADMAP_AND_STATUS.md)
- [`02_PAYMENT_ARCHITECTURE.md`](./02_PAYMENT_ARCHITECTURE.md)
- [`04_DISPUTES_&_SECURITY.md`](./04_DISPUTES_&_SECURITY.md)
