import { BigNumber } from '@ethersproject/bignumber'
import { VVET, TokenAmount, JSBI } from 'vexchange-sdk'
import { useMemo } from 'react'
import { find } from 'lodash'
import { useTransactionAdder } from '../state/transactions/hooks'
import ERC20_ABI from '../constants/abis/erc20.json'
import { useTokenBalanceTreatingWETHasETH } from '../state/wallet/hooks'

import { isAddress } from '../utils'
import { useWeb3React } from './index'

// returns a callback for sending a token amount, treating VVET as VET
// returns null with invalid arguments
export function useSendCallback(amount?: TokenAmount, recipient?: string): null | (() => Promise<string>) {
  const { library, account, chainId } = useWeb3React()
  const addTransaction = useTransactionAdder()
  const balance = useTokenBalanceTreatingWETHasETH(account, amount?.token)

  return useMemo(() => {
    if (!amount) return null
    if (!amount.greaterThan(JSBI.BigInt(0))) return null
    if (!isAddress(recipient)) return null
    if (!balance) return null
    if (balance.lessThan(amount)) return null

    const token = amount?.token

    return async function onSend(): Promise<string> {
      if (token.equals(VVET[chainId])) {
        return library.vendor
          .sign('tx', [
            {
              to: recipient,
              value: BigNumber.from(amount.raw.toString()).toString()
            }
          ])
          .comment('work')
          .request()
          .then(response => {
            addTransaction(response, {
              summary: 'Send ' + amount.toSignificant(3) + ' ' + token?.symbol + ' to ' + recipient
            })
            return response.hash
          })
          .catch(error => {
            console.error('Failed to transfer VET', error)
            throw error
          })
      } else {
        const abi = find(ERC20_ABI, { name: 'transfer' })
        const method = library.thor.account(amount?.token?.address).method(abi)

        const clause = method.asClause(recipient, amount.raw.toString())

        return library.vendor
          .sign('tx', [{ ...clause }])
          .comment('work')
          .request()
          .then(response => {
            addTransaction(response, {
              summary: 'Send ' + amount.toSignificant(3) + ' ' + token.symbol + ' to ' + recipient
            })

            return response.txid
          })
          .catch(error => {
            console.error('Failed token transfer', error)
            throw error
          })
      }
    }
  }, [addTransaction, library, chainId, amount, recipient, balance])
}
