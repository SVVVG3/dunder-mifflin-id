/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production config - no dev origins needed
  
  async headers() {
    return [
      {
        // Apply cache headers to static image files
        source: '/:path*\\.(png|jpg|jpeg|gif|svg|ico|webp)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, s-maxage=86400', // 1 day instead of 14 days
          },
        ],
      },
      {
        // Special cache control for embed images that change frequently  
        source: '/(office-embed|office-icon)\\.png',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, s-maxage=3600', // 1 hour for embed images
          },
        ],
      },
    ];
  },
};

export default nextConfig;
