import { useEffect, useState } from 'react'
import { Token, TokenAmount, Pair, FACTORY_ADDRESS } from '@uniswap/sdk'
import { find } from 'lodash'
// import { abi as IUniswapV2PairABI } from '@uniswap/v2-core/build/IUniswapV2Pair.json'
import { abi as IUniswapV2PairABI } from '../constants/abis/IUniswapV2Pair.json'
import { abi as IUniswapV2FactoryABI } from '../constants/abis/IUniswapV2Factory.json'

import { useWeb3React } from '../hooks'

const getPair = (library, tokenA, tokenB): Promise<undefined | Pair> => {
  return new Promise(async (resolve, reject) => {
    const getPairABI = find(IUniswapV2FactoryABI, { name: 'getPair' })
    const getPairMethod = library.thor.account(FACTORY_ADDRESS).method(getPairABI)

    const {
      decoded: { pair }
    } = await getPairMethod.call(tokenA.address, tokenB.address)

    if (pair === '0x0000000000000000000000000000000000000000') {
      reject()
    }

    const getReservesABI = find(IUniswapV2PairABI, { name: 'getReserves' })
    const getReservesMethod = library.thor.account(pair).method(getReservesABI)

    try {
      const {
        decoded: { reserve0, reserve1 }
      } = await getReservesMethod.call()

      const [token0, token1] = tokenA.sortsBefore(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA]

      resolve(new Pair(new TokenAmount(token0, reserve0.toString()), new TokenAmount(token1, reserve1.toString())))
    } catch (error) {
      return undefined
    }
  })
}

/*
 * if loading, return undefined
 * if no pair created yet, return null
 * if pair already created (even if 0 reserves), return pair
 */
export function usePair(tokenA?: Token, tokenB?: Token): undefined | Pair | null {
  const { library } = useWeb3React()
  const [pair, setPair] = useState<Pair>()

  useEffect(() => {
    if (!!tokenA && !!tokenB && !tokenA.equals(tokenB)) {
      getPair(library, tokenA, tokenB)
        .then(data => {
          setPair(data)
        })
        .catch(() => {
          setPair(null)
        })
    }
  }, [tokenA, tokenB, library])

  return pair
}
