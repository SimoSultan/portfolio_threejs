import { describe, expect, it } from "vitest";

import { DatabaseManager, StorageManager } from "../index";

describe("Database Index", () => {
  it("should export DatabaseManager", () => {
    expect(DatabaseManager).toBeDefined();
    expect(typeof DatabaseManager).toBe("function");
  });

  it("should export StorageManager", () => {
    expect(StorageManager).toBeDefined();
    expect(typeof StorageManager).toBe("function");
  });

  it("should allow instantiation of DatabaseManager", () => {
    expect(() => new DatabaseManager()).not.toThrow();
  });

  it("should allow instantiation of StorageManager", () => {
    expect(() => new StorageManager()).not.toThrow();
  });
});
