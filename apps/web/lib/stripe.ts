import Stripe from "stripe";

// During build time, use a dummy key to avoid errors
// The real key will be used at runtime
const stripeKey = process.env.STRIPE_SECRET_KEY || "sk_test_dummy_key_for_build";

export const stripe = new Stripe(stripeKey, {
  apiVersion: "2025-12-15.clover",
});

export const getAppUrl = () => {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
};
