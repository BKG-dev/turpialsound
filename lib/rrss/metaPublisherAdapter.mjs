import logger from "./logger.mjs";

export function validateMetaEnv() {
  const errors = [];

  if (!process.env.META_APP_ID) errors.push("META_APP_ID not set");
  if (!process.env.META_APP_SECRET) errors.push("META_APP_SECRET not set");
  if (!process.env.META_ACCESS_TOKEN) errors.push("META_ACCESS_TOKEN not set");
  if (!process.env.META_PAGE_ID) errors.push("META_PAGE_ID not set");

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, errors: [] };
}

export function canPublishLive(item) {
  const reasons = [];

  if (process.env.RRSS_MODE !== "live") {
    reasons.push("RRSS_MODE is not 'live'");
  }

  if (!validateMetaEnv().ok) {
    reasons.push("Meta credentials incomplete");
  }

  if (item.status !== "approved") {
    reasons.push(`Item status is '${item.status}', not 'approved'`);
  }

  if (item.riskLevel === "high") {
    reasons.push("High risk items cannot be auto-published");
  }

  if (item.safetyFlags && item.safetyFlags.length > 0) {
    reasons.push("Item has safety flags that need resolution");
  }

  if (item.requiresPublicUrlForLive && !item.selectedAssetPublicUrl) {
    reasons.push("Instagram requires public asset URL but none is set");
  }

  if (item.channel === "instagram" && !process.env.META_IG_USER_ID) {
    reasons.push("META_IG_USER_ID not set for Instagram publishing");
  }

  return {
    allowed: reasons.length === 0,
    reasons,
  };
}

export async function publishFacebookTextPost(item) {
  const validation = canPublishLive(item);
  if (!validation.allowed) {
    logger.warn(`Blocked publish for ${item.id}`, validation.reasons);
    return { success: false, error: validation.reasons.join("; ") };
  }

  logger.info(`[DRY-RUN] Would publish Facebook text post: ${item.id}`);
  logger.info(`[DRY-RUN] Caption: ${(item.caption || "").slice(0, 80)}...`);

  return {
    success: true,
    dryRun: true,
    id: item.id,
    channel: "facebook",
    format: "feed",
    message: "DRY RUN - No real publish attempted",
  };
}

export async function publishFacebookPhotoPost(item) {
  const validation = canPublishLive(item);
  if (!validation.allowed) {
    logger.warn(`Blocked publish for ${item.id}`, validation.reasons);
    return { success: false, error: validation.reasons.join("; ") };
  }

  if (!item.selectedAsset || item.selectedAsset === "ASSET_REQUIRED") {
    return { success: false, error: "No asset selected for photo post" };
  }

  logger.info(`[DRY-RUN] Would publish Facebook photo post: ${item.id}`);
  logger.info(`[DRY-RUN] Asset: ${item.selectedAsset}`);

  return {
    success: true,
    dryRun: true,
    id: item.id,
    channel: "facebook",
    format: "photo",
    message: "DRY RUN - No real publish attempted",
    assetPath: item.selectedAsset,
  };
}

export async function createInstagramMediaContainer(item) {
  const validation = canPublishLive(item);
  if (!validation.allowed) {
    logger.warn(`Blocked IG container for ${item.id}`, validation.reasons);
    return { success: false, error: validation.reasons.join("; ") };
  }

  if (item.requiresPublicUrlForLive && !item.selectedAssetPublicUrl) {
    return {
      success: false,
      error: "Instagram media container requires a public URL for the asset",
    };
  }

  logger.info(`[DRY-RUN] Would create IG media container: ${item.id}`);

  return {
    success: true,
    dryRun: true,
    id: item.id,
    creationId: `dry_run_${Date.now()}`,
    message: "DRY RUN - No real container created",
  };
}

export async function publishInstagramMediaContainer(item) {
  const container = await createInstagramMediaContainer(item);
  if (!container.success) return container;

  logger.info(`[DRY-RUN] Would publish IG media container: ${container.creationId}`);

  return {
    success: true,
    dryRun: true,
    id: item.id,
    message: "DRY RUN - No real publish attempted",
  };
}

export async function publishQueueItemLive(item) {
  if (item.channel === "facebook") {
    if (item.format === "reel" || item.format === "feed") {
      return publishFacebookPhotoPost(item);
    }
    return publishFacebookTextPost(item);
  }

  if (item.channel === "instagram") {
    if (item.format === "reel") {
      return publishInstagramMediaContainer(item);
    }
    return publishInstagramMediaContainer(item);
  }

  return { success: false, error: `Unsupported channel: ${item.channel}` };
}

export default {
  validateMetaEnv,
  canPublishLive,
  publishFacebookTextPost,
  publishFacebookPhotoPost,
  createInstagramMediaContainer,
  publishInstagramMediaContainer,
  publishQueueItemLive,
};
