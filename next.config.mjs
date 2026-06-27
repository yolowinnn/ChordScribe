/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export", // static SPA for Cloudflare Pages (API lives in /functions)
  reactStrictMode: true,
  images: { unoptimized: true },
};

export default nextConfig;
