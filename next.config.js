/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@prisma/client", "ws", "bufferutil", "utf-8-validate"],
};

module.exports = nextConfig;
