const { execSync } = require("child_process");
const fs = require("fs");

console.log(process.env.NODE_AUTH_TOKEN)

// write the version in cargo.toml of all programs
const packages = fs.readdirSync("packages");
packages.forEach((package) => {
  execSync(`ls -a && cp .npmrc ./dist/${package}/.npmrc`, {
    stdio: 'inherit'
  })
  execSync(`npm publish --access public`, {
    cwd: `dist/${package}`,
    stdio: 'inherit'
  });
});