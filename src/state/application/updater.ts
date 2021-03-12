import { useEffect, useState } from 'react'
import { useWeb3React } from '../../hooks'
import { updateBlockNumber } from './actions'
import { useDispatch } from 'react-redux'

export default function Updater() {
  const [ticker, setTicker] = useState()
  const { library, chainId } = useWeb3React()
  const dispatch = useDispatch()

  // update block number
  useEffect(() => {
    if (library) {
      const stale = false

      const update = async () => {
        try {
          const { number: blockNumber } = await library.thor.ticker().next()

          if (!stale) {
            setTicker(blockNumber)
            dispatch(updateBlockNumber({ networkId: chainId, blockNumber }))
          }
        } catch(error) {
          if (!stale) {
            dispatch(updateBlockNumber({ networkId: chainId, blockNumber: null }))
          }
        }
      }

      update()
    }
  }, [dispatch, chainId, library, ticker])

  return null
}
