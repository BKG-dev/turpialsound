# 🛡️ DISPUTES & SECURITY PROTOCOL

**Document Version:** 1.0  
**Last Updated:** 2026-04-09  
**Owner:** Lead Architect  
**Status:** 🟡 DRAFT - Pending Review

---

## 🎯 OVERVIEW

This document defines the security measures and dispute resolution protocols for the Turpial Sound Marketplace payment system.

---

## 🔐 SECURITY MEASURES

### 1. Webhook Security

#### Signature Verification (MANDATORY)
All incoming webhooks MUST be verified before processing:

```typescript
// NEVER process a webhook without signature verification
async function handleWebhook(request: Request) {
  const signature = request.headers.get('x-signature');
  const rawBody = await request.text();
  
  // CRITICAL: Verify BEFORE parsing
  if (!verifySignature(rawBody, signature)) {
    await logSecurityEvent('INVALID_WEBHOOK_SIGNATURE', {
      ip: request.headers.get('x-forwarded-for'),
      timestamp: new Date()
    });
    
    return new Response('Forbidden', { status: 403 });
  }
  
  // Now safe to process
  const payload = JSON.parse(rawBody);
  await processWebhook(payload);
}
```

#### Rate Limiting
Prevent webhook spam and DDoS attacks:

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

const webhookRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 m'), // 20 requests per minute
  analytics: true,
  prefix: 'webhook_ratelimit'
});

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const { success, limit, remaining } = await webhookRateLimit.limit(ip);
  
  if (!success) {
    await logSecurityEvent('WEBHOOK_RATE_LIMIT_EXCEEDED', { ip });
    return new Response('Too Many Requests', { status: 429 });
  }
  
  // Process webhook...
}
```

#### IP Whitelisting (Optional)
For production, consider whitelisting known provider IPs:

```typescript
const ALLOWED_IPS = {
  MERCANTIL: ['190.x.x.x', '200.x.x.x'], // Get from Mercantil docs
  BINANCE: ['18.x.x.x', '52.x.x.x']      // Get from Binance docs
};

function isAllowedIP(ip: string, provider: string): boolean {
  return ALLOWED_IPS[provider]?.includes(ip) ?? false;
}
```

---

### 2. Idempotency Protection

Prevent duplicate payment processing:

```typescript
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

async function processPaymentIdempotent(
  transactionId: string,
  idempotencyKey: string,
  processor: () => Promise<any>
) {
  const cacheKey = `payment:idempotency:${idempotencyKey}`;
  
  // Check if already processed
  const cached = await redis.get(cacheKey);
  if (cached) {
    console.log('Idempotent request detected, returning cached result');
    return JSON.parse(cached as string);
  }
  
  // Process payment
  const result = await processor();
  
  // Cache result for 24 hours
  await redis.set(
    cacheKey,
    JSON.stringify(result),
    { ex: 86400 }
  );
  
  return result;
}

