import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useWeb3React } from '../../hooks'
import { useAddPopup, useBlockNumber } from '../application/hooks'
import { AppDispatch, AppState } from '../index'
import { checkTransaction, finalizeTransaction } from './actions'

export default function Updater() {
  const { chainId, library } = useWeb3React()

  const lastBlockNumber = useBlockNumber()

  const dispatch = useDispatch<AppDispatch>()
  const transactions = useSelector<AppState>(state => state.transactions)

  const allTransactions = transactions[chainId] ?? {}

  // show popup on confirm
  const addPopup = useAddPopup()

  useEffect(() => {
    if (typeof chainId === 'number' && library) {
      Object.keys(allTransactions)
        .filter(hash => !allTransactions[hash].receipt)
        .filter(
          hash =>
            !allTransactions[hash].blockNumberChecked || allTransactions[hash].blockNumberChecked < lastBlockNumber
        )
        .forEach(hash => {
          library.thor.transaction(hash).get().then(tx => {
            library.thor.transaction(hash).getReceipt().then(receipt => {
              if (!receipt) {
                dispatch(checkTransaction({ chainId, hash, blockNumber: lastBlockNumber }))
              } else {
                dispatch(
                  finalizeTransaction({
                    chainId,
                    hash,
                    receipt: {
                      blockHash: receipt.meta.blockID,
                      blockNumber: receipt.meta.blockNumber,
                      from: tx.origin,
                      status: !receipt.reverted,
                      to: receipt.to,
                      transactionHash: tx.id,
                    }
                  })
                )

                if (!receipt.reverted) {
                  addPopup({
                    txn: {
                      hash,
                      success: true,
                      summary: allTransactions[hash]?.summary
                    }
                  })
                } else {
                  addPopup({
                    txn: { hash, success: false, summary: allTransactions[hash]?.summary }
                  })
                }
              }
            })
            .catch(error => {
              console.error(`failed to check transaction receipt: ${hash}`, error)
            })
          })
          .catch(error => {
            console.error(`failed to check transaction hash: ${hash}`, error)
          })
        })
    }
  }, [chainId, library, allTransactions, lastBlockNumber, dispatch, addPopup])

  return null
}
