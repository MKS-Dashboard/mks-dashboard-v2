const { resolve } = require("node:path");

const buildTimestamp = process.env.BUILD_TIMESTAMP;
const updateChannel = process.env.UPDATE_CHANNEL;
const testBuildNumber = process.env.TEST_BUILD_NUMBER;
if (testBuildNumber !== undefined && !/^[1-9]\d*$/.test(testBuildNumber)) {
  throw new Error("TEST_BUILD_NUMBER moet een positief geheel getal zijn.");
}
const isTest = testBuildNumber !== undefined;
const publishChannel = updateChannel === "dev" ? "beta" : "latest";
const isBeta = updateChannel === "dev";

module.exports = {
  appId: isTest ? "com.mksdashboard.desktop.tst" : isBeta ? "com.mksdashboard.desktop.beta" : "com.mksdashboard.desktop",
  productName: isTest ? "MKS Dashboard TST" : isBeta ? "MKS Dashboard Beta" : "MKS Dashboard",
  ...(isTest && { extraMetadata: { version: `${require("./package.json").version.split("-")[0]}-tst.${testBuildNumber}` } }),
  directories: {
    output: "release",
  },
  files: [
    "out/**/*",
    "package.json",
  ],
  extraResources: [
    { from: resolve(__dirname, "build", "icon.png"), to: "icon.png" },
  ],
  artifactName: isTest ? "MKS-Dashboard-Setup-${version}.${ext}" : buildTimestamp && updateChannel
    ? `MKS-Dashboard-Setup-${buildTimestamp}-${updateChannel}.\${ext}`
    : "MKS-Dashboard-Setup-${version}.${ext}",
  publish: [
    {
      provider: "github",
      owner: "MKS-Dashboard",
      repo: "mks-dashboard-v2",
      channel: publishChannel,
    },
  ],
  win: {
    icon: resolve(__dirname, "build", "icon.png"),
    target: "nsis",
  },
  nsis: {
    include: resolve(__dirname, "build", "installer.nsh"),
    oneClick: false,
    allowToChangeInstallationDirectory: true,
  },
};
