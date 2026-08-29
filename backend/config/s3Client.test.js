const PLACEHOLDER = {
  R2_ENDPOINT: "https://your-account-id.r2.cloudflarestorage.com",
  R2_ACCESS_KEY_ID: "your-r2-access-key",
  R2_SECRET_ACCESS_KEY: "your-r2-secret-key",
  R2_BUCKET_NAME: "your-bucket-name",
};

const REAL = {
  R2_ENDPOINT: "https://b6c8a3976fe88b16.r2.cloudflarestorage.com",
  R2_ACCESS_KEY_ID: "real-access-key",
  R2_SECRET_ACCESS_KEY: "real-secret-key",
  R2_BUCKET_NAME: "my-bucket",
};

const ENV_KEYS = Object.keys(REAL);

function loadFreshModule() {
  const mod = {};
  jest.isolateModules(() => {
    const loaded = require("./R2");
    mod.storageConfig = loaded.storageConfig;
    mod.s3Client = loaded.s3Client;
  });
  return mod;
}

function withEnv(values) {
  const saved = {};
  ENV_KEYS.forEach((k) => (saved[k] = process.env[k]));
  Object.keys(process.env)
    .filter((k) => k.startsWith("R2_"))
    .forEach((k) => delete process.env[k]);
  Object.entries(values).forEach(([k, v]) => (process.env[k] = v));

  const mod = loadFreshModule();

  Object.keys(process.env)
    .filter((k) => k.startsWith("R2_"))
    .forEach((k) => delete process.env[k]);
  ENV_KEYS.forEach((k) => {
    if (saved[k] !== undefined) process.env[k] = saved[k];
  });

  return mod;
}

describe("Storage Config", () => {
  it("uses LOCAL storage when R2 vars are placeholders (not configured)", () => {
    const mod = withEnv({ ...PLACEHOLDER });
    expect(mod.storageConfig.type).toBe("LOCAL");
  });

  it("uses R2 storage when R2 is fully configured with real (non-placeholder) values", () => {
    const mod = withEnv({ ...REAL });
    expect(mod.storageConfig.type).toBe("R2");
  });

  it("returns a null s3Client when using local storage", () => {
    const mod = withEnv({ ...PLACEHOLDER });
    expect(mod.storageConfig.type).toBe("LOCAL");
    expect(mod.s3Client).toBeNull();
  });

  it("returns a real s3Client when using R2 storage", () => {
    const mod = withEnv({ ...REAL });
    expect(mod.storageConfig.type).toBe("R2");
    expect(mod.s3Client).not.toBeNull();
  });
});
