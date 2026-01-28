import { describe, it, expect } from "vitest";
import {
  validateEmail,
  validatePassword,
  getPasswordStrength,
  emailSchema,
  passwordSchema,
  workspaceNameSchema,
  workspaceSlugSchema,
} from "./validation";

describe("validation utilities", () => {
  describe("validateEmail", () => {
    it("should return valid for correct email formats", () => {
      expect(validateEmail("user@example.com").isValid).toBe(true);
      expect(validateEmail("user.name@example.co.uk").isValid).toBe(true);
      expect(validateEmail("user+tag@example.com").isValid).toBe(true);
    });

    it("should return invalid for incorrect email formats", () => {
      expect(validateEmail("").isValid).toBe(false);
      expect(validateEmail("invalid").isValid).toBe(false);
      expect(validateEmail("invalid@").isValid).toBe(false);
      expect(validateEmail("@example.com").isValid).toBe(false);
      expect(validateEmail("user@").isValid).toBe(false);
      expect(validateEmail("user@.com").isValid).toBe(false);
    });

    it("should return appropriate error messages", () => {
      expect(validateEmail("").error).toBe("Email is required");
      expect(validateEmail("invalid").error).toBe(
        "Please enter a valid email address"
      );
    });
  });

  describe("validatePassword", () => {
    it("should return valid for strong passwords", () => {
      expect(validatePassword("MySecure123!").isValid).toBe(true);
      expect(validatePassword("Password@123").isValid).toBe(true);
    });

    it("should return invalid for passwords that are too short", () => {
      const result = validatePassword("Ab1!");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("at least 8 characters");
    });

    it("should return invalid for passwords without uppercase", () => {
      const result = validatePassword("mysecure123!");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("uppercase");
    });

    it("should return invalid for passwords without lowercase", () => {
      const result = validatePassword("MYSECURE123!");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("lowercase");
    });

    it("should return invalid for passwords without numbers", () => {
      const result = validatePassword("MySecure!!!");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("number");
    });

    it("should return invalid for empty passwords", () => {
      const result = validatePassword("");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Password is required");
    });
  });

  describe("getPasswordStrength", () => {
    it('should return "weak" for short passwords', () => {
      expect(getPasswordStrength("abc")).toBe("weak");
      expect(getPasswordStrength("12345")).toBe("weak");
    });

    it('should return "weak" for passwords with only one character type', () => {
      expect(getPasswordStrength("abcdefgh")).toBe("weak");
      expect(getPasswordStrength("12345678")).toBe("weak");
    });

    it('should return "fair" for passwords with two character types', () => {
      expect(getPasswordStrength("abcdefg1")).toBe("fair");
      expect(getPasswordStrength("Abcdefgh")).toBe("fair");
    });

    it('should return "good" for passwords with three character types', () => {
      expect(getPasswordStrength("Abcdefg1")).toBe("good");
    });

    it('should return "strong" for passwords with all character types and length >= 12', () => {
      expect(getPasswordStrength("MySecure123!")).toBe("strong");
      expect(getPasswordStrength("VerySecure@123")).toBe("strong");
    });

    it('should return "strong" for passwords with all types even if less than 12 chars', () => {
      // 8 chars (>=8 gives +1) + lowercase + uppercase + number + special = 5 points = strong
      expect(getPasswordStrength("Abc123!!")).toBe("strong");
    });

    it("should handle empty strings", () => {
      expect(getPasswordStrength("")).toBe("weak");
    });
  });
});


describe("Zod Schemas", () => {
  describe("emailSchema", () => {
    it("validates correct emails", () => {
      expect(emailSchema.safeParse("test@example.com").success).toBe(true);
    });
    it("rejects invalid emails", () => {
      expect(emailSchema.safeParse("invalid").success).toBe(false);
      expect(emailSchema.safeParse("").success).toBe(false);
    });
  });

  describe("passwordSchema", () => {
    it("validates correct passwords", () => {
      expect(passwordSchema.safeParse("Password123").success).toBe(true);
    });
    it("rejects short passwords", () => {
      expect(passwordSchema.safeParse("short").success).toBe(false);
    });
  });

  describe("workspaceNameSchema", () => {
    it("validates correct names", () => {
      expect(workspaceNameSchema.safeParse("My Workspace").success).toBe(true);
    });
    it("rejects too short names", () => {
      expect(workspaceNameSchema.safeParse("A").success).toBe(false);
    });
    it("trims whitespace", () => {
      const result = workspaceNameSchema.safeParse("  My  ");
      expect(result.success).toBe(true);
      if (result.success) expect(result.data).toBe("My");
    });
  });

  describe("workspaceSlugSchema", () => {
    it("validates correct slugs", () => {
      expect(workspaceSlugSchema.safeParse("my-slug-1").success).toBe(true);
    });
    it("rejects invalid characters", () => {
      expect(workspaceSlugSchema.safeParse("My Slug").success).toBe(false);
      expect(workspaceSlugSchema.safeParse("slug_1").success).toBe(false);
    });
    it("rejects consecutive hyphens", () => {
      expect(workspaceSlugSchema.safeParse("my--slug").success).toBe(false);
    });
    it("rejects start/end hyphens", () => {
      expect(workspaceSlugSchema.safeParse("-slug").success).toBe(false);
      expect(workspaceSlugSchema.safeParse("slug-").success).toBe(false);
    });
  });
});
