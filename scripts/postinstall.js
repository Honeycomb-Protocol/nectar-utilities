const fs = require("fs");
const path = require("path");
const { spawnSync, execSync } = require("child_process");

const patchDir = path.join(__dirname, "..", "patch");

if (fs.existsSync(patchDir)) {
  execSync("cp -r patch/. node_modules");
}

spawnSync("yarn", ["compile"], { stdio: "inherit" });
