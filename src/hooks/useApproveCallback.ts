import { MaxUint256 } from '@ethersproject/constants'
import { Trade, VVET, TokenAmount } from 'vexchange-sdk'
import { find } from 'lodash'
import { useCallback, useMemo } from 'react'
import { ROUTER_ADDRESS } from '../constants'
import { useTokenAllowance } from '../data/Allowances'
import { Field } from '../state/swap/actions'
import { useTransactionAdder, useHasPendingApproval } from '../state/transactions/hooks'
import { computeSlippageAdjustedAmounts } from '../utils/prices'
import { useWeb3React } from './index'
import ERC20_ABI from '../constants/abis/erc20.json'

export enum Approval {
  UNKNOWN,
  NOT_APPROVED,
  PENDING,
  APPROVED
}

// returns a function to approve the amount required to execute a trade if necessary, otherwise null
export function useApproveCallback(
  amountToApprove?: TokenAmount,
  addressToApprove?: string
): [Approval, () => Promise<void>] {
  const { account, library } = useWeb3React()

  const currentAllowance = useTokenAllowance(amountToApprove?.token, account, addressToApprove)
  const pendingApproval = useHasPendingApproval(amountToApprove?.token?.address)

  // check the current approval status
  const approval = useMemo(() => {
    // we treat VVET as VET which requires no approvals
    if (amountToApprove?.token?.equals(VVET[amountToApprove?.token?.chainId])) return Approval.APPROVED
    // we might not have enough data to know whether or not we need to approve
    if (!currentAllowance || !amountToApprove) return Approval.UNKNOWN
    if (pendingApproval) return Approval.PENDING
    // amountToApprove will be defined if currentAllowance is
    return currentAllowance.lessThan(amountToApprove) ? Approval.NOT_APPROVED : Approval.APPROVED
  }, [amountToApprove, currentAllowance, pendingApproval])

  const addTransaction = useTransactionAdder()

  const approve = useCallback(async (): Promise<void> => {
    if (approval !== Approval.NOT_APPROVED) {
      console.error('approve was called unnecessarily, this is likely an error.')
      return
    }

    const abi = find(ERC20_ABI, { name: 'approve' })
    const method = library.thor.account(amountToApprove?.token?.address).method(abi)

    const clause = method.asClause(addressToApprove, MaxUint256)

    return library.vendor
      .sign('tx', [{ ...clause }])
      .comment('approve')
      .request()
      .then(response => {
        addTransaction(response, {
          summary: 'Approve ' + amountToApprove?.token?.symbol,
          approvalOfToken: amountToApprove?.token?.address
        })
      })
      .catch(error => {
        console.debug('Failed to approve token', error)
        throw error
      })
  }, [addTransaction, addressToApprove, amountToApprove, approval, library.thor, library.vendor])

  return [approval, approve]
}

// wraps useApproveCallback in the context of a swap
export function useApproveCallbackFromTrade(trade?: Trade, allowedSlippage = 0) {
  const amountToApprove = useMemo(() => computeSlippageAdjustedAmounts(trade, allowedSlippage)[Field.INPUT], [
    trade,
    allowedSlippage
  ])
  return useApproveCallback(amountToApprove, ROUTER_ADDRESS)
}