// Usage in webhook
async function handlePaymentWebhook(payload: any) {
  const idempotencyKey = payload.payment_id; // Use external payment ID
  
  await processPaymentIdempotent(
    payload.reference,
    idempotencyKey,
    async () => {
      // Actual payment processing logic
      await transitionStatus(payload.reference, 'IN_ESCROW', 'WEBHOOK');
      return { success: true };
    }
  );
}
```

---

### 3. Data Encryption

#### Sensitive Data at Rest
```typescript
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!; // 32 bytes
const ALGORITHM = 'aes-256-gcm';

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Return: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decrypt(encryptedData: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// Store encrypted payment references
await prisma.transaction.create({
  data: {
    paymentReference: encrypt(sensitiveReference),
    // ...
  }
});
```

---

### 4. SQL Injection Prevention

Always use Prisma's parameterized queries (NEVER raw SQL with user input):

```typescript
// ✅ SAFE: Prisma parameterized query
const transaction = await prisma.transaction.findFirst({
  where: { id: userProvidedId }
});

// ❌ DANGEROUS: Raw SQL with user input
const result = await prisma.$queryRaw`
  SELECT * FROM Transaction WHERE id = ${userProvidedId}
`; // Still safe with Prisma, but avoid if possible

// ❌ NEVER DO THIS:
const query = `SELECT * FROM Transaction WHERE id = '${userProvidedId}'`;
```

---

### 5. Access Control

#### Role-Based Permissions
```typescript
enum UserRole {
  BUYER = 'BUYER',
  SELLER = 'SELLER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

const PERMISSIONS = {
  VIEW_TRANSACTION: [UserRole.BUYER, UserRole.SELLER, UserRole.ADMIN],
  VALIDATE_PAYMENT: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
  RELEASE_ESCROW: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
  REFUND_PAYMENT: [UserRole.SUPER_ADMIN],
  VIEW_ALL_TRANSACTIONS: [UserRole.ADMIN, UserRole.SUPER_ADMIN]
};

function hasPermission(userRole: UserRole, action: string): boolean {
  return PERMISSIONS[action]?.includes(userRole) ?? false;
}

// Middleware
async function requirePermission(action: string) {
  const session = await getServerSession();
  
  if (!session?.user) {
    throw new Error('Unauthorized');
  }
  
  if (!hasPermission(session.user.role, action)) {
    throw new Error('Forbidden');
  }
}
```

#### Transaction Ownership Validation
```typescript
async function validateTransactionAccess(
  transactionId: string,
  userId: string,
  userRole: UserRole
) {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId }
  });
  
  if (!transaction) {
    throw new Error('Transaction not found');
  }
  
  // Admins can access all transactions
  if (userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN) {
    return transaction;
  }
  
  // Users can only access their own transactions
  if (transaction.buyerId !== userId && transaction.sellerId !== userId) {
    throw new Error('Forbidden: Not your transaction');
  }
  
  return transaction;
}
```

---

## ⚖️ DISPUTE RESOLUTION PROTOCOL

### Dispute Types

1. **Item Not Received** - Buyer claims they never received the item
2. **Item Not as Described** - Item doesn't match listing description
3. **Damaged Item** - Item arrived damaged
4. **Wrong Item** - Seller sent wrong item
5. **Seller Unresponsive** - Seller not communicating
6. **Payment Issue** - Payment processed but not reflected

---

### Dispute Flow

```
1. Buyer opens dispute (within 14 days of purchase)
   ↓
2. Transaction status → DISPUTED
   ↓
3. Seller notified (48 hours to respond)
   ↓
4. Evidence collection period (7 days)
   - Buyer uploads proof
   - Seller uploads proof
   ↓
5. Admin review
   ↓
6. Resolution:
   - Full refund to buyer (REFUNDED)
   - Release to seller (RELEASED)
   - Partial refund (custom logic)
```

---

### Implementation

```typescript
// ============================================
// OPEN DISPUTE
// ============================================
async function openDispute(
  transactionId: string,
  userId: string,
  reason: string,
  evidence?: string[]
) {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId }
  });
  
  if (!transaction) {
    throw new Error('Transaction not found');
  }
  
  // Only buyer can open dispute
  if (transaction.buyerId !== userId) {
    throw new Error('Only buyer can open dispute');
  }
  
  // Must be in escrow
  if (transaction.status !== 'IN_ESCROW') {
    throw new Error('Can only dispute transactions in escrow');
  }
  
  // Check dispute window (14 days from escrow)
  const daysSinceEscrow = Math.floor(
    (Date.now() - transaction.escrowHeldAt!.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  if (daysSinceEscrow > 14) {
    throw new Error('Dispute window expired (14 days)');
  }
  
  // Update transaction
  await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      status: 'DISPUTED',
      disputeReason: reason,
      disputeOpenedAt: new Date()
    }
  });
  
  // Create dispute record
  await prisma.dispute.create({
    data: {
      transactionId,
      openedBy: userId,
      reason,
      evidence: evidence || [],
      status: 'OPEN',
      responseDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours
    }
  });
  
  // Notify seller
  await notifySeller(transaction.sellerId, 'dispute_opened', {
    transactionId,
    reason,
    deadline: '48 hours'
  });
  
  // Notify admin
  await notifyAdmin('dispute_opened', {
    transactionId,
    buyerId: userId,
    sellerId: transaction.sellerId,
    reason
  });
}

// ============================================
// SUBMIT DISPUTE EVIDENCE
// ============================================
async function submitDisputeEvidence(
  transactionId: string,
  userId: string,
  evidence: {
    type: 'TEXT' | 'IMAGE' | 'DOCUMENT';
    content: string; // Text or URL
    description?: string;
  }[]
) {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { dispute: true }
  });
  
  if (!transaction || transaction.status !== 'DISPUTED') {
    throw new Error('No active dispute for this transaction');
  }
  
  // Verify user is buyer or seller
  if (transaction.buyerId !== userId && transaction.sellerId !== userId) {
    throw new Error('Not authorized');
  }
  
  // Add evidence
  await prisma.disputeEvidence.createMany({
    data: evidence.map(e => ({
      disputeId: transaction.dispute!.id,
      submittedBy: userId,
      type: e.type,
      content: e.content,
      description: e.description
    }))
  });
}

