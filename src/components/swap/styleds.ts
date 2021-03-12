import styled, { css } from 'styled-components'
import { AutoColumn } from '../Column'
import { Text } from 'rebass'

import NumericalInput from '../NumericalInput'

export const Wrapper = styled.div`
  position: relative;
`

export const ArrowWrapper = styled.div`
  padding: 2px;
  border-radius: 12px;
  display: flex;
  justify-content: center;
  align-items: center;

  :hover {
    cursor: pointer;
    opacity: 0.8;
  }
`

export const FixedBottom = styled.div`
  position: absolute;
  margin-top: 1.5rem;
  width: 100%;
  margin-bottom: 40px;
`

export const AdvancedDropwdown = styled.div`
  position: absolute;
  max-width: 526px;
  width: 100%;
  margin-bottom: 100px;
  padding: 10px 0;
  padding-top: 24px;
  border-bottom-left-radius: 20px;
  border-bottom-right-radius: 20px;
  color: ${({ theme }) => theme.text2};
  // background-color: ${({ theme }) => theme.advancedBG};
  color: ${({ theme }) => theme.text2};
  z-index: -1;
`

export const SectionBreak = styled.div`
  height: 1px;
  width: 100%;
  background-color: ${({ theme }) => theme.bg3};
`

export const BottomGrouping = styled.div<{ isDark?: boolean }>`
  border-radius: 0 0 26px 26px;
  position: relative;
  padding: 2.4rem 4rem;

  ${({ isDark }) =>
    isDark
      ? css`
          background-image: linear-gradient(
            137deg,
            rgba(217, 41, 33, 0.1) 0%,
            rgba(255, 255, 255, 0.1) 50%,
            rgba(231, 150, 49, 0.1) 100%
          );
        `
      : css`
          background-color: rgba(100, 112, 142, 0.10);
        `}
`

export const ErrorText = styled(Text)<{ severity?: 0 | 1 | 2 | 3 }>`
  color: ${({ theme, severity }) =>
    severity === 3 ? theme.red1 : severity === 2 ? theme.yellow2 : severity === 1 ? theme.green1 : theme.text1};
`

export const InputGroup = styled(AutoColumn)`
  position: relative;
  padding: 40px 0 20px 0;
`

export const StyledNumerical = styled(NumericalInput)`
  text-align: center;
  font-size: 48px;
  font-weight: 500px;
  width: 100%;

  ::placeholder {
    color: ${({ theme }) => theme.text4};
  }
`
export const StyledBalanceMaxMini = styled.button<{ active?: boolean }>`
  height: 22px;
  width: 22px;
  background-color: transparent;
  border: none;
  border-radius: 50%;
  padding: 0.2rem;
  font-size: 0.875rem;
  font-weight: 400;
  margin-left: 0.4rem;
  cursor: pointer;
  color: ${({ theme }) => theme.text2};
  display: flex;
  justify-content: center;
  align-items: center;
  float: right;

  :hover {
    // background-color: ${({ theme }) => theme.bg3};
    border: 1px solid #e79631;
  }
  :focus {
    background-color: ${({ theme }) => theme.bg3};
    outline: none;
  }
`

export const TruncatedText = styled(Text)`
  text-overflow: ellipsis;
  width: 220px;
  overflow: hidden;
`

// styles
export const Dots = styled.span`
  &::after {
    display: inline-block;
    animation: ellipsis 1.25s infinite;
    content: '.';
    width: 1em;
    text-align: left;
  }
  @keyframes ellipsis {
    0% {
      content: '.';
    }
    33% {
      content: '..';
    }
    66% {
      content: '...';
    }
  }
`
