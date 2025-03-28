const withPlugins = require("next-compose-plugins");
const withImages = require("next-images");
module.exports = withPlugins(
  [
    [
      withImages,
      {
        future: {
          webpack5: true,
        },
      },
    ],
  ],
  {
    poweredByHeader: false,
    async rewrites() {
      return [
        {
          source: '/api/:path*',
          destination: `${process.env.NEXT_PRIVATE_API_URL}/:path*`
        }
      ];
    },
    webpack: (config, { isServer, dev, webpack }) => {
      config.module.rules.push({
        test: /\.(ts)?$/, // Just `tsx?` file only
        use: [
          // options.defaultLoaders.babel, I don't think it's necessary to have this loader too
          {
            loader: "ts-loader",
            options: {
              transpileOnly: true,
              experimentalWatchApi: true,
              onlyCompileBundledFiles: true,
            },
          },
        ],
      });
      return config;
    },
  }
);
