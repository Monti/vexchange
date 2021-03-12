import Connex from '@vechain/connex'
import { AbstractConnectorArguments, ConnectorUpdate } from '../types'
import { AbstractConnector } from '../AbstractConnector'
import warning from 'tiny-warning'

const connex = new Connex({
  node: 'https://testnet.veblocks.net/',
  network: 'test'
})

const msg = {
  purpose: 'identification',
  payload: {
    type: 'text',
    content: 'Select account to sign tx'
  }
}

//@ts-ignore
const sign = connex.vendor.sign('cert', msg)

export class NoEthereumProviderError extends Error {
  public constructor() {
    super()
    this.name = this.constructor.name
    this.message = 'No Ethereum provider was found on window.ethereum.'
  }
}

export class UserRejectedRequestError extends Error {
  public constructor() {
    super()
    this.name = this.constructor.name
    this.message = 'The user rejected the request.'
  }
}

export class InjectedConnector extends AbstractConnector {
  constructor(kwargs: AbstractConnectorArguments) {
    super(kwargs)

    this.handleNetworkChanged = this.handleNetworkChanged.bind(this)
    this.handleChainChanged = this.handleChainChanged.bind(this)
    this.handleAccountsChanged = this.handleAccountsChanged.bind(this)
    this.handleClose = this.handleClose.bind(this)
  }

  private handleChainChanged(chainId: string | number): void {
    this.emitUpdate({ chainId, provider: window.ethereum })
  }

  private handleAccountsChanged(accounts: string[]): void {
    if (accounts.length === 0) {
      this.emitDeactivate()
    } else {
      this.emitUpdate({ account: accounts[0] })
    }
  }

  private handleClose(code: number, reason: string): void {
    this.emitDeactivate()
  }

  private handleNetworkChanged(networkId: string | number): void {
    this.emitUpdate({ chainId: networkId, provider: window.ethereum })
  }

  public async activate(): Promise<ConnectorUpdate> {
    // try to activate + get account via eth_requestAccounts
    let account
    try {
      const { annex } = await sign.request()
      account = annex.signer
    } catch (error) {
      if ((error as any).code === 4001) {
        throw new UserRejectedRequestError()
      }
      warning(false, 'eth_requestAccounts was unsuccessful, falling back to enable')
    }

    return { provider: connex, ...(account ? { account } : {}) }
  }

  public async getProvider(): Promise<any> {
    return window.ethereum
  }

  public async getChainId(): Promise<number | string> {
    return 1
  }

  public async getAccount(): Promise<null | string> {
    // try to activate + get account via eth_requestAccounts
    let account
    try {
      const { annex } = await sign.request()
      account = annex.signer
    } catch (error) {
      if ((error as any).code === 4001) {
        throw new UserRejectedRequestError()
      }
      warning(false, 'eth_requestAccounts was unsuccessful, falling back to enable')
    }

    return account
  }

  //@ts-ignore
  public deactivate() {}

  public async isAuthorized(): Promise<boolean> {
    return false
  }
}
