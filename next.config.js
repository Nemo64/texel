module.exports = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",

              "object-src 'none'",
              "style-src 'unsafe-inline' 'self'",
              "connect-src 'self' https://api.bitbucket.org/",

              "form-action 'none'",
              "frame-ancestors 'none'",
            ].join(';'),
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Referrer-Policy',
            value: 'no-referrer',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'off',
          },
          {
            key: 'X-Frame-Options',
            value: 'deny',
          },
        ],
      },
    ];
  },
};
