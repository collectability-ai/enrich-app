const webpack = require("webpack");

module.exports = function override(config) {
  config.resolve.fallback = {
    ...config.resolve.fallback,
    assert: require.resolve("assert/"),
    os: require.resolve("os-browserify/browser"),
    path: require.resolve("path-browserify"),
    stream: require.resolve("stream-http"),
    https: require.resolve("https-browserify"),
    util: require.resolve("util/"),
    zlib: require.resolve("browserify-zlib"),
  };

  config.plugins = (config.plugins || []).concat([
    new webpack.ProvidePlugin({
      process: "process/browser",
    }),
  ]);

  return config;
};
