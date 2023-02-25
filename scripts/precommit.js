const { execSync } = require("child_process");
const fs = require("fs");

// write the version in cargo.toml of all programs
const packages = fs.readdirSync("packages");
packages.forEach((package) => {
  if(package === "idl") return;
  const cargoTomlPath = `programs/${package}/Cargo.toml`;
  const cargoToml = fs.readFileSync(cargoTomlPath, "utf8");
  
  const version = require(`../packages/${package}/package.json`).version;
  
  const newCargoToml = cargoToml.replace(
    /version = ".*"/,
    `version = "${version}"`
  );
  fs.writeFileSync(cargoTomlPath, newCargoToml);

  execSync(`cargo update -p ${package}`);
});