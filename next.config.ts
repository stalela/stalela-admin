import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ["@stalela/commons"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hwfhtdlbtjhmwzyvejxd.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
