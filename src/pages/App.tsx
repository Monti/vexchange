import React, { Suspense, useEffect } from 'react'
import styled, { css } from 'styled-components'
import ReactGA from 'react-ga'
import { BrowserRouter, Redirect, Route, RouteComponentProps, Switch } from 'react-router-dom'

import Header from '../components/Header'
import Footer from '../components/Footer'
import NavigationTabs from '../components/NavigationTabs'
import Web3ReactManager from '../components/Web3ReactManager'
import { useDarkModeManager } from '../state/user/hooks'

import Popups from '../components/Popups'
import { isAddress } from '../utils'

import Swap from './Swap'
import Send from './Send'
import Pool from './Pool'
import Add from './Pool/AddLiquidity'
import Remove from './Pool/RemoveLiquidity'
import Find from '../components/PoolFinder'
import Create from '../components/CreatePool'

const AppWrapper = styled.div`
  display: flex;
  flex-flow: column;
  align-items: flex-start;
  overflow-x: hidden;
  height: 100vh;
`

const HeaderWrapper = styled.div`
  ${({ theme }) => theme.flexRowNoWrap}
  width: 100%;
  justify-content: space-between;
`

const BodyWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  box-sizing: border-box;
  padding-top: 160px;
  align-items: center;
  flex: 1;
  overflow: auto;
  z-index: 10;
  transition: height 0.3s ease;

  & > * {
    max-width: calc(420px + 4rem);
    width: 90%;
  }

  ${({ theme }) => theme.mediaWidth.upToExtraSmall`
      padding: 16px;
  `};

  z-index: 1;
`

const Body = styled.div<{ isDark?: boolean }>`
  border-radius: 30px;
  box-sizing: border-box;
  margin-bottom: 10rem;
  max-width: 534px;
  padding: 4px;
  position: relative;
  width: 100%;
  z-index: 0;

  &:before {
    content: '';
    position: absolute;
    z-index: -1;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 4px;
    border-radius: 30px;
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: destination-out;
    mask-composite: exclude;
  }

  ${({ isDark }) =>
    isDark
      ? css`
          background-image: linear-gradient(
            210deg,
            rgba(189, 162, 47, 0.02) 0%,
            rgba(255, 255, 255, 0.02) 13%,
            rgba(217, 216, 216, 0.15) 38%,
            rgba(226, 225, 225, 0.08) 61%,
            rgba(51, 41, 41, 0) 77%,
            #893726 100%
          );

          box-shadow: 0px 0px 1px rgba(0, 0, 0, 0.01), 0px 4px 8px rgba(0, 0, 0, 0.04),
            0px 16px 24px rgba(0, 0, 0, 0.04), 0px 24px 32px rgba(0, 0, 0, 0.01);
          box-shadow: 0 14px 22px 0 #001926;

          &:before {
            background: linear-gradient(to right, rgba(255, 255, 255, 0.1), rgba(18, 39, 68, 0.4));
          }
        `
      : css`
          background-image: linear-gradient(
            210deg,
            rgba(189, 162, 47, 0.02) 0%,
            rgba(255, 255, 255, 0.02) 13%,
            rgba(217, 216, 216, 0.15) 38%,
            rgba(226, 225, 225, 0.08) 61%,
            rgba(51, 41, 41, 0) 77%,
            rgba(117, 31, 13, 0.07) 100%
          );

          box-shadow: 0 14px 22px 0 rgba(221, 77, 43, 0.22);

          &:before {
            background: rgba(255, 255, 255, 0.25);
          }
        `}
`

const StyledRed = styled.div`
  width: 100%;
  height: 200vh;
  background: ${({ theme }) => `radial-gradient(50% 50% at 50% 50%, ${theme.primary1} 0%, ${theme.bg1} 100%)`};
  position: absolute;
  top: 0px;
  left: 0px;
  opacity: 0.1;
  z-index: -1;

  transform: translateY(-70vh);

  @media (max-width: 960px) {
    height: 300px;
    width: 100%;
    transform: translateY(-150px);
  }
`

// fires a GA pageview every time the route changes
function GoogleAnalyticsReporter({ location: { pathname, search } }: RouteComponentProps) {
  useEffect(() => {
    ReactGA.pageview(`${pathname}${search}`)
  }, [pathname, search])
  return null
}

export default function App() {
  const [isDark] = useDarkModeManager()

  return (
    <>
      <Suspense fallback={null}>
        <BrowserRouter>
          <Route component={GoogleAnalyticsReporter} />
          <AppWrapper>
            <HeaderWrapper>
              <Header />
            </HeaderWrapper>
            <BodyWrapper>
              <Popups />
              <Web3ReactManager>
                <Body isDark={isDark}>
                  <NavigationTabs />
                  <Switch>
                    <Route exact strict path="/swap" component={Swap} />
                    <Route exact strict path="/send" component={Send} />
                    <Route exact strict path="/find" component={Find} />
                    <Route exact strict path="/create" component={Create} />
                    <Route exact strict path="/pool" component={Pool} />
                    <Route
                      exact
                      strict
                      path={'/add/:tokens'}
                      component={({ match }) => {
                        const tokens = match.params.tokens.split('-')
                        const t0 =
                          tokens?.[0] === 'VET' ? 'VET' : isAddress(tokens?.[0]) ? isAddress(tokens[0]) : undefined
                        const t1 =
                          tokens?.[1] === 'VET' ? 'VET' : isAddress(tokens?.[1]) ? isAddress(tokens[1]) : undefined
                        if (t0 && t1) {
                          return <Add token0={t0} token1={t1} />
                        } else {
                          return <Redirect to="/pool" />
                        }
                      }}
                    />
                    <Route
                      exact
                      strict
                      path={'/remove/:tokens'}
                      component={({ match }) => {
                        const tokens = match.params.tokens.split('-')
                        const t0 =
                          tokens?.[0] === 'VET' ? 'VET' : isAddress(tokens?.[0]) ? isAddress(tokens[0]) : undefined
                        const t1 =
                          tokens?.[1] === 'VET' ? 'VET' : isAddress(tokens?.[1]) ? isAddress(tokens[1]) : undefined
                        if (t0 && t1) {
                          return <Remove token0={t0} token1={t1} />
                        } else {
                          return <Redirect to="/pool" />
                        }
                      }}
                    />
                    <Redirect to="/swap" />
                  </Switch>
                </Body>
              </Web3ReactManager>
              <Footer />
            </BodyWrapper>
            <StyledRed />
          </AppWrapper>
        </BrowserRouter>
        <div id="popover-container" />
      </Suspense>
    </>
  )
}
