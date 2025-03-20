const path = require("path");
require("dotenv").config();

module.exports = {
  client: {
    service: {
      name: "sequence",
      url: process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/graphql` : undefined,
    },
    includes: [path.join(__dirname, "**/*.{ts,tsx,js,jsx}")],
    excludes: ["**/node_modules", "**/__tests__/**", "**/*.test.*"],
  },
};
