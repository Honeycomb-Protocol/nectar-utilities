const { execSync } = require("child_process");
const fs = require("fs");
const version = require("../package.json").version;

// write the version in cargo.toml of all programs
const programs = fs.readdirSync("programs");
programs.forEach((program) => {
  const cargoTomlPath = `programs/${program}/Cargo.toml`;
  const cargoToml = fs.readFileSync(cargoTomlPath, "utf8");
  const newCargoToml = cargoToml.replace(
    /version = ".*"/,
    `version = "${version}"`
  );
  fs.writeFileSync(cargoTomlPath, newCargoToml);

  const name = cargoToml.match(/name = "(.*)"/)[1];
  execSync(`cargo update -p ${name}`);
});