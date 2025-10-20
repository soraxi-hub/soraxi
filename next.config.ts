import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      new URL("https://res.cloudinary.com/**"),
      new URL("https://kziugcof2r.ufs.sh/**"),
      new URL("https://example.com/**"), // test purpose only
    ],
  },
  /* config options here */
};

export default nextConfig;
