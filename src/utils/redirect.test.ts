import { describe, it, expect } from "vitest";
import {
  isValidRedirectUrl,
  getSafeRedirectUrl,
  buildAuthRedirectUrl,
  buildAuthLoginUrl,
  buildAuthLogoutUrl,
} from "./redirect";

describe("redirect utilities", () => {
  describe("isValidRedirectUrl", () => {
    const allowedDomains = ["xynes.com", "localhost:3000", "localhost:3001"];

    it("should return true for valid xynes.com subdomain URLs", () => {
      expect(
        isValidRedirectUrl("https://cms.xynes.com/dashboard", allowedDomains)
      ).toBe(true);
      expect(
        isValidRedirectUrl("https://auth.xynes.com/login", allowedDomains)
      ).toBe(true);
      expect(isValidRedirectUrl("https://app.xynes.com/", allowedDomains)).toBe(
        true
      );
    });

    it("should return true for localhost URLs during development", () => {
      expect(
        isValidRedirectUrl("http://localhost:3000/dashboard", allowedDomains)
      ).toBe(true);
      expect(
        isValidRedirectUrl("http://localhost:3001/test", allowedDomains)
      ).toBe(true);
    });

    it("should return false for external domains", () => {
      expect(
        isValidRedirectUrl("https://evil.com/phishing", allowedDomains)
      ).toBe(false);
      expect(
        isValidRedirectUrl("https://xynes.com.evil.com/hack", allowedDomains)
      ).toBe(false);
    });

    it("should return false for javascript: URLs", () => {
      expect(isValidRedirectUrl("javascript:alert(1)", allowedDomains)).toBe(
        false
      );
    });

    it("should return false for data: URLs", () => {
      expect(
        isValidRedirectUrl(
          "data:text/html,<script>alert(1)</script>",
          allowedDomains
        )
      ).toBe(false);
    });

    it("should return false for invalid URLs", () => {
      expect(isValidRedirectUrl("not-a-url", allowedDomains)).toBe(false);
      expect(isValidRedirectUrl("", allowedDomains)).toBe(false);
    });

    it("should reject non-http protocols even when host matches allowlist", () => {
      expect(
        isValidRedirectUrl("ftp://cms.xynes.com/dashboard", allowedDomains)
      ).toBe(false);
    });

    it("should handle URLs with encoded characters", () => {
      expect(
        isValidRedirectUrl(
          "https://cms.xynes.com/path%2Fwith%2Fencoding",
          allowedDomains
        )
      ).toBe(true);
    });

    it("should reject URLs with double encoding attacks", () => {
      // Attacker tries to bypass by double-encoding
      expect(
        isValidRedirectUrl(
          "https://evil.com%252F%252Fxynes.com",
          allowedDomains
        )
      ).toBe(false);
    });
  });

  describe("getSafeRedirectUrl", () => {
    const defaultUrl = "/dashboard";
    const allowedDomains = ["xynes.com", "localhost:3000"];

    it("should return the URL if valid", () => {
      expect(
        getSafeRedirectUrl(
          "https://cms.xynes.com/settings",
          defaultUrl,
          allowedDomains
        )
      ).toBe("https://cms.xynes.com/settings");
    });

    it("should return default URL if invalid", () => {
      expect(
        getSafeRedirectUrl("https://evil.com", defaultUrl, allowedDomains)
      ).toBe(defaultUrl);
    });

    it("should return default URL if empty", () => {
      expect(getSafeRedirectUrl("", defaultUrl, allowedDomains)).toBe(
        defaultUrl
      );
      expect(
        getSafeRedirectUrl(
          null as unknown as string,
          defaultUrl,
          allowedDomains
        )
      ).toBe(defaultUrl);
      expect(
        getSafeRedirectUrl(
          undefined as unknown as string,
          defaultUrl,
          allowedDomains
        )
      ).toBe(defaultUrl);
    });

    it("should allow relative URLs", () => {
      expect(getSafeRedirectUrl("/settings", defaultUrl, allowedDomains)).toBe(
        "/settings"
      );
      expect(
        getSafeRedirectUrl("/dashboard/workspace", defaultUrl, allowedDomains)
      ).toBe("/dashboard/workspace");
    });
  });

  describe("buildAuthRedirectUrl", () => {
    const authAppUrl = "https://auth.xynes.com";

    it("should build login URL with redirect param", () => {
      const url = buildAuthRedirectUrl(
        authAppUrl,
        "login",
        "https://cms.xynes.com/dashboard"
      );
      expect(url).toBe(
        "https://auth.xynes.com/login?redirect=https%3A%2F%2Fcms.xynes.com%2Fdashboard"
      );
    });

    it("should build signup URL with redirect param", () => {
      const url = buildAuthRedirectUrl(
        authAppUrl,
        "signup",
        "https://cms.xynes.com/onboard"
      );
      expect(url).toBe(
        "https://auth.xynes.com/signup?redirect=https%3A%2F%2Fcms.xynes.com%2Fonboard"
      );
    });

    it("should build URL without redirect param if not provided", () => {
      const url = buildAuthRedirectUrl(authAppUrl, "login");
      expect(url).toBe("https://auth.xynes.com/login");
    });
  });

  describe("buildAuthLoginUrl", () => {
    const authAppUrl = "https://auth.xynes.com";
    const allowedDomains = ["xynes.com", "localhost:3000"];

    it("should include safe absolute redirect target", () => {
      const url = buildAuthLoginUrl({
        authAppUrl,
        redirectUrl: "https://cms.xynes.com/dashboard?tab=drafts",
        allowedDomains,
      });
      expect(url).toBe(
        "https://auth.xynes.com/login?redirect=https%3A%2F%2Fcms.xynes.com%2Fdashboard%3Ftab%3Ddrafts"
      );
    });

    it("should omit unsafe redirect when no fallback is provided", () => {
      const url = buildAuthLoginUrl({
        authAppUrl,
        redirectUrl: "https://evil.com/phishing",
        allowedDomains,
      });
      expect(url).toBe("https://auth.xynes.com/login");
    });

    it("should use fallback redirect when candidate is unsafe", () => {
      const url = buildAuthLoginUrl({
        authAppUrl,
        redirectUrl: "javascript:alert(1)",
        allowedDomains,
        fallbackRedirectUrl: "/dashboard",
      });
      expect(url).toBe("https://auth.xynes.com/login?redirect=%2Fdashboard");
    });

    it("should validate candidate when allowedDomains is empty", () => {
      const url = buildAuthLoginUrl({
        authAppUrl,
        redirectUrl: "javascript:alert(1)",
        fallbackRedirectUrl: "/dashboard",
      });
      expect(url).toBe("https://auth.xynes.com/login?redirect=%2Fdashboard");
    });

    it("should reject absolute fallback when allowedDomains is empty", () => {
      const url = buildAuthLoginUrl({
        authAppUrl,
        redirectUrl: "javascript:alert(1)",
        fallbackRedirectUrl: "https://cms.xynes.com/dashboard",
      });
      expect(url).toBe("https://auth.xynes.com/login");
    });
  });

  describe("buildAuthLogoutUrl", () => {
    const authAppUrl = "https://auth.xynes.com";
    const allowedDomains = ["xynes.com", "localhost:3000"];

    it("should build logout URL with safe redirect", () => {
      const url = buildAuthLogoutUrl({
        authAppUrl,
        redirectUrl: "https://cms.xynes.com/login",
        allowedDomains,
      });
      expect(url).toBe(
        "https://auth.xynes.com/logout?redirect=https%3A%2F%2Fcms.xynes.com%2Flogin"
      );
    });

    it("should support custom redirect query param", () => {
      const url = buildAuthLogoutUrl({
        authAppUrl,
        redirectUrl: "/signed-out",
        allowedDomains,
        redirectParamName: "returnTo",
      });
      expect(url).toBe("https://auth.xynes.com/logout?returnTo=%2Fsigned-out");
    });
  });
});
