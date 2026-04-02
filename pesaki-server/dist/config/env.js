"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    SUPABASE_URL: zod_1.z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: zod_1.z.string(),
    UPSTASH_REDIS_URL: zod_1.z.string().url(),
    UPSTASH_REDIS_TOKEN: zod_1.z.string(),
    PORT: zod_1.z.string().default('4000').transform(Number),
    CORS_ORIGIN: zod_1.z.string().default('http://localhost:3000'),
    MPESA_CONSUMER_KEY: zod_1.z.string().optional(),
    MPESA_CONSUMER_SECRET: zod_1.z.string().optional(),
    MPESA_SHORTCODE: zod_1.z.string().optional(),
    MPESA_PASSKEY: zod_1.z.string().optional(),
    MPESA_CALLBACK_URL: zod_1.z.string().url().optional(),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.format());
    process.exit(1);
}
exports.env = parsed.data;
