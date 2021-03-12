import { BalanceMap } from '@mycrypto/eth-scan'
import { BigNumber } from '@ethersproject/bignumber'
import { useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useWeb3React } from '../../hooks'
import { useBlockNumber } from '../application/hooks'
import { AppDispatch, AppState } from '../index'
import { updateEtherBalances, updateTokenBalances } from './actions'
import { balanceKey } from './reducer'
import { find } from 'lodash'
import ERC20_ABI from '../../constants/abis/erc20.json'

function convertBalanceMapValuesToString(balanceMap: BalanceMap): { [key: string]: string } {
  return balanceMap && Object.keys(balanceMap).reduce<{ [key: string]: string }>((map, key) => {
    // map[key] = balanceMap[key].toString()
    map[key] = BigNumber.from(balanceMap[key]).toString()
    return map
  }, {})
}

export default function Updater() {
  const { chainId, library } = useWeb3React()
  const lastBlockNumber = useBlockNumber()
  const dispatch = useDispatch<AppDispatch>()
  const ethBalanceListeners = useSelector<AppState>(state => {
    return state.wallet.balanceListeners
  })
  const tokenBalanceListeners = useSelector<AppState>(state => {
    return state.wallet.tokenBalanceListeners
  })
  const allBalances = useSelector<AppState>(state => state.wallet.balances)

  const activeETHListeners: string[] = useMemo(() => {
    return Object.keys(ethBalanceListeners).filter(address => ethBalanceListeners[address] > 0) // redundant check
  }, [ethBalanceListeners])

  const activeTokenBalanceListeners: { [address: string]: string[] } = useMemo(() => {
    return Object.keys(tokenBalanceListeners).reduce<{ [address: string]: string[] }>((map, address) => {
      const tokenAddresses = Object.keys(tokenBalanceListeners[address]).filter(
        tokenAddress => tokenBalanceListeners[address][tokenAddress] > 0 // redundant check
      )
      map[address] = tokenAddresses
      return map
    }, {})
  }, [tokenBalanceListeners])

  const ethBalancesNeedUpdate: string[] = useMemo(() => {
    return activeETHListeners.filter(address => {
      const data = allBalances[balanceKey({ chainId, address })]
      return !data || data.blockNumber < lastBlockNumber
    })
  }, [activeETHListeners, allBalances, chainId, lastBlockNumber])

  const tokenBalancesNeedUpdate: { [address: string]: string[] } = useMemo(() => {
    return Object.keys(activeTokenBalanceListeners).reduce<{ [address: string]: string[] }>((map, address) => {
      const needsUpdate =
        activeTokenBalanceListeners[address]?.filter(tokenAddress => {
          const data = allBalances[balanceKey({ chainId, tokenAddress, address })]
          return !data || data.blockNumber < lastBlockNumber
        }) ?? []
      if (needsUpdate.length > 0) {
        map[address] = needsUpdate
      }
      return map
    }, {})
  }, [activeTokenBalanceListeners, allBalances, chainId, lastBlockNumber])

  const getVETBalance = (accounts, library) => {
    return new Promise((resolve, reject) => {
      const detail = accounts.reduce(async(_, cur) => {
        const { balance } = await library.thor.account(cur).get()

        return {
          [cur]: balance
        }
      }, {})

      resolve(detail)
    })
  }

  useEffect(() => {
    if (!library) return
    if (ethBalancesNeedUpdate.length === 0) return

    getVETBalance(ethBalancesNeedUpdate, library).then(balanceMap => {
      dispatch(
        updateEtherBalances({
          blockNumber: lastBlockNumber,
          chainId,
          //@ts-ignore
          etherBalances: convertBalanceMapValuesToString(balanceMap)
        })
      )
    })
  }, [library, ethBalancesNeedUpdate, dispatch, lastBlockNumber, chainId])

  const getTokenBalance = (tokenAddress, address, library) => {
    const abi = find(ERC20_ABI, { name: 'balanceOf'})

    return new Promise(async(resolve, reject) => {
      const detail = tokenAddress.reduce(async(acc, cur) => {
        const account = library.thor.account(cur) 

        const method = account.method(abi)
        try {
          let { decoded: { balance } } = await method.call(address)

          return {
            [cur]: balance
          }
        } catch(error) {
          reject(error)
        }

      }, {})

      resolve(detail)
    });
  }
  useEffect(() => {
    if (!library) return
    Object.keys(tokenBalancesNeedUpdate).forEach(address => {
      if (tokenBalancesNeedUpdate[address].length === 0) return
      getTokenBalance(tokenBalancesNeedUpdate[address], address, library)
        .then(tokenBalanceMap => {
          if (tokenBalanceMap) {
            dispatch(
              updateTokenBalances({
                address,
                chainId,
                blockNumber: lastBlockNumber,
                //@ts-ignore
                tokenBalances: convertBalanceMapValuesToString(tokenBalanceMap)
              })
            )
          }
        })
        .catch(error => {
          console.error(`failed to get token balances`, address, tokenBalancesNeedUpdate[address], error)
        })
    })
  }, [library, tokenBalancesNeedUpdate, dispatch, lastBlockNumber, chainId])

  return null
}
