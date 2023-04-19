const path = require("path");

const configs = {
  "nectar-staking": {
    idlGenerator: "anchor",
    programName: "hpl_nectar_staking",
    programId: "STAkY8Zx3rfY2MUyTJkdLB5jaM47mnDpKUUWzkj5d3L",
    idlDir: path.join(__dirname, "packages", "idl"),
    sdkDir: path.join(__dirname, "packages", "hpl-nectar-staking", "generated"),
    binaryInstallDir: path.join(__dirname, ".crates"),
    programDir: path.join(__dirname, "programs", "hpl-nectar-staking"),
    removeExistingIdl: false,
    idlHook: (idl) => {
      idl.types = idl.types.filter(
        (type) => type.name !== "ActionType" && type.name !== "PlatformGateArgs"
      );

      idl.accounts = idl.accounts.map(account => {
        
        account.type.fields = account.type.fields.map(field => {
          if(field.type.defined?.includes("HashMap")) {
            field.type = { hashMap: [ 'string', { defined: field.type.defined.split(",")[1].slice(0, -1) }] }
          }

          return field
        })

        return account;
      })
      return idl;
    },
  },
};

const defaultProgram = Object.keys(configs)[0];
const activeConfig =
  configs[process.env.SOLITA_HPL_PROGRAM || defaultProgram] ||
  configs[defaultProgram];

module.exports = activeConfig;
