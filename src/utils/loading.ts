/**
 * Loading state utilities for auth operations.
 * Pure functions for managing loading states (Tier 1 - unit tested).
 *
 * @module utils/loading
 * @see AUTH-FE-1.8 — Auth Loading States
 */

/**
 * Loading state types for auth operations
 */
export type LoadingStateType =
  | "idle"
  | "authenticating"
  | "signing-up"
  | "signing-out"
  | "validating"
  | "submitting"
  | "redirecting";

/**
 * Loading state object with metadata
 */
export interface LoadingState {
  /** Whether loading is active */
  isLoading: boolean;
  /** Type of loading operation */
  type: LoadingStateType;
  /** User-friendly loading message */
  message: string;
  /** Whether this is a full-page loading state */
  isFullPage: boolean;
}

/**
 * Loading state configuration for different operations
 */
export interface LoadingStateConfig {
  type: LoadingStateType;
  message: string;
  isFullPage?: boolean;
}

/**
 * Default loading states configuration
 */
export const LOADING_STATES: Record<LoadingStateType, LoadingStateConfig> = {
  idle: {
    type: "idle",
    message: "",
    isFullPage: false,
  },
  authenticating: {
    type: "authenticating",
    message: "Checking authentication...",
    isFullPage: true,
  },
  "signing-up": {
    type: "signing-up",
    message: "Creating your account...",
    isFullPage: false,
  },
  "signing-out": {
    type: "signing-out",
    message: "Signing out...",
    isFullPage: true,
  },
  validating: {
    type: "validating",
    message: "Validating...",
    isFullPage: false,
  },
  submitting: {
    type: "submitting",
    message: "Submitting...",
    isFullPage: false,
  },
  redirecting: {
    type: "redirecting",
    message: "Redirecting...",
    isFullPage: true,
  },
} as const;

/**
 * Creates a loading state object from a type
 *
 * @param type - The type of loading state
 * @param customMessage - Optional custom message override
 * @returns LoadingState object
 *
 * @example
 * ```ts
 * const state = createLoadingState('authenticating');
 * // { isLoading: true, type: 'authenticating', message: 'Checking authentication...', isFullPage: true }
 * ```
 */
export function createLoadingState(
  type: LoadingStateType,
  customMessage?: string
): LoadingState {
  const config = LOADING_STATES[type];

  return {
    isLoading: type !== "idle",
    type,
    message: customMessage ?? config.message,
    isFullPage: config.isFullPage ?? false,
  };
}

/**
 * Creates an idle (not loading) state
 *
 * @returns Idle LoadingState object
 */
export function createIdleState(): LoadingState {
  return createLoadingState("idle");
}

/**
 * Checks if a loading state is active
 *
 * @param state - The loading state to check
 * @returns true if loading is active
 */
export function isLoadingActive(state: LoadingState): boolean {
  return state.isLoading && state.type !== "idle";
}

/**
 * Checks if loading state requires full-page overlay
 *
 * @param state - The loading state to check
 * @returns true if full-page loading is needed
 */
export function requiresFullPageLoading(state: LoadingState): boolean {
  return state.isLoading && state.isFullPage;
}

/**
 * Gets the accessible loading announcement text
 *
 * @param state - The loading state
 * @returns Accessible announcement string or null if not loading
 */
export function getLoadingAnnouncement(state: LoadingState): string | null {
  if (!state.isLoading || state.type === "idle") {
    return null;
  }
  return state.message || "Loading...";
}

/**
 * Merges multiple loading states, returning the first active one
 *
 * @param states - Array of loading states to merge
 * @returns The first active loading state, or idle if none are active
 */
export function mergeLoadingStates(states: LoadingState[]): LoadingState {
  const activeState = states.find(isLoadingActive);
  return activeState ?? createIdleState();
}

/**
 * Button loading text configurations
 */
export const BUTTON_LOADING_TEXT = {
  signIn: "Signing in...",
  signUp: "Creating account...",
  signOut: "Signing out...",
  submit: "Submitting...",
  validate: "Validating...",
  save: "Saving...",
  continue: "Please wait...",
} as const;

export type ButtonLoadingKey = keyof typeof BUTTON_LOADING_TEXT;

/**
 * Gets the loading text for a button operation
 *
 * @param key - The button operation key
 * @returns Loading text string
 */
export function getButtonLoadingText(key: ButtonLoadingKey): string {
  return BUTTON_LOADING_TEXT[key];
}
