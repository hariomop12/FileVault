const { pool, query } = require("./config/db");

async function checkUser(email) {
  try {
    console.log(`Checking user with email: ${email}`);
    
    const result = await query("SELECT id, email, email_verified FROM userss WHERE email = $1", [email]);
    
    if (result.rows.length === 0) {
      console.log("❌ User does not exist in the database");
      return;
    }
    
    const user = result.rows[0];
    console.log("✅ User found:", user);
    
    if (!user.email_verified) {
      console.log("❌ Email is not verified. You must verify your email before logging in.");
    } else {
      console.log("✅ Email is verified");
    }
  } catch (error) {
    console.error("Error checking user:", error.message);
  } finally {
    // Close the pool connection
    pool.end();
  }
}

// Replace with your email
checkUser("lolxd2103pro@gmail.com");