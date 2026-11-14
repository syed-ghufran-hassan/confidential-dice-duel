import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const result = await deploy("ConfidentialDiceDuel", {
    from: deployer,
    log: true,
    waitConfirmations: 1,
  });

  console.log(`ConfidentialDiceDuel deployed at: ${result.address}`);
};

export default func;
func.tags = ["ConfidentialDiceDuel"];