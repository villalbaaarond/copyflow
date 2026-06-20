import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["argon2", "@prisma/client"],
  eslint: {
    // El lint se corre aparte; no debe bloquear el build de producción.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
