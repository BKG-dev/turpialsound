import { existsSync } from "fs";
import { resolve } from "path";
import { PUBLIC_DIR, INBOX_DIR } from "./config.mjs";
import logger from "./logger.mjs";

function chooseAsset(candidates, preferredType, preferredUse, channel) {
  if (!candidates || candidates.length === 0) return null;

  let scored = candidates.map((a) => {
    let score = 0;
    if (a.type === preferredType) score += 3;
    if (a.inferredUse === preferredUse) score += 5;
    if (a.channelFit === channel || a.channelFit === "both") score += 4;
    if (a.source === "inbox") score += 1;
    return { asset: a, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (best.score > 0) return best.asset;

  return findFallback(candidates, preferredType, channel);
}

function findFallback(candidates, type, channel) {
  const sameType = candidates.filter((a) => a.type === type);
  if (sameType.length > 0) return sameType[0];

  const forChannel = candidates.filter(
    (a) => a.channelFit === channel || a.channelFit === "both"
  );
  if (forChannel.length > 0) return forChannel[0];

  const imagesOnly = candidates.filter((a) => a.type === "image");
  if (imagesOnly.length > 0) return imagesOnly[0];

  return candidates[0] || null;
}

export function matchAssetForPublication(post, assets) {
  const { channel, format } = post;

  const preferredType = format === "reel" ? "video" : "image";
  const preferredUse = format === "reel" ? "reel" : "feed";

  let candidates = assets;

  if (channel === "facebook") {
    const fbCandidates = candidates.filter(
      (a) => a.channelFit === "facebook" || a.channelFit === "both"
    );
    if (fbCandidates.length > 0) candidates = fbCandidates;
  }

  if (channel === "instagram") {
    const igCandidates = candidates.filter(
      (a) => a.channelFit === "instagram" || a.channelFit === "both"
    );
    if (igCandidates.length > 0) candidates = igCandidates;
  }

  const match = chooseAsset(candidates, preferredType, preferredUse, channel);

  if (match) {
    const publicUrl = match.source === "public" ? `/${match.path}` : null;
    return {
      asset: match,
      publicUrl,
      requiresPublicUrlForLive:
        channel === "instagram" && format !== "reel" && !publicUrl,
    };
  }

  return {
    asset: null,
    publicUrl: null,
    requiresPublicUrlForLive: channel === "instagram",
    missingAsset: true,
  };
}

export function getAssetOptions(post, assets) {
  if (!assets || assets.length === 0) return [];

  const { channel, format } = post;
  const preferredType = format === "reel" ? "video" : "image";

  let candidates = assets.filter(
    (a) => a.channelFit === channel || a.channelFit === "both"
  );

  if (candidates.length === 0) candidates = assets;

  candidates.sort((a) => {
    let score = 0;
    if (a.type === preferredType) score += 3;
    if (a.source === "inbox") score += 2;
    return -score;
  });

  return candidates.slice(0, 10).map((a) => ({
    id: a.id,
    filename: a.filename,
    path: a.path,
    type: a.type,
    inferredUse: a.inferredUse,
    channelFit: a.channelFit,
    source: a.source,
    publicUrl: a.source === "public" ? `/${a.path}` : null,
  }));
}

export function requiresPublicUrl(format, channel) {
  return channel === "instagram" && (format === "feed" || format === "carousel" || format === "reel");
}
