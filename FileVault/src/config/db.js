const { Pool } = require("pg");
const pgMonitor = require("pg-monitor");
const { Console } = require("winston/lib/winston/transports");
 

const pool = new Pool({
  user: "avnadmin",
  password: "AVNS_kYc_wSP26wAlt5gT4FS",
  host: "hariomop-hariomvirkhare02-01f9.l.aivencloud.com",
  port: 19233,
  database: "defaultdb",
  connectionTimeoutMillis: 30000, // 30 seconds
  idleTimeoutMillis: 30000, // 30 seconds
  ssl: {
    rejectUnauthorized: true,
    ca: `-----BEGIN CERTIFICATE-----
MIIEQTCCAqmgAwIBAgIUUOVpP8Zu4yi/FbU5D0qH3pNWuJ8wDQYJKoZIhvcNAQEM
BQAwOjE4MDYGA1UEAwwvNWE5MGVjMjMtMDdhNy00MjExLWIzZTQtM2VhOTBlMjBm
MTVjIFByb2plY3QgQ0EwHhcNMjQxMjE2MDYxNzUxWhcNMzQxMjE0MDYxNzUxWjA6
MTgwNgYDVQQDDC81YTkwZWMyMy0wN2E3LTQyMTEtYjNlNC0zZWE5MGUyMGYxNWMg
UHJvamVjdCBDQTCCAaIwDQYJKoZIhvcNAQEBBQADggGPADCCAYoCggGBAO4aUEf+
xRUhz15rnre7LqBb7eOjlIJR1yM85mlPxbvaRc10WVcuvwIo4iYftB/ixkGlw0D7
tSW2c00UmjCHJOiRJrpdLedtO9nyCxuRiGdlR873pBtpNPWm+czsHrPvzUrNRfHZ
e/6ngSx41vk6C6XP/P2pi5CZ5HC6RuYBcp/DSxfuiNgRfbeykKxctScWATXzUnUV
OcO6bpHSjjgS2ng1P3gtmQ6IqPaRDHQcNopEF5vdVFJMjr8QIJ/5K25B7oAU4D7T
E69S1+j7/0mrgdnhjQLvxobuoJGwBW5I9KS/hsnGF2uqxsBpEOco/ZeZNRdoZTyU
pxf9GfjQKHkjbUWYrNLEdFIL+tCuRPBpat5FeWmMwT8D9oaH5Y+mEYD1mF5xAPHS
/mcGP5ozdNqFB485bKYsTlvfqwLm2nSK9bO2c7w+9uX4aGr+BEfQRuDdj6wGHKQn
ihrtd0/eGMMj6cEPAh/7heGKltu7o7rkEPfxw+Od9MmUfCcegDSl3EgsjwIDAQAB
oz8wPTAdBgNVHQ4EFgQUfdPHFeg5n3xDxwHeUWm+gVxvZG4wDwYDVR0TBAgwBgEB
/wIBADALBgNVHQ8EBAMCAQYwDQYJKoZIhvcNAQEMBQADggGBAN/Samp4ha2Xv+3M
ZF6ORk3A3eWxNAJJfEOXP5pMxFjD58+EPvfA0f34Thdrm+Fic47ZThALm8M7BaD1
ifiQJp9TmX81R3jIXClPETNVJnIMITuzvbTeITngqugqO0aCoDmZSe05wSApTrjq
5dH+NlAo0xRXnq/0UWZCiDed83Ar0Gs5o7IKurHoR8LeThdSjduZMooOa6V8X6Yo
u5S+KghQB1xeMWpxrCO0YKZFIH/P9lXpKzHwRSbY8bfiOX4GVuwsAFzohHDfg+U7
DjPfVj6ahb4xnCIa0+8TU1hwCsaXbAKY/Nf8orYgxXAbXHdauMucQ4lT0XDVkRiT
hZ+fLOxHAqNTdMDn3B89ztqiDhfcX0GFgfQP6ElItv4UllXlAV8rH/czfVZPQ2KU
vYgaImv3A2P6TlpwAR/p9c+cZbDahGAlysqGuecx754kZH86zeFCxJQrXBVz6WIp
2nhTTWDlWSwdYB/AhIvySaRfdqKLhKLmWQvJB1ZlHGtUKzf6Uw==
-----END CERTIFICATE-----`,
  },
});

// 📊 Monitor Database Queries (for Development)
if (process.env.NODE_ENV === "development") {
  pgMonitor.attach(pool);
  pgMonitor.setLog((msg, info) => {
    logger.info(`📊 DB QUERY: ${msg}`);
  });
}

// 🚨 Handle Pool Errors
pool.on("error", (err) => {
  logger.error(`❌ Unexpected error on idle client: ${err}`);
  process.exit(-1);
});

// ✅ **Test DB Connection**
(async () => {
  try {
    const client = await pool.connect();
    console.log("✅ DB connection successful"); // Log success
    client.release();
  } catch (err) {
    console.log(`❌ DB connection failed: ${err.message}`); // Log failure
  }
})();

// 🛠️ Export DB Query Function with Logging
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`✅ Executed query: ${text}, Duration: ${duration}ms`);
    return res;
  } catch (err) {
    console.log(`❌ Query Error: ${err.message}`);
    throw err;
  }
};

module.exports = { pool, query };