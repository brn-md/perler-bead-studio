/**
 * PixelWeaver Client Diagnostic Logger (src/utils/logger.ts)
 * --------------------------------------------------------
 * Provides structured, colorized, timestamped logs in the browser console
 * for tracking processing requests, parameters, timing, and errors.
 */

export interface ErrorDiagnostic {
  title: string;
  message: string;
  stage?: string;
  status?: number;
  details?: string;
  timestamp: string;
}

export const logger = {
  info: (stage: string, message: string, data?: any) => {
    const time = new Date().toLocaleTimeString();
    if (data !== undefined) {
      console.log(
        `%c[PixelWeaver ${time}] %c[${stage}] %c${message}`,
        "color: #a855f7; font-weight: bold",
        "color: #38bdf8; font-weight: 600",
        "color: #e2e8f0",
        data
      );
    } else {
      console.log(
        `%c[PixelWeaver ${time}] %c[${stage}] %c${message}`,
        "color: #a855f7; font-weight: bold",
        "color: #38bdf8; font-weight: 600",
        "color: #e2e8f0"
      );
    }
  },

  success: (stage: string, message: string, data?: any) => {
    const time = new Date().toLocaleTimeString();
    if (data !== undefined) {
      console.log(
        `%c[PixelWeaver ${time}] %c[✓ ${stage}] %c${message}`,
        "color: #a855f7; font-weight: bold",
        "color: #4ade80; font-weight: 600",
        "color: #e2e8f0",
        data
      );
    } else {
      console.log(
        `%c[PixelWeaver ${time}] %c[✓ ${stage}] %c${message}`,
        "color: #a855f7; font-weight: bold",
        "color: #4ade80; font-weight: 600",
        "color: #e2e8f0"
      );
    }
  },

  warn: (stage: string, message: string, data?: any) => {
    const time = new Date().toLocaleTimeString();
    if (data !== undefined) {
      console.warn(
        `%c[PixelWeaver ${time}] %c[⚠ ${stage}] %c${message}`,
        "color: #a855f7; font-weight: bold",
        "color: #fbbf24; font-weight: 600",
        "color: #e2e8f0",
        data
      );
    } else {
      console.warn(
        `%c[PixelWeaver ${time}] %c[⚠ ${stage}] %c${message}`,
        "color: #a855f7; font-weight: bold",
        "color: #fbbf24; font-weight: 600",
        "color: #e2e8f0"
      );
    }
  },

  error: (stage: string, message: string, error?: any) => {
    const time = new Date().toLocaleTimeString();
    if (error !== undefined) {
      console.error(
        `%c[PixelWeaver ${time}] %c[✗ ${stage}] %c${message}`,
        "color: #a855f7; font-weight: bold",
        "color: #f87171; font-weight: bold",
        "color: #fca5a5",
        error
      );
    } else {
      console.error(
        `%c[PixelWeaver ${time}] %c[✗ ${stage}] %c${message}`,
        "color: #a855f7; font-weight: bold",
        "color: #f87171; font-weight: bold",
        "color: #fca5a5"
      );
    }
  },
};
