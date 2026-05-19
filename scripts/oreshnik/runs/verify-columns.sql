SELECT column_name FROM information_schema.columns WHERE table_name = 'mp_transactions' AND column_name IN ('orderId', 'quantity', 'unitPrice')
UNION ALL
SELECT 'TABLE_EXISTS' FROM information_schema.tables WHERE table_name = 'mp_orders';
