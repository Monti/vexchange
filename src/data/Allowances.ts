import { useEffect, useState } from 'react'
import { Token, TokenAmount } from '@uniswap/sdk'
import { find } from 'lodash'

import ERC20_ABI from '../constants/abis/erc20.json'
import { useWeb3React } from '../hooks'

export function useTokenAllowance(token?: Token, owner?: string, spender?: string): TokenAmount {
  const [amount, setAmount] = useState<TokenAmount>()
  const { library } = useWeb3React()
  const abi = find(ERC20_ABI, { name: 'allowance' })

  useEffect(() => {
    const getTokenAllowance = async () => {
      const method = library.thor.account(token.address).method(abi)

      try {
        const {
          decoded: { 0: balance }
        } = await method.call(owner, spender)
        const tokenAmount = new TokenAmount(token, balance.toString())
        setAmount(tokenAmount)
      } catch (error) {
        console.log(error)
      }
    }

    if (token?.address && owner) {
      getTokenAllowance()
    }
  }, [token, library.thor, owner, abi, spender])

  return amount
}
