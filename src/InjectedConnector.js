import { Connectors } from 'connex-react'
const { Connector, ErrorCodeMixin } = Connectors

const InjectedConnectorErrorCodes = ['ETHEREUM_ACCESS_DENIED', 'NO_WEB3', 'UNLOCK_REQUIRED']

export default class InjectedConnector extends ErrorCodeMixin(Connector, InjectedConnectorErrorCodes) {
  constructor(args = {}) {
    super(args)
    this.runOnDeactivation = []

    this.networkChangedHandler = this.networkChangedHandler.bind(this)
    this.accountsChangedHandler = this.accountsChangedHandler.bind(this)

    const { thor } = window
    if (thor && thor.isComet) {
      thor.autoRefreshOnNetworkChange = true
    }
  }

  async onActivation() {
    const { connex } = window

    if (!connex) {
      throw Error('no connex')
    }
  }

  async getProvider() {
    const { connex } = window
    return connex
  }

  async getAccount(provider) {
    const account = await super.getAccount(provider)

    if (account === null) {
      const unlockRequiredError = Error('VeChain account locked.')
      unlockRequiredError.code = InjectedConnector.errorCodes.UNLOCK_REQUIRED
      throw unlockRequiredError
    }

    return account
  }

  onDeactivation() {
    this.runOnDeactivation.forEach(runner => runner())
    this.runOnDeactivation = []
  }

  // event handlers
  networkChangedHandler(networkId) {
    const networkIdNumber = Number(networkId)

    try {
      super._validateNetworkId(networkIdNumber)

      super._web3ReactUpdateHandler({
        updateNetworkId: true,
        networkId: networkIdNumber
      })
    } catch (error) {
      super._web3ReactErrorHandler(error)
    }
  }

  accountsChangedHandler(accounts) {
    if (!accounts[0]) {
      const unlockRequiredError = Error('VeChain account locked.')
      unlockRequiredError.code = InjectedConnector.errorCodes.UNLOCK_REQUIRED
      super._web3ReactErrorHandler(unlockRequiredError)
    } else {
      super._web3ReactUpdateHandler({
        updateAccount: true,
        account: accounts[0]
      })
    }
  }
}
