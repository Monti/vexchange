import { InjectedConnector } from './InjectedConnector'

import { NetworkConnector } from './Network'

const POLLING_INTERVAL = 10000
const NETWORK_URL = process.env.REACT_APP_NETWORK_URL

export const network = new NetworkConnector({
  urls: { [Number(process.env.REACT_APP_CHAIN_ID)]: NETWORK_URL },
  pollingInterval: POLLING_INTERVAL * 3
})

export const injected = new InjectedConnector({
  supportedChainIds: [1, 3, 4, 5, 42]
})