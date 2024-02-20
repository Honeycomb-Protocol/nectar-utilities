const path = require("path");
require("dotenv").config();

const defaultTypes = [
  "String",
  "bool",
  "string",
  "u8",
  "u16",
  "u32",
  "u64",
  "u128",
];

const undefinedTypes = ["HashMap", "Node", "Wallets", "ProfileData"];

const stringToType = (strType) => {
  let type;

  if (defaultTypes.includes(strType)) {
    type = strType.toLowerCase();
  } else if (strType.startsWith("Vec<")) {
    type = {
      vec: stringToType(strType.split("<")[1].slice(0, -1)),
    };
  } else if (strType.startsWith("Option<")) {
    type = {
      option: stringToType(strType.split("<")[1].slice(0, -1)),
    };
  } else if (strType.startsWith("HashMap<")) {
    const [key, mapValue] = strType
      .replaceAll("HashMap<", "")
      .slice(0, -1)
      .split(",");
    type = {
      hashMap: [stringToType(key), stringToType(mapValue)],
    };
  } else if (strType === "Node") {
    type = {
      array: ["u8", 32],
    };
  } else if (strType === "Wallets") {
    type = {
      vec: "publicKey",
    };
  } else if (strType === "ProfileData") {
    type = {
      hashMap: ["string", { vec: "string" }],
    };
  } else {
    type = { defined: strType };
  }

  return type;
};

const mapType = (type) => {
  if (
    undefinedTypes.includes(type.defined) ||
    type.defined?.includes("HashMap")
  ) {
    type = stringToType(type.defined);
  } else if (type.option) {
    type = {
      option: mapType(type.option),
    };
  } else if (type.vec) {
    type = {
      vec: mapType(type.vec),
    };
  }

  return type;
};

const mapTypes = (type) => {
  if (type.type.fields)
    type.type.fields = type.type.fields.map((field) => {
      field.type = mapType(field.type);
      return field;
    });

  if (type.type.variants)
    type.type.variants = type.type.variants.map((variant) => {
      if (variant.fields)
        variant.fields = variant.fields.map((field) => {
          if (field.defined) field = mapType(field);
          if (field.type) field.type = mapType(field.type);
          return field;
        });
      return variant;
    });

  return type;
};

const createConfig = (name, programId, customs) => {
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
    rustbin: {
      versionRangeFallback: "0.29.0",
    },
    idlHook: (idl) => {
      customs?.types && idl.types.push(...customs.types);
      idl.types = idl.types.map(mapTypes);

      idl.accounts = idl.accounts.map(mapTypes);

      const missingTypes = [
        {
          name: "CharacterUsedBy",
          type: {
            kind: "enum",
            variants: [
              {
                name: "None",
              },
              {
                name: "Staking",
                fields: [
                  {
                    name: "pool",
                    type: "publicKey",
                  },
                  {
                    name: "staker",
                    type: "publicKey",
                  },
                  {
                    name: "stakedAt",
                    type: "i64",
                  },
                  {
                    name: "claimedAt",
                    type: "i64",
                  },
                ],
              },
              {
                name: "Mission",
                fields: [
                  {
                    name: "id",
                    type: "publicKey",
                  },
                  {
                    name: "rewards",
                    type: {
                      vec: {
                        defined: "EarnedReward",
                      },
                    },
                  },
                  {
                    name: "endTime",
                    type: "u64",
                  },
                  {
                    name: "rewardsCollected",
                    type: "bool",
                  },
                ],
              },
              {
                name: "Guild",
                fields: [
                  {
                    name: "id",
                    type: "publicKey",
                  },
                  {
                    name: "role",
                    type: {
                      defined: "GuildRole",
                    },
                  },
                  {
                    name: "order",
                    type: "u8",
                  },
                ],
              },
            ],
          },
        },
        {
          name: "CharacterSource",
          type: {
            kind: "enum",
            variants: [
              {
                name: "Wrapped",
                fields: [
                  {
                    name: "mint",
                    type: "publicKey",
                  },
                  {
                    name: "criteria",
                    type: {
                      defined: "NftWrapCriteria",
                    },
                  },
                  {
                    name: "isCompressed",
                    type: "bool",
                  },
                ],
              },
            ],
          },
        },
        {
          name: "GuildRole",
          type: {
            kind: "enum",
            variants: [
              {
                name: "Chief",
              },
              {
                name: "Member",
              },
            ],
          },
        },
        {
          name: "NftWrapCriteria",
          type: {
            kind: "enum",
            variants: [
              {
                name: "Collection",
                fields: ["publicKey"],
              },
              {
                name: "Creator",
                fields: ["publicKey"],
              },
              {
                name: "MerkleTree",
                fields: ["publicKey"],
              },
            ],
          },
        },
        {
          "name": "EarnedReward",
          "type": {
            "kind": "struct",
            "fields": [
              {
                "name": "delta",
                "type": "u8"
              },
              {
                "name": "MerkleTree",
                "fields": [
                  "publicKey"
                ]
              }
            ]
          }
        },
      ];

      idl.types.push(...missingTypes);

      return idl;
    },
  };
};

