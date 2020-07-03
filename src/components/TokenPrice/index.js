import React, { useEffect, useState } from 'react'
import { useMedia } from 'react-use'
import { request, formattedNum, formattedPercent } from '../../utils'

import { DataText } from '../TokenList'

export default function TokenPrice({ token, change }) {
  const below1080 = useMedia('(max-width: 1080px)')
  const below680 = useMedia('(max-width: 680px)')

  const [price, setPrice] = useState(0)
  const [percentage, setPercentage] = useState(0)

  useEffect(() => {
    function getPrices() {
      request
        .get(`current/${token.address}`)
        .then(({ data }) => {
          setPrice(data.buy.token)
          return data.buy.token
        })
        .then(currentPrice => {
          if (change) {
            request.get(`previous/${token.address}`).then(({ data }) => {
              let previousPrice = data.buy.token
              let percentage = 0

              if (currentPrice > previousPrice) {
                percentage = ((currentPrice - previousPrice) / previousPrice) * 100
                setPercentage(percentage)
              } else {
                percentage = ((currentPrice - previousPrice) / currentPrice) * 100
                setPercentage(percentage)
              }
            })
          }
        })
        .catch(error => {
          console.log(error)
        })
    }

    getPrices()
  })

  return (
    <>
      {change ? (
        <DataText area="change">{formattedPercent(percentage)}</DataText>
      ) : (
        <>
          {!below1080 && (
            <DataText area="price" color="text" fontWeight="500">
              {formattedNum(price) || 0} VET
            </DataText>
          )}
        </>
      )}
    </>
  )
}
