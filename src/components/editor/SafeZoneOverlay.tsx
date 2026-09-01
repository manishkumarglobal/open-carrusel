"use client";

import type { AspectRatio } from "@/types/carousel";
import { DIMENSIONS } from "@/types/carousel";

interface SafeZoneOverlayProps {
  aspectRatio: AspectRatio;
  visible: boolean;
}

export interface SafeZoneGeometry {
  /** Height of each grid-crop band, as a percentage of slide height. */
  gridCropPercent: number;
  /** Height of Instagram's bottom UI, as a percentage of slide height. */
  bottomUiPercent: number;
  /** Inset of the safe rectangle, as percentages of the slide box. */
  safeInset: { top: number; right: number; bottom: number; left: number };
}

/** Height of Instagram's like/save/comment overlay, as a share of the slide. */
const BOTTOM_UI_PERCENT = 14;

/**
 * Where Instagram crops and covers a slide, as percentages of the slide itself.
 *
 * These are percentages of the *slide box*, which is why the overlay has to be
 * drawn inside the scaled slide rather than in the preview container around it.
 * The slide is letterboxed in that container, so a percentage of the container
 * is not a percentage of the slide.
 */
export function safeZoneGeometry(aspectRatio: AspectRatio): SafeZoneGeometry {
  const { width, height } = DIMENSIONS[aspectRatio];

  // On the profile grid Instagram shows the centre square of a slide, so a
  // portrait slide loses an equal band top and bottom. A square slide loses
  // nothing.
  const gridCropPercent =
    height > width ? ((height - width) / 2 / height) * 100 : 0;

  return {
    gridCropPercent,
    bottomUiPercent: BOTTOM_UI_PERCENT,
    safeInset: {
      top: 10,
      right: 10,
      bottom: Math.max(10, BOTTOM_UI_PERCENT + 2),
      left: 10,
    },
  };
}

export function SafeZoneOverlay({ aspectRatio, visible }: SafeZoneOverlayProps) {
  if (!visible) return null;

  const { gridCropPercent, bottomUiPercent, safeInset } =
    safeZoneGeometry(aspectRatio);
  const hasGridCrop = gridCropPercent > 0;

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Grid crop zone — top */}
      {hasGridCrop && (
        <div
          className="absolute left-0 right-0 top-0 bg-red-500/10 border-b border-dashed border-red-400/50"
          style={{ height: `${gridCropPercent}%` }}
        >
          <span className="absolute bottom-1 left-2 text-[8px] text-red-500/70 font-medium">
            Grid crop
          </span>
        </div>
      )}

      {/* Grid crop zone — bottom */}
      {hasGridCrop && (
        <div
          className="absolute left-0 right-0 bottom-0 bg-red-500/10 border-t border-dashed border-red-400/50"
          style={{ height: `${gridCropPercent}%` }}
        >
          <span className="absolute top-1 left-2 text-[8px] text-red-500/70 font-medium">
            Grid crop
          </span>
        </div>
      )}

      {/* Bottom UI overlay zone */}
      <div
        className="absolute left-0 right-0 bottom-0 bg-blue-500/8 border-t border-dashed border-blue-400/40"
        style={{ height: `${bottomUiPercent}%` }}
      >
        <span className="absolute top-1 right-2 text-[8px] text-blue-500/60 font-medium">
          UI overlay
        </span>
      </div>

      {/* Safe zone border */}
      <div
        className="absolute border border-dashed border-green-400/40 rounded-sm"
        style={{
          left: `${safeInset.left}%`,
          right: `${safeInset.right}%`,
          top: `${safeInset.top}%`,
          bottom: `${safeInset.bottom}%`,
        }}
      >
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[8px] text-green-500/70 font-medium bg-white/80 px-1 rounded">
          Safe zone
        </span>
      </div>
    </div>
  );
}