const configs = {
  "nectar-staking": createConfig(
    "nectar-staking",
    "MiNESdRXUSmWY7NkAKdW9nMkjJZCaucguY3MDvkSmr6",
    {
      types: [
        {
          name: "CharacterSource",
          type: {
            kind: "enum",
            variants: [
              {
                name: "Wrapped",
                fields: [
                  {
                    name: "mint",
                    type: "publicKey",
                  },
                  {
                    name: "criteria",
                    type: {
                      defined: "NftWrapCriteria",
                    },
                  },
                  {
                    name: "isCompressed",
                    type: "bool",
                  },
                ],
              },
            ],
          },
        },
        {
          name: "NftWrapCriteria",
          type: {
            kind: "enum",
            variants: [
              {
                name: "Collection",
                fields: ["publicKey"],
              },
              {
                name: "Creator",
                fields: ["publicKey"],
              },
              {
                name: "MerkleTree",
                fields: ["publicKey"],
              },
            ],
          },
        },
        {
          name: "CharacterUsedBy",
          type: {
            kind: "enum",
            variants: [
              {
                name: "None",
              },
              {
                name: "Staking",
                fields: [
                  {
                    name: "pool",
                    type: "publicKey",
                  },
                  {
                    name: "staker",
                    type: "publicKey",
                  },
                  {
                    name: "stakedAt",
                    type: "i64",
                  },
                  {
                    name: "claimedAt",
                    type: "i64",
                  },
                ],
              },
              {
                name: "Mission",
                fields: [
                  {
                    name: "id",
                    type: "publicKey",
                  },
                  {
                    name: "rewards",
                    type: {
                      vec: {
                        defined: "EarnedReward",
                      },
                    },
                  },
                  {
                    name: "endTime",
                    type: "u64",
                  },
                  {
                    name: "rewardsCollected",
                    type: "bool",
                  },
                ],
              },
              {
                name: "Guild",
                fields: [
                  {
                    name: "id",
                    type: "publicKey",
                  },
                  {
                    name: "role",
                    type: {
                      defined: "GuildRole",
                    },
                  },
                  {
                    name: "order",
                    type: "u8",
                  },
                ],
              },
            ],
          },
        },
        {
          name: "EarnedReward",
          type: {
            kind: "struct",
            fields: [
              {
                name: "delta",
                type: "u8",
              },
              {
                name: "rewardIdx",
                type: "u8",
              },
            ],
          },
        },
        {
          name: "GuildRole",
          type: {
            kind: "enum",
            variants: [
              {
                name: "Chief",
              },
              {
                name: "Member",
              },
            ],
          },
        },
      ],
    }
  ),
  "nectar-missions": createConfig(
    "nectar-missions",
    // "HuntaX1CmUt5EByyFPE8pMf13SpvezybmMTtjmpmGmfj",
    "BNdAHQMniLicundk1jo4qKWyNr9C8bK7oUrzgSwoSGmZ",
    {
      types: [
        {
          name: "CharacterSource",
          type: {
            kind: "enum",
            variants: [
              {
                name: "Wrapped",
                fields: [
                  {
                    name: "mint",
                    type: "publicKey",
                  },
                  {
                    name: "criteria",
                    type: {
                      defined: "NftWrapCriteria",
                    },
                  },
                  {
                    name: "isCompressed",
                    type: "bool",
                  },
                ],
              },
            ],
          },
        },
        {
          name: "NftWrapCriteria",
          type: {
            kind: "enum",
            variants: [
              {
                name: "Collection",
                fields: ["publicKey"],
              },
              {
                name: "Creator",
                fields: ["publicKey"],
              },
              {
                name: "MerkleTree",
                fields: ["publicKey"],
              },
            ],
          },
        },
        {
          name: "CharacterUsedBy",
          type: {
            kind: "enum",
            variants: [
              {
                name: "None",
              },
              {
                name: "Staking",
                fields: [
                  {
                    name: "pool",
                    type: "publicKey",
                  },
                  {
                    name: "staker",
                    type: "publicKey",
                  },
                  {
                    name: "stakedAt",
                    type: "i64",
                  },
                  {
                    name: "claimedAt",
                    type: "i64",
                  },
                ],
              },
              {
                name: "Mission",
                fields: [
                  {
                    name: "id",
                    type: "publicKey",
                  },
                  {
                    name: "rewards",
                    type: {
                      vec: {
                        defined: "EarnedReward",
                      },
                    },
                  },
                  {
                    name: "endTime",
                    type: "u64",
                  },
                  {
                    name: "rewardsCollected",
                    type: "bool",
                  },
                ],
              },
              {
                name: "Guild",
                fields: [
                  {
                    name: "id",
                    type: "publicKey",
                  },
                  {
                    name: "role",
                    type: {
                      defined: "GuildRole",
                    },
                  },
                  {
                    name: "order",
                    type: "u8",
                  },
                ],
              },
            ],
          },
        },
        {
          name: "EarnedReward",
          type: {
            kind: "struct",
            fields: [
              {
                name: "delta",
                type: "u8",
              },
              {
                name: "rewardIdx",
                type: "u8",
              },
            ],
          },
        },
        {
          name: "GuildRole",
          type: {
            kind: "enum",
            variants: [
              {
                name: "Chief",
              },
              {
                name: "Member",
              },
            ],
          },
        },
      ],
    }
  ),
};

const defaultProgram = Object.keys(configs)[0];
module.exports = configs[process.env.PROGRAM_NAME || defaultProgram];
