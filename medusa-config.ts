import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const redisUrl = process.env.REDIS_URL

// Redis modules - only enabled when REDIS_URL is provided (production)
const redisModules = redisUrl
  ? [
      {
        resolve: "@medusajs/medusa/event-bus-redis",
        options: {
          redisUrl,
        },
      },
      {
        resolve: "@medusajs/medusa/workflow-engine-redis",
        options: {
          redis: {
            redisUrl,
          },
        },
      },
      {
        resolve: "@medusajs/medusa/caching",
        options: {
          providers: [
            {
              resolve: "@medusajs/caching-redis",
              id: "caching-redis",
              is_default: true,
              options: {
                redisUrl,
              },
            },
          ],
        },
      },
      {
        resolve: "@medusajs/medusa/locking",
        options: {
          providers: [
            {
              resolve: "@medusajs/medusa/locking-redis",
              id: "locking-redis",
              is_default: true,
              options: {
                redisUrl,
              },
            },
          ],
        },
      },
    ]
  : []

if (redisUrl) {
  console.log("[medusa-config] Redis modules ENABLED — connecting to Redis")
} else {
  console.log("[medusa-config] Redis modules DISABLED — no REDIS_URL provided, using in-memory defaults")
}

module.exports = defineConfig({
  admin: {
    disable: process.env.DISABLE_ADMIN === "true",
  },
  modules: [
    { resolve: "./src/modules/brand" },
    { resolve: "./src/modules/seo" },
    { resolve: "./src/modules/entity-content" },
    { resolve: "./src/modules/email-template" },
    {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: [
          {
            resolve: "./src/modules/email-notification",
            id: "gmail",
            options: {
              channels: ["email"],
              email_from: process.env.GMAIL_EMAIL_FROM,
              email_from_name: process.env.GMAIL_EMAIL_FROM_NAME,
              gmail_user: process.env.GMAIL_USER,
              google_client_id: process.env.GOOGLE_CLIENT_ID,
              google_client_secret: process.env.GOOGLE_CLIENT_SECRET,
              google_refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
            },
          },
        ],
      },
    },
    ...redisModules,
  ],
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    databaseDriverOptions: process.env.DATABASE_SSL === "false" ? {} : {
      ssl: { rejectUnauthorized: false },
    },
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    }
  }
})
