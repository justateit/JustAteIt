import { AppState, AppStateStatus, Platform } from 'react-native';
import { logInteractionsBatch } from './flavorProfileApi';

export type InteractionType =
  | 'impression'
  | 'dwell'
  | 'expand'
  | 'save'
  | 'skip'
  | 'share';

export interface TelemetryEvent {
  user_id: string;
  dish_id?: string;
  venue_id?: string;
  interaction_type: InteractionType;
  dwell_time_ms?: number;
  session_id?: string;
  context?: Record<string, any>;
  timestamp?: number;
}

class TelemetryManager {
  private queue: TelemetryEvent[] = [];
  private flushTimer: any = null;
  private sessionId: string;
  private isFlushing = false;
  private readonly MAX_QUEUE_SIZE = 15;
  private readonly FLUSH_INTERVAL_MS = 5000;

  constructor() {
    this.sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.initFlushTimer();
    this.initAppStateListener();
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  private initFlushTimer() {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.FLUSH_INTERVAL_MS);
  }

  private initAppStateListener() {
    if (Platform.OS !== 'web') {
      AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
        if (nextAppState.match(/inactive|background/)) {
          this.flush();
        }
      });
    } else if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flush();
      });
    }
  }

  /**
   * Enqueue a telemetry event. Automatically attaches session_id and device platform.
   */
  public track(event: Omit<TelemetryEvent, 'session_id'>) {
    if (!event.user_id) return;

    const fullEvent: TelemetryEvent = {
      ...event,
      session_id: this.sessionId,
      context: {
        platform: Platform.OS,
        timestamp: Date.now(),
        ...(event.context || {}),
      },
    };

    this.queue.push(fullEvent);

    if (this.queue.length >= this.MAX_QUEUE_SIZE) {
      this.flush();
    }
  }

  /**
   * Flush queued events to backend API in a single batch.
   */
  public async flush(): Promise<void> {
    if (this.isFlushing || this.queue.length === 0) return;

    this.isFlushing = true;
    const batchToSend = [...this.queue];
    this.queue = [];

    try {
      await logInteractionsBatch(batchToSend);
    } catch (err) {
      // If network fails, re-queue events up to 50 items so we don't leak memory
      this.queue = [...batchToSend.slice(-35), ...this.queue].slice(0, 50);
      console.warn('[Telemetry] Flush error, events requeued:', err);
    } finally {
      this.isFlushing = false;
    }
  }

  // Convenience helper methods
  public recordImpression(
    userId: string,
    dishId?: string,
    venueId?: string,
    context?: Record<string, any>
  ) {
    this.track({
      user_id: userId,
      dish_id: dishId,
      venue_id: venueId,
      interaction_type: 'impression',
      dwell_time_ms: 0,
      context,
    });
  }

  public recordDwell(
    userId: string,
    dishId: string,
    venueId: string | undefined,
    dwellTimeMs: number,
    context?: Record<string, any>
  ) {
    this.track({
      user_id: userId,
      dish_id: dishId,
      venue_id: venueId,
      interaction_type: 'dwell',
      dwell_time_ms: Math.round(dwellTimeMs),
      context,
    });
  }

  public recordSkip(
    userId: string,
    dishId: string,
    venueId: string | undefined,
    dwellTimeMs: number,
    context?: Record<string, any>
  ) {
    this.track({
      user_id: userId,
      dish_id: dishId,
      venue_id: venueId,
      interaction_type: 'skip',
      dwell_time_ms: Math.round(dwellTimeMs),
      context,
    });
  }

  public recordExpand(
    userId: string,
    dishId?: string,
    venueId?: string,
    context?: Record<string, any>
  ) {
    this.track({
      user_id: userId,
      dish_id: dishId,
      venue_id: venueId,
      interaction_type: 'expand',
      dwell_time_ms: 0,
      context,
    });
  }

  public recordSave(
    userId: string,
    dishId?: string,
    venueId?: string,
    context?: Record<string, any>
  ) {
    this.track({
      user_id: userId,
      dish_id: dishId,
      venue_id: venueId,
      interaction_type: 'save',
      dwell_time_ms: 0,
      context,
    });
  }
}

export const telemetry = new TelemetryManager();
