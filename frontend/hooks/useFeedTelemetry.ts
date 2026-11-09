import { useCallback, useEffect, useRef } from 'react';
import { ViewToken } from 'react-native';
import { telemetry } from '../utils/telemetry';

interface ViewableDishData {
  id: string;
  venueId?: string;
}

export function useFeedTelemetry(userId?: string) {
  const userIdRef = useRef(userId);
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

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

  // Stable callback reference to satisfy FlatList invariant (never re-creates on the fly)
  const onViewableItemsChanged = useRef(
    ({
      viewableItems,
    }: {
      viewableItems: ViewToken[];
      changed: ViewToken[];
    }) => {
      const currentUserId = userIdRef.current;
      if (!currentUserId) return;

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
            telemetry.recordImpression(currentUserId, dishId, item.venueId, {
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
            telemetry.recordSkip(currentUserId, dishId, info.venueId, dwellMs, {
              feed_position: info.index,
            });
          } else {
            telemetry.recordDwell(currentUserId, dishId, info.venueId, dwellMs, {
              feed_position: info.index,
            });
          }
          visibleItemsRef.current.delete(dishId);
        }
      }
    }
  ).current;

  // Flush remaining visible items when feed screen unmounts
  useEffect(() => {
    return () => {
      const currentUserId = userIdRef.current;
      if (!currentUserId) return;
      const now = Date.now();
      for (const [dishId, info] of visibleItemsRef.current.entries()) {
        const dwellMs = now - info.startTime;
        if (dwellMs >= 1000) {
          telemetry.recordDwell(currentUserId, dishId, info.venueId, dwellMs, {
            feed_position: info.index,
          });
        }
      }
      visibleItemsRef.current.clear();
      telemetry.flush();
    };
  }, []);

  const trackExpand = useCallback(
    (dishId?: string, venueId?: string, metadata?: Record<string, any>) => {
      const currentUserId = userIdRef.current;
      if (!currentUserId) return;
      telemetry.recordExpand(currentUserId, dishId, venueId, metadata);
    },
    []
  );

  const trackSave = useCallback(
    (dishId?: string, venueId?: string, metadata?: Record<string, any>) => {
      const currentUserId = userIdRef.current;
      if (!currentUserId) return;
      telemetry.recordSave(currentUserId, dishId, venueId, metadata);
    },
    []
  );

  return {
    onViewableItemsChanged,
    viewabilityConfig,
    trackExpand,
    trackSave,
  };
}
