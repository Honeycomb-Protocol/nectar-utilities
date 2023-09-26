const path = require("path");

const createConfig = (name, programId) => {
  const packageName = "hpl-" + name;
  const programName = "hpl_" + name.replaceAll(/-/g, "_");

  return {
    idlGenerator: "anchor",
    programName,
    programId: programId,
    idlDir: path.join(__dirname, "packages", packageName),
    sdkDir: path.join(__dirname, "packages", packageName, "generated"),
    binaryInstallDir: path.join(__dirname, ".crates"),
    programDir: path.join(__dirname, "programs", packageName),
    removeExistingIdl: false,
    idlHook: (idl) => {
      idl.types = idl.types.filter(
        (type) => type.name !== "ActionType" && type.name !== "PlatformGateArgs"
      );

      idl.accounts = idl.accounts.map((account) => {
        account.type.fields = account.type.fields.map((field) => {
          if (field.type.defined?.includes("HashMap")) {
            field.type = {
              hashMap: [
                "string",
                { defined: field.type.defined.split(",")[1].slice(0, -1) },
              ],
            };
          }

          return field;
        });

        return account;
      });
      return idl;
    },
  };
};

const configs = {
  "nectar-staking": createConfig(
    "nectar-staking",
    "MiNESdRXUSmWY7NkAKdW9nMkjJZCaucguY3MDvkSmr6"
  ),
  "nectar-missions": createConfig(
    "nectar-missions",
    "HuntaX1CmUt5EByyFPE8pMf13SpvezybmMTtjmpmGmfj"
  ),
};

const defaultProgram = "nectar-missions" || Object.keys(configs)[0];
const activeConfig =
  configs[process.env.SOLITA_HPL_PROGRAM || defaultProgram] ||
  configs[defaultProgram];

module.exports = activeConfig;
