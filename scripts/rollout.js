const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ignore = ["idl", "hpl-asset-assembler", "hpl-asset-manager"];
const ignoreBuild = process.argv.includes("--ignore-build");

versionBump = (package) => {
  if (ignore.includes(package)) return;

  const packageJsonPath = path.join(
    __dirname,
    "..",
    "packages",
    package,
    "package.json"
  );
  const cargoTomlPath = path.join(
    __dirname,
    "..",
    "programs",
    package,
    "Cargo.toml"
  );

  const currentVersion = require(`../packages/${package}/package.json`).version;
  let version = currentVersion.split(".");
  switch (process.argv[2]) {
    case "major":
      version[0] = parseInt(version[0]) + 1;
      version[1] = 0;
      version[2] = 0;
      break;
    case "minor":
      version[1] = parseInt(version[1]) + 1;
      version[2] = 0;
      break;
    case "patch":
      version[2] = parseInt(version[2]) + 1;
      break;
  }
  version = version.join(".");

  const packageJson = fs.readFileSync(packageJsonPath, "utf8");
  const newPackageJson = packageJson.replace(
    /"version": ".*"/,
    `"version": "${version}"`
  );
  fs.writeFileSync(packageJsonPath, newPackageJson);

  const cargoToml = fs.readFileSync(cargoTomlPath, "utf8");
  const newCargoToml = cargoToml.replace(
    /version = ".*"/,
    `version = "${version}"`
  );
  fs.writeFileSync(cargoTomlPath, newCargoToml);

  if (version !== currentVersion) {
    execSync(
      `cargo update -p ${package} && ${
        ignoreBuild ? "" : `yarn build:${package.replace("hpl-", "")} &&`
      } git add packages/${package}/*.json && git add programs/${package}/Cargo.toml && git add Cargo.lock && git commit -m "bump version to ${version}"`,
      {
        stdio: "inherit",
      }
    );
  }
};

const packageFlag = process.argv.indexOf("--package");
if (packageFlag !== -1) {
  versionBump("hpl-" + process.argv[packageFlag + 1]);
} else {
  const packages = fs.readdirSync("packages");
  packages.forEach(versionBump);
}
process.exit(0);
