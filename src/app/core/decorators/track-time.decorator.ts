/**
 * Decorator to track execution time of async methods.
 *
 * @param options - Optional configuration
 * @param options.label - Custom label for the log output (defaults to method name)
 * @param options.logLevel - Log level: 'log' | 'debug' | 'info' | 'warn' (default: 'debug')
 * @param options.threshold - Only log if execution time exceeds this value in ms (default: 0)
 * @param options.callback - Optional callback to receive timing data
 *
 * @example
 * class MyService {
 *   @TrackTime()
 *   async fetchData() {
 *     // ... async operation
 *   }
 *
 *   @TrackTime({ label: 'API Call', threshold: 100 })
 *   async callApi() {
 *     // Only logs if takes more than 100ms
 *   }
 *
 *   @TrackTime({ callback: (data) => analytics.track(data) })
 *   async processReceipt() {
 *     // Sends timing data to analytics
 *   }
 * }
 */

export interface TrackTimeOptions {
  label?: string;
  logLevel?: 'log' | 'debug' | 'info' | 'warn';
  threshold?: number;
  callback?: (data: TrackTimeResult) => void;
}

export interface TrackTimeResult {
  method: string;
  label: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  error?: Error;
}

export function TrackTime(options: TrackTimeOptions = {}) {
  return function (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;
    const { label, logLevel = 'debug', threshold = 0, callback } = options;

    descriptor.value = async function (...args: unknown[]): Promise<unknown> {
      const methodLabel = label || `${target.constructor.name}.${propertyKey}`;
      const startTime = performance.now();
      const timestamp = new Date();
      let success = true;
      let error: Error | undefined;

      try {
        const result = await originalMethod.apply(this, args);
        return result;
      } catch (err) {
        success = false;
        error = err instanceof Error ? err : new Error(String(err));
        throw err;
      } finally {
        const endTime = performance.now();
        const duration = Math.round((endTime - startTime) * 100) / 100;

        const result: TrackTimeResult = {
          method: propertyKey,
          label: methodLabel,
          duration,
          timestamp,
          success,
          error,
        };

        if (duration >= threshold) {
          const statusIcon = success ? '✓' : '✗';
          const message = `[${statusIcon}] ${methodLabel}: ${duration}ms`;

          switch (logLevel) {
            case 'log':
              console.log(message);
              break;
            case 'info':
              console.info(message);
              break;
            case 'warn':
              console.warn(message);
              break;
            case 'debug':
            default:
              console.debug(message);
              break;
          }
        }

        if (callback) {
          try {
            callback(result);
          } catch {
            console.error('TrackTime callback error');
          }
        }
      }
    };

    return descriptor;
  };
}

/**
 * Standalone function to track execution time of any async operation.
 *
 * @example
 * const result = await trackTimeAsync('fetchUsers', async () => {
 *   return await userService.getAll();
 * });
 */
export async function trackTimeAsync<T>(
  label: string,
  fn: () => Promise<T>,
  options: Omit<TrackTimeOptions, 'label'> = {}
): Promise<T> {
  const { logLevel = 'debug', threshold = 0, callback } = options;
  const startTime = performance.now();
  const timestamp = new Date();
  let success = true;
  let error: Error | undefined;

  try {
    const result = await fn();
    return result;
  } catch (err) {
    success = false;
    error = err instanceof Error ? err : new Error(String(err));
    throw err;
  } finally {
    const endTime = performance.now();
    const duration = Math.round((endTime - startTime) * 100) / 100;

    const result: TrackTimeResult = {
      method: label,
      label,
      duration,
      timestamp,
      success,
      error,
    };

    if (duration >= threshold) {
      const statusIcon = success ? '✓' : '✗';
      const message = `[${statusIcon}] ${label}: ${duration}ms`;

      switch (logLevel) {
        case 'log':
          console.log(message);
          break;
        case 'info':
          console.info(message);
          break;
        case 'warn':
          console.warn(message);
          break;
        case 'debug':
        default:
          console.debug(message);
          break;
      }
    }

    if (callback) {
      try {
        callback(result);
      } catch {
        console.error('trackTimeAsync callback error');
      }
    }
  }
}
