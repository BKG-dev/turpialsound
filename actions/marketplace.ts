// Barrel re-export — all marketplace actions

// ─── Listings ─────────────────────────────────────────────────────────────────
export {
  getActiveListings,
  getListingById,
  getListingBySlug,
  getListingsByCategory,
  getUserListings,
  updateListingStatus,
  incrementListingView,
  createListing,
} from './marketplace/listings'

// ─── Auth ─────────────────────────────────────────────────────────────────────
export { getMpSession, registerMpUser, loginMpUser, logoutMpUser } from './marketplace/auth'

// ─── Transactions ─────────────────────────────────────────────────────────────
export {
  initiatePurchase,
  submitPaymentProof,
  validatePayment,
  sellerDeliver,
  confirmDelivery,
  releaseEscrow,
  openDispute,
  resolveDispute,
  cancelTransaction,
  getTransaction,
  getMyTransactions,
} from './marketplace/transactions'

// ─── Chat ─────────────────────────────────────────────────────────────────────
export {
  getOrCreateThread,
  sendMessage,
  getThreadMessages,
  getMyThreads,
  markMessagesRead,
  closeThread,
} from './marketplace/chat'

// ─── Users ────────────────────────────────────────────────────────────────────
export {
  getMyProfile,
  updateProfile,
  getUserProfile,
  becomeSeller,
  addPayoutMethod,
  getPayoutMethods,
  setDefaultPayoutMethod,
  removePayoutMethod,
} from './marketplace/users'

// ─── Admin (SUPER only) ───────────────────────────────────────────────────────
export {
  getAdminStats,
  getEscrowList,
  getPayoutReport,
  adminValidatePayment,
  adminReleaseEscrow,
  adminResolveDispute,
  adminCancelTransaction,
  adminGetUsers,
  adminBanUser,
  adminUnbanUser,
  adminSetUserRole,
  adminVerifyUser,
} from './marketplace/admin'
