import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
import 'dotenv/config'

const PRIVATE_KEY  = process.env.ETH_PRIVATE_KEY  ?? '0x' + '0'.repeat(64)
const INFURA_KEY   = process.env.INFURA_KEY        ?? ''
const ETHERSCAN_KEY = process.env.ETHERSCAN_API_KEY ?? ''

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
      forking: process.env.FORK_URL ? { url: process.env.FORK_URL } : undefined,
    },
    localhost: {
      url: 'http://127.0.0.1:8545',
      chainId: 31337,
    },
    sepolia: {
      url:      `https://sepolia.infura.io/v3/${INFURA_KEY}`,
      accounts: [PRIVATE_KEY],
      chainId:  11155111,
    },
    mainnet: {
      url:      `https://mainnet.infura.io/v3/${INFURA_KEY}`,
      accounts: [PRIVATE_KEY],
      chainId:  1,
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_KEY,
  },
  gasReporter: {
    enabled:  process.env.REPORT_GAS === 'true',
    currency: 'USD',
  },
  paths: {
    sources:   './contracts',
    tests:     './test',
    cache:     './cache',
    artifacts: './artifacts',
  },
}

export default config
