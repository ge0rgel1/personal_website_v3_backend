import NextAuth from "next-auth";
import { Pool } from "pg";
import { AuthOptions } from "next-auth";
import { Adapter } from "next-auth/adapters";
import PgAdapter from "@auth/pg-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";

// In-memory store for rate limiting
const loginAttempts = new Map<string, { count: number, expiry: number }>();
const RATE_LIMIT_COUNT = 5; // Max 5 attempts
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const authOptions: AuthOptions = {
  adapter: PgAdapter(pool) as Adapter,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text", placeholder: "jsmith@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        const ip = (req.headers?.['x-forwarded-for'] as string) || (req.headers?.['x-real-ip'] as string) || 'unknown';

        const attempt = loginAttempts.get(ip);
        const now = Date.now();

        // Check if the IP is currently rate-limited
        if (attempt && attempt.expiry > now && attempt.count >= RATE_LIMIT_COUNT) {
          console.warn(`Rate limit exceeded for IP: ${ip}`);
          throw new Error('Too many failed login attempts. Please try again later.');
        }

        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Function to handle a failed login attempt
        const handleFailedAttempt = () => {
            const currentAttempt = loginAttempts.get(ip);
            const newCount = (currentAttempt && currentAttempt.expiry > now) ? currentAttempt.count + 1 : 1;
            loginAttempts.set(ip, { count: newCount, expiry: now + RATE_LIMIT_WINDOW });
            return null;
        };

        // Find user in the database
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [credentials.email]);
        const user = userResult.rows[0];

        if (!user || !user.password) {
          return handleFailedAttempt();
        }

        // Compare the provided password with the stored hash
        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (isValid) {
          // If valid, reset the rate limit counter and return the user
          loginAttempts.delete(ip);
          return { id: user.id, name: user.name, email: user.email };
        } else {
          // If invalid, log the failed attempt and return null
          return handleFailedAttempt();
        }
      }
    })
  ],
  session: {
    // Use JSON Web Tokens for session management
    strategy: "jwt",
  },
  secret: process.env.AUTH_SECRET,
  pages: {
    // Redirect users to our custom login page
    signIn: '/login',
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