// ============================================
// ADMIN RESOLVE DISPUTE
// ============================================
async function resolveDispute(
  transactionId: string,
  adminId: string,
  resolution: 'REFUND_BUYER' | 'RELEASE_SELLER' | 'PARTIAL_REFUND',
  notes: string,
  partialAmount?: number
) {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId }
  });
  
  if (!transaction || transaction.status !== 'DISPUTED') {
    throw new Error('No active dispute');
  }
  
  switch (resolution) {
    case 'REFUND_BUYER':
      await transitionStatus(
        transactionId,
        'REFUNDED',
        adminId,
        `Dispute resolved: ${notes}`
      );
      await processRefund(transaction);
      break;
      
    case 'RELEASE_SELLER':
      await transitionStatus(
        transactionId,
        'RELEASED',
        adminId,
        `Dispute resolved: ${notes}`
      );
      await releaseFundsToSeller(transaction);
      break;
      
    case 'PARTIAL_REFUND':
      if (!partialAmount) {
        throw new Error('Partial amount required');
      }
      // Custom logic for partial refund
      await processPartialRefund(transaction, partialAmount);
      break;
  }
  
  // Update dispute record
  await prisma.dispute.update({
    where: { transactionId },
    data: {
      status: 'RESOLVED',
      resolution,
      resolvedBy: adminId,
      resolvedAt: new Date(),
      adminNotes: notes
    }
  });
  
  // Notify both parties
  await notifyBuyer(transaction.buyerId, 'dispute_resolved', { resolution });
  await notifySeller(transaction.sellerId, 'dispute_resolved', { resolution });
}
```

---

## 🚨 FAILED TRANSACTION HANDLING

### Payment Failures

```typescript
async function handlePaymentFailure(
  transactionId: string,
  reason: string,
  errorCode?: string
) {
  await transitionStatus(
    transactionId,
    'PAYMENT_FAILED',
    'SYSTEM',
    reason,
    { errorCode }
  );
  
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { buyer: true, listing: true }
  });
  
  // Notify buyer
  await notifyBuyer(transaction!.buyerId, 'payment_failed', {
    reason,
    listingTitle: transaction!.listing.title,
    suggestedAction: 'Try a different payment method'
  });
  
  // Log for analytics
  await logPaymentFailure({
    transactionId,
    paymentMethod: transaction!.paymentMethod,
    amount: transaction!.amount,
    reason,
    errorCode
  });
}
```

### Webhook Failures

```typescript
async function handleWebhookFailure(
  webhookId: string,
  error: Error
) {
  await prisma.webhookLog.update({
    where: { id: webhookId },
    data: {
      processed: false,
      error: error.message
    }
  });
  
  // Alert admin if critical
  if (isCriticalWebhook(webhookId)) {
    await alertAdmin('webhook_failure', {
      webhookId,
      error: error.message,
      timestamp: new Date()
    });
  }
  
  // Schedule retry
  await scheduleWebhookRetry(webhookId);
}
```

---

## 📊 SECURITY MONITORING

### Suspicious Activity Detection

```typescript
// Monitor for suspicious patterns
async function detectSuspiciousActivity() {
  // 1. Multiple failed payments from same user
  const failedPayments = await prisma.transaction.groupBy({
    by: ['buyerId'],
    where: {
      status: 'PAYMENT_FAILED',
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      }
    },
    _count: true,
    having: {
      buyerId: {
        _count: {
          gt: 5 // More than 5 failures
        }
      }
    }
  });
  
  for (const user of failedPayments) {
    await flagUser(user.buyerId, 'MULTIPLE_FAILED_PAYMENTS');
  }
  
  // 2. Rapid transaction creation
  const rapidTransactions = await prisma.transaction.groupBy({
    by: ['buyerId'],
    where: {
      createdAt: {
        gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
      }
    },
    _count: true,
    having: {
      buyerId: {
        _count: {
          gt: 10 // More than 10 transactions
        }
      }
    }
  });
  
  for (const user of rapidTransactions) {
    await flagUser(user.buyerId, 'RAPID_TRANSACTION_CREATION');
  }
  
  // 3. High dispute rate sellers
  const highDisputeSellers = await prisma.transaction.groupBy({
    by: ['sellerId'],
    where: {
      status: 'DISPUTED',
      createdAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
      }
    },
    _count: true,
    having: {
      sellerId: {
        _count: {
          gt: 3 // More than 3 disputes
        }
      }
    }
  });
  
  for (const seller of highDisputeSellers) {
    await flagUser(seller.sellerId, 'HIGH_DISPUTE_RATE');
  }
}

