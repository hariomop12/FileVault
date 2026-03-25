 

// Use dynamic import for nanoid
async function generateSecretKey() {
  // Import nanoid dynamically
  const { nanoid } = await import('nanoid');
  return nanoid(32);
}

module.exports = generateSecretKey;