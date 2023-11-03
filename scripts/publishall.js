const { execSync } = require("child_process");
const fs = require("fs");

// write the version in cargo.toml of all programs
const packages = fs.readdirSync("packages");
packages.forEach((package) => {
  if (package === "idl") return;
  try {
    execSync(
      `echo _authToken=${process.env.NODE_AUTH_TOKEN} >> .npmrc && npm publish --access public`,
      {
        cwd: `dist/${package}`,
        stdio: "inherit",
      }
    );
  } catch {
    console.log(`Error publishing ${package}, continuing...`);
  }
});
