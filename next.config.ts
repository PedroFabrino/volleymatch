import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
});

const nextConfig: NextConfig = {
  turbopack: {}
};

import createNextIntlPlugin from 'next-intl/plugin';
const withNextIntl = createNextIntlPlugin();

export default withNextIntl(withPWA(nextConfig));
