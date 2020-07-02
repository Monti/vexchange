import React, { useEffect } from 'react'
import ReactGA from 'react-ga'

import TokenList from '../../components/TokenList'

export default function Home({ params }) {
  useEffect(() => {
    ReactGA.pageview(window.location.pathname + window.location.search)
  }, [])

  return <TokenList />
}
