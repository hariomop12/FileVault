describe("Storage Config", () => {
  it("should use local storage when R2 is not configured", () => {
    const { storageConfig } = require("./R2");
    expect(storageConfig.type).toBe("LOCAL");
  });
});
