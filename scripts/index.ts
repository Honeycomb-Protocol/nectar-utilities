import staking from "./staking";

function main() {
  const args = process.argv.slice(2);
  const action = args[1];
  const network = "devnet";

  switch (args[0]) {
    case "staking":
      staking(action, network, ...args.slice(2));
      break;
    default:
      throw new Error("Invalid program name");
  }
}

main();