// Run every hour
// cron.schedule('0 * * * *', detectSuspiciousActivity);
```

---

## 🔒 COMPLIANCE & AUDIT

### Audit Log

```typescript
// Log all sensitive operations
async function auditLog(
  action: string,
  userId: string,
  resourceType: string,
  resourceId: string,
  metadata?: any
) {
  await prisma.auditLog.create({
    data: {
      action,
      userId,
      resourceType,
      resourceId,
      metadata,
      ipAddress: metadata?.ip,
      userAgent: metadata?.userAgent,
      timestamp: new Date()
    }
  });
}

// Usage
await auditLog(
  'TRANSACTION_RELEASED',
  adminId,
  'Transaction',
  transactionId,
  { amount: transaction.amount, reason: 'Admin override' }
);
```

### Data Retention Policy

```typescript
// Delete old data per compliance requirements
async function enforceDataRetention() {
  const retentionPeriod = 7 * 365; // 7 years
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionPeriod);
  
  // Archive old transactions
  await prisma.transaction.updateMany({
    where: {
      createdAt: { lt: cutoffDate },
      status: { in: ['RELEASED', 'REFUNDED', 'CANCELLED'] }
    },
    data: {
      archived: true
    }
  });
  
  // Delete old webhook logs
  await prisma.webhookLog.deleteMany({
    where: {
      createdAt: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } // 90 days
    }
  });
}
```

---

## 🚀 INCIDENT RESPONSE PLAN

### Critical Incidents

1. **Unauthorized Access Detected**
   - Immediately revoke all API keys
   - Force logout all admin sessions
   - Review audit logs
   - Notify security team

2. **Payment Gateway Compromise**
   - Disable affected payment method
   - Notify all users with pending transactions
   - Contact payment provider
   - Review all recent transactions

3. **Data Breach**
   - Isolate affected systems
   - Notify affected users (GDPR/CCPA compliance)
   - Engage security forensics
   - File required regulatory reports

### Incident Response Contacts

```typescript
const INCIDENT_CONTACTS = {
  SECURITY_LEAD: 'security@turpialsound.com',
  TECH_LEAD: 'tech@turpialsound.com',
  LEGAL: 'legal@turpialsound.com',
  MERCANTIL_SUPPORT: 'soporte@mercantilbanco.com',
  BINANCE_SUPPORT: 'merchant@binance.com'
};

async function triggerIncidentResponse(
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
  description: string
) {
  const contacts = severity === 'CRITICAL' || severity === 'HIGH'
    ? Object.values(INCIDENT_CONTACTS)
    : [INCIDENT_CONTACTS.SECURITY_LEAD];
  
  for (const contact of contacts) {
    await sendAlert(contact, {
      severity,
      description,
      timestamp: new Date(),
      actionRequired: true
    });
  }
}
```

---

## ✅ SECURITY CHECKLIST

### Pre-Launch Security Audit

- [ ] All webhooks verify signatures
- [ ] Rate limiting enabled on all public endpoints
- [ ] SQL injection prevention verified (Prisma only)
- [ ] XSS prevention in place (React escaping)
- [ ] CSRF tokens implemented for state-changing operations
- [ ] Sensitive data encrypted at rest
- [ ] TLS 1.3 enforced for all connections
- [ ] API keys stored in environment variables (never in code)
- [ ] Admin panel requires 2FA
- [ ] Audit logging enabled for all sensitive operations
- [ ] Data retention policy implemented
- [ ] Incident response plan documented
- [ ] Security monitoring alerts configured
- [ ] Penetration testing completed
- [ ] GDPR/CCPA compliance verified

---

**Related Documents:**
- [`01_ROADMAP_AND_STATUS.md`](./01_ROADMAP_AND_STATUS.md)
- [`02_PAYMENT_ARCHITECTURE.md`](./02_PAYMENT_ARCHITECTURE.md)
- [`03_API_INTEGRATION_PLAN.md`](./03_API_INTEGRATION_PLAN.md)