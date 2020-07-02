import { Box as RebassBox } from 'rebass';
import styled, { css } from 'styled-components';

const panelPseudo = css`
  :after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    height: 10px;
  }

  @media only screen and (min-width: 40em) {
    :after {
      content: unset;
    }
  }
`;

const Panel = styled(RebassBox)`
  position: relative;
  padding: 1.25rem;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  border-radius: 3px;
  border: 1px solid transparent;
  :hover {
      cursor: ${({ hover }) => hover && 'pointer'};
      border: ${({ hover, theme }) => hover && '1px solid' + theme.bg5};
    }
  ${props => props.background && `background-color: ${props.theme.advancedBG};`}
  ${props => (props.area ? `grid-area: ${props.area};` : null)}
  ${props =>
    props.grouped &&
    css`
      @media only screen and (min-width: 40em) {
        &:first-of-type {
          border-radius: 20px 20px 0 0;
        }
        &:last-of-type {
          border-radius: 0 0 20px 20px;
        }
      }
    `}
  ${props =>
    props.rounded &&
    css`
      border-radius: 24px;
      @media only screen and (min-width: 40em) {
        border-radius: 10px;
      }
    `};
  ${props => !props.last && panelPseudo}
`;

export default Panel;
