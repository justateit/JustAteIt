import { useCallback, useEffect, useRef } from 'react';
import { ViewToken } from 'react-native';
import { telemetry } from '../utils/telemetry';

interface ViewableDishData {
  id: string;
  venueId?: string;
}

export function useFeedTelemetry(userId?: string) {
  // Map of active visible items: id -> { startTime, dishId, venueId, index }
  const visibleItemsRef = useRef<
    Map<string, { startTime: number; dishId: string; venueId?: string; index: number }>
  >(new Map());

  // Set of dishes that have received an impression during this feed visit
  const recordedImpressions = useRef<Set<string>>(new Set());

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
    waitForInteraction: false,
  }).current;

  const onViewableItemsChanged = useCallback(
    ({
      viewableItems,
    }: {
      viewableItems: ViewToken[];
      changed: ViewToken[];
    }) => {
      if (!userId) return;

      const now = Date.now();
      const currentVisibleIds = new Set<string>();

      // 1. Process items currently visible
      for (const token of viewableItems) {
        const item = token.item as ViewableDishData | undefined;
        if (!item || !item.id) continue;

        const dishId = String(item.id);
        currentVisibleIds.add(dishId);

        // If newly entering viewport, record start time and impression
        if (!visibleItemsRef.current.has(dishId)) {
          visibleItemsRef.current.set(dishId, {
            startTime: now,
            dishId,
            venueId: item.venueId,
            index: token.index ?? 0,
          });

          if (!recordedImpressions.current.has(dishId)) {
            recordedImpressions.current.add(dishId);
            telemetry.recordImpression(userId, dishId, item.venueId, {
              feed_position: token.index,
            });
          }
        }
      }

      // 2. Identify items that left viewport and compute dwell / skip
      for (const [dishId, info] of visibleItemsRef.current.entries()) {
        if (!currentVisibleIds.has(dishId)) {
          const dwellMs = now - info.startTime;
          if (dwellMs < 1000) {
            telemetry.recordSkip(userId, dishId, info.venueId, dwellMs, {
              feed_position: info.index,
            });
          } else {
            telemetry.recordDwell(userId, dishId, info.venueId, dwellMs, {
              feed_position: info.index,
            });
          }
          visibleItemsRef.current.delete(dishId);
        }
      }
    },
    [userId]
  );

  // Flush remaining visible items when feed screen unmounts
  useEffect(() => {
    return () => {
      if (!userId) return;
      const now = Date.now();
      for (const [dishId, info] of visibleItemsRef.current.entries()) {
        const dwellMs = now - info.startTime;
        if (dwellMs >= 1000) {
          telemetry.recordDwell(userId, dishId, info.venueId, dwellMs, {
            feed_position: info.index,
          });
        }
      }
      visibleItemsRef.current.clear();
      telemetry.flush();
    };
  }, [userId]);

  const trackExpand = useCallback(
    (dishId?: string, venueId?: string, metadata?: Record<string, any>) => {
      if (!userId) return;
      telemetry.recordExpand(userId, dishId, venueId, metadata);
    },
    [userId]
  );

  const trackSave = useCallback(
    (dishId?: string, venueId?: string, metadata?: Record<string, any>) => {
      if (!userId) return;
      telemetry.recordSave(userId, dishId, venueId, metadata);
    },
    [userId]
  );

  return {
    onViewableItemsChanged,
    viewabilityConfig,
    trackExpand,
    trackSave,
  };
}
