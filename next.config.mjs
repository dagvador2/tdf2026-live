import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  customWorkerSrc: "worker",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { hostname: "pub-ae4d7f0558054ed39c8ff50613fa3f57.r2.dev" },
    ],
  },
};

export default withPWA(nextConfig);
