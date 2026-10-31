const { resolve } = require("node:path");

const buildTimestamp = process.env.BUILD_TIMESTAMP;
const updateChannel = process.env.UPDATE_CHANNEL;
const publishChannel = updateChannel === "dev" ? "beta" : "latest";
const isBeta = updateChannel === "dev";

module.exports = {
  appId: isBeta ? "com.mksdashboard.desktop.beta" : "com.mksdashboard.desktop",
  productName: isBeta ? "MKS Dashboard Beta" : "MKS Dashboard",
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
  artifactName: buildTimestamp && updateChannel
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
