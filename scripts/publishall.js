const { execSync } = require("child_process");
const fs = require("fs");

// write the version in cargo.toml of all programs
const packages = fs.readdirSync("packages");
packages.forEach((package) => {
  execSync(`npm publish --access public`, {
    cwd: `dist/${package}`,
    stdio: 'inherit'
  });
});