module.exports = {
  apps: [
    {
      name: "PhotoGalleryV2",
      script: "src/index.js",
      env: {
        NODE_ENV: "production", // You can set additional env vars here
      },
    },
  ],
};
