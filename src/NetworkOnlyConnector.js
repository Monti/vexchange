import { ethers } from 'ethers'
import { Connectors } from 'connex-react'

const { Connector } = Connectors

function getFallbackProvider(providerURL) {
  if (Number(process.env.REACT_APP_NETWORK_ID) === 1) {
    const etherscan = new ethers.providers.EtherscanProvider()
    const infura = new ethers.providers.JsonRpcProvider(providerURL)

    const providers = [infura, etherscan]

    return new ethers.providers.FallbackProvider(providers)
  } else {
    const infura = new ethers.providers.JsonRpcProvider(providerURL)

    const providers = [infura]

    return new ethers.providers.FallbackProvider(providers)
  }
}

export default class NetworkOnlyConnector extends Connector {
  constructor(kwargs) {
    const { providerURL, ...rest } = kwargs || {}
    super(rest)
    this.providerURL = providerURL
  }

  async onActivation() {
    if (!this.engine) {
      const provider = getFallbackProvider(this.providerURL)
      provider.polling = false
      provider.pollingInterval = 300000 // 5 minutes
      this.engine = provider
    }
  }

  async getNetworkId(provider) {
    const block = await provider.thor.block(0).get()
    const hex = ethers.utils.arrayify(block.id)
    const networkId = Array.from(hex).pop()

    return super._validateNetworkId(networkId)
  }

  async getProvider() {
    return this.engine
  }

  async getAccount() {
    return null
  }
}
