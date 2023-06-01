const { config } = require("@swc/core/spack");

module.exports = config({
  entry: __dirname + "/src/index.ts",
  output: {
    path: __dirname + "/dist/scripts",
  },
});
