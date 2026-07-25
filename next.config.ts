import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // A Supabase csomagok barrel-importjainak tree-shakingje → kisebb kliens-bundle
    // azokon az oldalakon, ahol a böngésző-kliens be van húzva.
    optimizePackageImports: ["@supabase/supabase-js", "@supabase/ssr"],
  },
};

export default nextConfig;
