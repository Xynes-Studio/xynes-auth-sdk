/**
 * Unit tests for loading state utilities (Tier 1 - 100% coverage target)
 *
 * @see AUTH-FE-1.8 — Auth Loading States
 * @see ADR-001 - Testing Standards
 */

import { describe, it, expect } from "vitest";
import {
  createLoadingState,
  createIdleState,
  isLoadingActive,
  requiresFullPageLoading,
  getLoadingAnnouncement,
  mergeLoadingStates,
  getButtonLoadingText,
  LOADING_STATES,
  BUTTON_LOADING_TEXT,
  type LoadingStateType,
  type LoadingState,
} from "./loading";

describe("loading utilities", () => {
  describe("LOADING_STATES", () => {
    it("should have all required loading state types", () => {
      const expectedTypes: LoadingStateType[] = [
        "idle",
        "authenticating",
        "signing-up",
        "signing-out",
        "validating",
        "submitting",
        "redirecting",
      ];

      expectedTypes.forEach((type) => {
        expect(LOADING_STATES[type]).toBeDefined();
        expect(LOADING_STATES[type].type).toBe(type);
      });
    });

    it("should have idle state with isFullPage false", () => {
      expect(LOADING_STATES.idle.isFullPage).toBe(false);
      expect(LOADING_STATES.idle.message).toBe("");
    });

    it("should have full-page states for page-level operations", () => {
      expect(LOADING_STATES.authenticating.isFullPage).toBe(true);
      expect(LOADING_STATES["signing-out"].isFullPage).toBe(true);
      expect(LOADING_STATES.redirecting.isFullPage).toBe(true);
    });

    it("should have inline states for form operations", () => {
      expect(LOADING_STATES["signing-up"].isFullPage).toBe(false);
      expect(LOADING_STATES.validating.isFullPage).toBe(false);
      expect(LOADING_STATES.submitting.isFullPage).toBe(false);
    });
  });

  describe("createLoadingState", () => {
    it("should create a loading state from type", () => {
      const state = createLoadingState("authenticating");

      expect(state).toEqual({
        isLoading: true,
        type: "authenticating",
        message: "Checking authentication...",
        isFullPage: true,
      });
    });

    it("should create idle state with isLoading false", () => {
      const state = createLoadingState("idle");

      expect(state.isLoading).toBe(false);
      expect(state.type).toBe("idle");
      expect(state.message).toBe("");
    });

    it("should allow custom message override", () => {
      const customMessage = "Please wait while we verify your identity...";
      const state = createLoadingState("authenticating", customMessage);

      expect(state.message).toBe(customMessage);
      expect(state.type).toBe("authenticating");
    });

    it("should preserve isFullPage from config", () => {
      const signingUp = createLoadingState("signing-up");
      const signingOut = createLoadingState("signing-out");

      expect(signingUp.isFullPage).toBe(false);
      expect(signingOut.isFullPage).toBe(true);
    });

    it("should create all loading state types correctly", () => {
      const types: LoadingStateType[] = [
        "authenticating",
        "signing-up",
        "signing-out",
        "validating",
        "submitting",
        "redirecting",
      ];

      types.forEach((type) => {
        const state = createLoadingState(type);
        expect(state.isLoading).toBe(true);
        expect(state.type).toBe(type);
        expect(state.message).toBe(LOADING_STATES[type].message);
      });
    });
  });

  describe("createIdleState", () => {
    it("should create an idle state", () => {
      const state = createIdleState();

      expect(state).toEqual({
        isLoading: false,
        type: "idle",
        message: "",
        isFullPage: false,
      });
    });

    it("should return consistent idle state on multiple calls", () => {
      const state1 = createIdleState();
      const state2 = createIdleState();

      expect(state1).toEqual(state2);
    });
  });

  describe("isLoadingActive", () => {
    it("should return true for active loading states", () => {
      const activeStates: LoadingState[] = [
        createLoadingState("authenticating"),
        createLoadingState("signing-up"),
        createLoadingState("signing-out"),
        createLoadingState("validating"),
        createLoadingState("submitting"),
        createLoadingState("redirecting"),
      ];

      activeStates.forEach((state) => {
        expect(isLoadingActive(state)).toBe(true);
      });
    });

    it("should return false for idle state", () => {
      const idleState = createIdleState();
      expect(isLoadingActive(idleState)).toBe(false);
    });

    it("should return false for state with isLoading false", () => {
      const state: LoadingState = {
        isLoading: false,
        type: "authenticating",
        message: "Test",
        isFullPage: true,
      };
      expect(isLoadingActive(state)).toBe(false);
    });
  });

  describe("requiresFullPageLoading", () => {
    it("should return true for full-page loading states", () => {
      const fullPageStates = [
        createLoadingState("authenticating"),
        createLoadingState("signing-out"),
        createLoadingState("redirecting"),
      ];

      fullPageStates.forEach((state) => {
        expect(requiresFullPageLoading(state)).toBe(true);
      });
    });

    it("should return false for inline loading states", () => {
      const inlineStates = [
        createLoadingState("signing-up"),
        createLoadingState("validating"),
        createLoadingState("submitting"),
      ];

      inlineStates.forEach((state) => {
        expect(requiresFullPageLoading(state)).toBe(false);
      });
    });

    it("should return false for idle state", () => {
      const idleState = createIdleState();
      expect(requiresFullPageLoading(idleState)).toBe(false);
    });

    it("should return false when isLoading is false even if isFullPage is true", () => {
      const state: LoadingState = {
        isLoading: false,
        type: "authenticating",
        message: "Test",
        isFullPage: true,
      };
      expect(requiresFullPageLoading(state)).toBe(false);
    });
  });

  describe("getLoadingAnnouncement", () => {
    it("should return message for active loading states", () => {
      const state = createLoadingState("authenticating");
      expect(getLoadingAnnouncement(state)).toBe("Checking authentication...");
    });

    it("should return custom message if provided", () => {
      const state = createLoadingState("authenticating", "Custom message");
      expect(getLoadingAnnouncement(state)).toBe("Custom message");
    });

    it("should return null for idle state", () => {
      const idleState = createIdleState();
      expect(getLoadingAnnouncement(idleState)).toBeNull();
    });

    it("should return null when isLoading is false", () => {
      const state: LoadingState = {
        isLoading: false,
        type: "authenticating",
        message: "Test message",
        isFullPage: true,
      };
      expect(getLoadingAnnouncement(state)).toBeNull();
    });

    it("should return 'Loading...' if message is empty but loading is active", () => {
      const state: LoadingState = {
        isLoading: true,
        type: "submitting",
        message: "",
        isFullPage: false,
      };
      expect(getLoadingAnnouncement(state)).toBe("Loading...");
    });
  });

  describe("mergeLoadingStates", () => {
    it("should return first active loading state", () => {
      const states: LoadingState[] = [
        createIdleState(),
        createLoadingState("authenticating"),
        createLoadingState("signing-out"),
      ];

      const merged = mergeLoadingStates(states);
      expect(merged.type).toBe("authenticating");
    });

    it("should return idle state if no active states", () => {
      const states: LoadingState[] = [createIdleState(), createIdleState()];

      const merged = mergeLoadingStates(states);
      expect(merged.type).toBe("idle");
      expect(merged.isLoading).toBe(false);
    });

    it("should return idle state for empty array", () => {
      const merged = mergeLoadingStates([]);
      expect(merged.type).toBe("idle");
      expect(merged.isLoading).toBe(false);
    });

    it("should prioritize first active state in order", () => {
      const states: LoadingState[] = [
        createLoadingState("validating"),
        createLoadingState("authenticating"),
      ];

      const merged = mergeLoadingStates(states);
      expect(merged.type).toBe("validating");
    });
  });

  describe("BUTTON_LOADING_TEXT", () => {
    it("should have all button loading text keys", () => {
      expect(BUTTON_LOADING_TEXT.signIn).toBe("Signing in...");
      expect(BUTTON_LOADING_TEXT.signUp).toBe("Creating account...");
      expect(BUTTON_LOADING_TEXT.signOut).toBe("Signing out...");
      expect(BUTTON_LOADING_TEXT.submit).toBe("Submitting...");
      expect(BUTTON_LOADING_TEXT.validate).toBe("Validating...");
      expect(BUTTON_LOADING_TEXT.save).toBe("Saving...");
      expect(BUTTON_LOADING_TEXT.continue).toBe("Please wait...");
    });
  });

  describe("getButtonLoadingText", () => {
    it("should return correct text for each key", () => {
      expect(getButtonLoadingText("signIn")).toBe("Signing in...");
      expect(getButtonLoadingText("signUp")).toBe("Creating account...");
      expect(getButtonLoadingText("signOut")).toBe("Signing out...");
      expect(getButtonLoadingText("submit")).toBe("Submitting...");
      expect(getButtonLoadingText("validate")).toBe("Validating...");
      expect(getButtonLoadingText("save")).toBe("Saving...");
      expect(getButtonLoadingText("continue")).toBe("Please wait...");
    });
  });
});
