import React, { createContext, useContext, useReducer, useMemo, useCallback, useEffect } from 'react'
import { useWeb3Context } from 'web3-react-thor'
import { ethers } from 'ethers'

import {
  isAddress,
  getTokenName,
  getTokenSymbol,
  getTokenDecimals,
  getTokenExchangeAddressFromFactory,
  safeAccess
} from '../utils'

const NAME = 'name'
const SYMBOL = 'symbol'
const DECIMALS = 'decimals'
const EXCHANGE_ADDRESS = 'exchangeAddress'

const UPDATE = 'UPDATE'

const VET = {
  VET: {
    [NAME]: 'VeChain',
    [SYMBOL]: 'VET',
    [DECIMALS]: 18,
    [EXCHANGE_ADDRESS]: null
  }
}

const INITIAL_TOKENS_CONTEXT = {
  74: {
    '0x0000000000000000000000000000456e65726779': {
      [NAME]: 'VeThor',
      [SYMBOL]: 'VTHO',
      [DECIMALS]: 18,
      [EXCHANGE_ADDRESS]: '0xf9F99f982f3Ea9020f0A0afd4D4679dFEe1B63cf'
    },
    '0x0CE6661b4ba86a0EA7cA2Bd86a0De87b0B860F14': {
      [NAME]: 'OceanEx',
      [SYMBOL]: 'OCE',
      [DECIMALS]: 18,
      [EXCHANGE_ADDRESS]: '0xDC391a5dbB89a3F768c41Cfa0e85dcaAF3A91f91'
    },
    '0x1b8ec6c2a45cca481da6f243df0d7a5744afc1f8': {
      [NAME]: 'Decent.bet',
      [SYMBOL]: 'DBET',
      [DECIMALS]: 18,
      [EXCHANGE_ADDRESS]: '0x18C2385481cDf28779aC271272398dD61cc8CF3E'
    },
    '0x5db3C8A942333f6468176a870dB36eEf120a34DC': {
      [NAME]: 'Safe Haven',
      [SYMBOL]: 'SHA',
      [DECIMALS]: 18,
      [EXCHANGE_ADDRESS]: '0xC19cf5Dfb71374b920F786078D37b5225CFcF30E'
    },
    '0x89827F7bB951Fd8A56f8eF13C5bFEE38522F2E1F': {
      [NAME]: 'Plair',
      [SYMBOL]: 'PLA',
      [DECIMALS]: 18,
      [EXCHANGE_ADDRESS]: '0xD293f479254D5F6494c66A4982C7cA514A53D7C4'
    },
    '0xa94A33f776073423E163088a5078feac31373990': {
      [NAME]: 'TicTalk',
      [SYMBOL]: 'TIC',
      [DECIMALS]: 18,
      [EXCHANGE_ADDRESS]: '0x992cd19c2F33d5F5569F17fF047063B3b0ff1adA'
    },
    '0xf8e1faa0367298b55f57ed17f7a2ff3f5f1d1628': {
      [NAME]: 'Eight Hours Token',
      [SYMBOL]: 'EHrT',
      [DECIMALS]: 18,
      [EXCHANGE_ADDRESS]: '0x6D08D19Dff533050f93EaAa0a009e2771D3598bC'
    },
  },
  39: {
    '0x0000000000000000000000000000456e65726779': {
      [NAME]: 'VeThor',
      [SYMBOL]: 'VTHO',
      [DECIMALS]: 18,
      [EXCHANGE_ADDRESS]: '0x57BBD33078f562143e592353594738D3f9d22603'
    },
    '0x9c6e62B3334294D70c8e410941f52D482557955B': {
      [NAME]: 'Safe Haven',
      [SYMBOL]: 'SHA',
      [DECIMALS]: 18,
      [EXCHANGE_ADDRESS]: '0xA02C827058203A5278c8FeF60703eE152A7F2C72'
    }
  }
}

const TokensContext = createContext()

function useTokensContext() {
  return useContext(TokensContext)
}

function reducer(state, { type, payload }) {
  switch (type) {
    case UPDATE: {
      const { networkId, tokenAddress, name, symbol, decimals, exchangeAddress } = payload
      return {
        ...state,
        [networkId]: {
          ...(safeAccess(state, [networkId]) || {}),
          [tokenAddress]: {
            [NAME]: name,
            [SYMBOL]: symbol,
            [DECIMALS]: decimals,
            [EXCHANGE_ADDRESS]: exchangeAddress
          }
        }
      }
    }
    default: {
      throw Error(`Unexpected action type in TokensContext reducer: '${type}'.`)
    }
  }
}

export default function Provider({ children }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_TOKENS_CONTEXT)

  const update = useCallback((networkId, tokenAddress, name, symbol, decimals, exchangeAddress) => {
    dispatch({ type: UPDATE, payload: { networkId, tokenAddress, name, symbol, decimals, exchangeAddress } })
  }, [])

  return (
    <TokensContext.Provider value={useMemo(() => [state, { update }], [state, update])}>
      {children}
    </TokensContext.Provider>
  )
}

export function useTokenDetails(tokenAddress) {
  const { networkId, library } = useWeb3Context()

  const [state, { update }] = useTokensContext()
  const allTokensInNetwork = { ...VET, ...(safeAccess(state, [networkId]) || {}) }
  const { [NAME]: name, [SYMBOL]: symbol, [DECIMALS]: decimals, [EXCHANGE_ADDRESS]: exchangeAddress } =
    safeAccess(allTokensInNetwork, [tokenAddress]) || {}

  useEffect(() => {
    if (
      isAddress(tokenAddress) &&
      (name === undefined || symbol === undefined || decimals === undefined || exchangeAddress === undefined) &&
      (networkId || networkId === 0) &&
      library
    ) {
      let stale = false

      const namePromise = getTokenName(tokenAddress, library).catch(() => null)
      const symbolPromise = getTokenSymbol(tokenAddress, library).catch(() => null)
      const decimalsPromise = getTokenDecimals(tokenAddress, library).catch(() => null)
      const exchangeAddressPromise = getTokenExchangeAddressFromFactory(tokenAddress, networkId, library).catch(
        () => null
      )

      Promise.all([namePromise, symbolPromise, decimalsPromise, exchangeAddressPromise]).then(
        ([resolvedName, resolvedSymbol, resolvedDecimals, resolvedExchangeAddress]) => {
          if (!stale) {
            update(networkId, tokenAddress, resolvedName, resolvedSymbol, resolvedDecimals, resolvedExchangeAddress)
          }
        }
      )
      return () => {
        stale = true
      }
    }
  }, [tokenAddress, name, symbol, decimals, exchangeAddress, networkId, library, update])

  return { name, symbol, decimals, exchangeAddress }
}

export function useAllTokenDetails(requireExchange = true) {
  const { networkId } = useWeb3Context()

  const [state] = useTokensContext()
  const tokenDetails = { ...VET, ...(safeAccess(state, [networkId]) || {}) }

  return requireExchange
    ? Object.keys(tokenDetails)
        .filter(
          tokenAddress =>
            tokenAddress === 'VET' ||
            (safeAccess(tokenDetails, [tokenAddress, EXCHANGE_ADDRESS]) &&
              safeAccess(tokenDetails, [tokenAddress, EXCHANGE_ADDRESS]) !== ethers.constants.AddressZero)
        )
        .reduce((accumulator, tokenAddress) => {
          accumulator[tokenAddress] = tokenDetails[tokenAddress]
          return accumulator
        }, {})
    : tokenDetails
}
