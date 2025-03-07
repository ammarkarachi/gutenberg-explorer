/**
 * A utility to manage API rate limits for free tier LLM services
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
// Storage for API call timestamps
type APICallRecord = {
    timestamp: number;
    endpoint: string;
  };
  
  class RateLimitManager {
    private apiCalls: APICallRecord[] = [];
    private maxCallsPerMinute: number;
    private maxCallsPerHour: number;
    private maxCallsPerDay: number;
    private storageKey: string;
    numberOfRetries : number;
  
    constructor({
      maxCallsPerMinute = 5,  // Default: 5 calls per minute
      maxCallsPerHour = 30,   // Default: 30 calls per hour
      maxCallsPerDay = 100,   // Default: 100 calls per day
      storageKey = 'api-rate-limits',
      numberOfRetries = 5,
    } = {}) {
      this.maxCallsPerMinute = maxCallsPerMinute;
      this.maxCallsPerHour = maxCallsPerHour;
      this.maxCallsPerDay = maxCallsPerDay;
      this.storageKey = storageKey;
      this.numberOfRetries = numberOfRetries
      
      // Load from localStorage if available
      this.loadFromStorage();
    }
  
    private loadFromStorage() {
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem(this.storageKey);
          if (stored) {
            const parsed = JSON.parse(stored);
            // Filter out calls older than 1 day
            const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
            this.apiCalls = parsed.filter((call: APICallRecord) => call.timestamp > oneDayAgo);
          }
        } catch (e) {
          console.error('Error loading rate limit data from storage:', e);
          this.apiCalls = [];
        }
      }
    }
  
    private saveToStorage() {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(this.storageKey, JSON.stringify(this.apiCalls));
        } catch (e) {
          console.error('Error saving rate limit data to storage:', e);
        }
      }
    }
  
    /**
     * Record an API call
     */
    recordCall(endpoint: string = 'default') {
      this.apiCalls.push({
        timestamp: Date.now(),
        endpoint
      });
      this.saveToStorage();
    }
  
    /**
     * Check if a call can be made without hitting rate limits
     */
    canMakeCall(endpoint: string = 'default'): boolean {
      // Clean up old calls first
      this.cleanupOldCalls();
      
      const now = Date.now();
      const oneMinuteAgo = now - 60 * 1000;
      const oneHourAgo = now - 60 * 60 * 1000;
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      
      // Count calls within time windows
      const callsLastMinute = this.apiCalls.filter(
        call => call.timestamp > oneMinuteAgo && call.endpoint === endpoint
      ).length;
      
      const callsLastHour = this.apiCalls.filter(
        call => call.timestamp > oneHourAgo && call.endpoint === endpoint
      ).length;
      
      const callsLastDay = this.apiCalls.filter(
        call => call.timestamp > oneDayAgo && call.endpoint === endpoint
      ).length;
      
      // Check all limits
      return (
        callsLastMinute < this.maxCallsPerMinute &&
        callsLastHour < this.maxCallsPerHour &&
        callsLastDay < this.maxCallsPerDay
      );
    }
  
    /**
     * Clean up calls older than 1 day to prevent unlimited growth
     */
    private cleanupOldCalls() {
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      this.apiCalls = this.apiCalls.filter(call => call.timestamp > oneDayAgo);
      this.saveToStorage();
    }
  
    /**
     * Get the time to wait (in ms) before making the next call
     */
    getTimeToWait(endpoint: string = 'default'): number {
      if (this.canMakeCall(endpoint)) {
        return 0;
      }
      
      const now = Date.now();
      const oneMinuteAgo = now - 60 * 1000;
      
      // Find the oldest call within the last minute
      const recentCalls = this.apiCalls
        .filter(call => call.timestamp > oneMinuteAgo && call.endpoint === endpoint)
        .sort((a, b) => a.timestamp - b.timestamp);
      
      if (recentCalls.length >= this.maxCallsPerMinute) {
        // Wait until the oldest call is more than 1 minute old
        const oldestCall = recentCalls[0];
        return (oldestCall.timestamp + 60 * 1000) - now + 100; // Add 100ms buffer
      }
      
      return 0;
    }
  
    /**
     * Get limits information
     */
    getLimitsInfo(endpoint: string = 'default') {
      this.cleanupOldCalls();
      
      const now = Date.now();
      const oneMinuteAgo = now - 60 * 1000;
      const oneHourAgo = now - 60 * 60 * 1000;
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      
      const callsLastMinute = this.apiCalls.filter(
        call => call.timestamp > oneMinuteAgo && call.endpoint === endpoint
      ).length;
      
      const callsLastHour = this.apiCalls.filter(
        call => call.timestamp > oneHourAgo && call.endpoint === endpoint
      ).length;
      
      const callsLastDay = this.apiCalls.filter(
        call => call.timestamp > oneDayAgo && call.endpoint === endpoint
      ).length;
      
      return {
        minuteLimit: {
          used: callsLastMinute,
          max: this.maxCallsPerMinute,
          remaining: this.maxCallsPerMinute - callsLastMinute
        },
        hourLimit: {
          used: callsLastHour,
          max: this.maxCallsPerHour,
          remaining: this.maxCallsPerHour - callsLastHour
        },
        dayLimit: {
          used: callsLastDay,
          max: this.maxCallsPerDay,
          remaining: this.maxCallsPerDay - callsLastDay
        }
      };
    }
  }
  
  // Create a singleton instance
  export const rateLimitManager = new RateLimitManager();
  
  // Export a wrapper function for API calls with rate limiting
  export async function withRateLimit<T>(
    apiCall: () => Promise<T>,
    endpoint: string = 'default',
    retry: number = 0,
  ): Promise<T> {
    const timeToWait = rateLimitManager.getTimeToWait(endpoint);

    if (retry > rateLimitManager.numberOfRetries) {
      throw new Error('Maximum retries reached')
    }
    
    if (timeToWait > 0) {
      await new Promise(resolve => setTimeout(resolve, timeToWait));
    }
    
    try {
      const result = await apiCall();
      rateLimitManager.recordCall(endpoint);
      return result;
    } catch (error : any) {
      // Check if it's a rate limit error (depends on the API)
      console.error('API call failed:', error);
      if (error.response?.status === 429 || error.code === 'rate_limit_exceeded') {
        // Handle rate limit error - maybe wait longer and retry
        const retryAfter = parseInt(error.response.headers['retry-after'] || '5', 10);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return withRateLimit(apiCall, endpoint, retry++);
      }
      throw error;
    }
  }