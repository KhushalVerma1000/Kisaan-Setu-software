import type { NextConfig } from "next";

const nextConfig: NextConfig = {

=======
  compiler: {
    // Remove specific console methods in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error'] // Keep console.error but remove console.log, console.warn, etc.
    } : false
  }
  // config options here

};

export default nextConfig;
