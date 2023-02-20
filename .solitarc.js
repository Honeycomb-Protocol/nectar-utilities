const path = require("path");

const programId = "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"
const programName = "anchor template"; // with spaces

module.exports = {
  idlGenerator: "anchor",
  programName: programName.replace(" ", "_"),
  programId,
  idlDir: path.join(__dirname, "src", "idl"),
  sdkDir: path.join(__dirname, "src", "generated", programName.replace(" ", "-")),
  binaryInstallDir: path.join(__dirname, ".crates"),
  programDir: path.join(__dirname, "programs", programName.replace(" ", "-")),
};