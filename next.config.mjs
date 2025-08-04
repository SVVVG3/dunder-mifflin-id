/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow ngrok and other dev origins
  allowedDevOrigins: ['8a08d2da340d.ngrok-free.app'],
  
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
        source: '/(soprano-embed|soprano-icon)\\.png',
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
