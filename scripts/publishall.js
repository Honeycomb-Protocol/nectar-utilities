const { execSync } = require("child_process");
const fs = require("fs");

console.log(process.env.NODE_AUTH_TOKEN)

// write the version in cargo.toml of all programs
const packages = fs.readdirSync("packages");
packages.forEach((package) => {
  if(package === "idl") return;
  execSync(`echo _authToken=${process.env.NODE_AUTH_TOKEN} >> .npmrc && npm publish --access public`, {
    cwd: `dist/${package}`,
    stdio: 'inherit'
  });
});