import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classnames from 'classnames';
import { Button } from 'antd';
import CometLogo from '../../assets/images/comet.png';
import AkraneLogo from '../../assets/images/arkane.svg';
import Web3Status from '../Web3Status';

import "./header.scss";

const links = {
  comet: {
    chrome: 'https://www.cometpowered.com/',
  },
  sync: {
    chrome: 'https://github.com/vechain/thor-sync.electron/releases',
  },
};

function getSyncLinks() {
  return links.sync.chrome;
}

function getCometLinks() {
  return links.comet.chrome;
}

class BlockingWarning extends Component {
  constructor() {
    super();
  }

  render () {
    const {
      isConnected,
      initialized,
    } = this.props;

    let content = [];

    if (!window.connex && initialized) {
      content = [
        <div key="warning-title">No Vechain wallet found</div>,
        <div key="warning-desc" className="header__dialog__description">
          Please visit us after installing Comet or Sync
        </div>,
        <div key="warning-logos" className="header__download">
          {(
            [
              <img src={CometLogo} key="comet" onClick={() => window.open(getCometLinks(), '_blank')} />,
              <img src={AkraneLogo} key="sync" onClick={() => window.open(getSyncLinks(), '_blank')} />
            ]
          )}
        </div>,
      ];
    }

    return (
      <div
        className={classnames('header__dialog', {
          'header__dialog--disconnected': !isConnected && initialized,
        })}
      >
        {content}

      </div>
    );
  }
}

class Header extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    console.log(this.props)
    return (
      <div className="header">
        <BlockingWarning {...this.props} />
        <div
          className={classnames('header__top', {
            'header--inactive': !this.props.isConnected,
          })}
        >
          <div className="header__center-group">
            <span className="header__title">VEXCHANGE</span>
          </div>
          <Web3Status isConnected />
        </div>
      </div>
    );
  }
}

Header.propTypes = {
  provider: PropTypes.string,
  currentAddress: PropTypes.string,
  isConnected: PropTypes.bool.isRequired,
};

export default connect(
  state => ({
    currentAddress: state.web3connect.account,
    initialized: state.web3connect.initialized,
    isConnected: !!window.connex,
    connex: state.web3connect.connex,
    networkId: state.web3connect.networkId,
  }),
)(Header);
