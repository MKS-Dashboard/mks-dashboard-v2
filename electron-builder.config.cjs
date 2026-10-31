const buildTimestamp = process.env.BUILD_TIMESTAMP;
const updateChannel = process.env.UPDATE_CHANNEL;
const publishChannel = updateChannel === "dev" ? "beta" : "latest";

module.exports = {
  appId: "com.mksdashboard.desktop",
  productName: "MKS Dashboard",
  directories: {
    output: "release",
  },
  files: [
    "out/**/*",
    "package.json",
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
    target: "nsis",
  },
  nsis: {
    include: "build\\installer.nsh",
    oneClick: false,
    allowToChangeInstallationDirectory: true,
  },
};
