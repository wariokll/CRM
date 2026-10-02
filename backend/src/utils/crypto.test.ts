import { describe, expect, it } from "vitest";
import { decrypt, encrypt } from "./crypto.js";

const key = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("AES-256-GCM storage encryption", () => {
  it("decrypts the original secret and produces a non-plain value", () => {
    const cipher = encrypt("remote-access-password", key);
    expect(cipher).not.toContain("remote-access-password");
    expect(decrypt(cipher, key)).toBe("remote-access-password");
  });
  it("rejects a modified encrypted value", () => {
    const [iv, tag, value] = encrypt("protected", key).split(".");
    expect(() =>
      decrypt(`${iv}.${tag}.${value!.slice(0, -2)}XX`, key),
    ).toThrow();
  });
});
