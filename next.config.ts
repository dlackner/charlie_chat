import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Next.js 16 defaults to qualities: [75]; keep 100 since FeatureTile/LandscapeFeatureTile use it.
    qualities: [75, 100],
  },
};

export default nextConfig;