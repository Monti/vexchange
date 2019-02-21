import React, { Component } from 'react';
import MediaQuery from 'react-responsive';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classnames from 'classnames';
import CometLogo from '../../assets/images/comet.png';
import SyncLogo from '../../assets/images/sync.svg';
import Status from '../Status';

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
      connex,
      isConnected,
      initialized,
    } = this.props;

    let content = [];

    if (!connex && initialized) {
      content = [
        <div key="warning-title">No Vechain wallet found</div>,
        <div key="warning-desc" className="header__dialog__description">
          Please visit us after installing Comet or Sync.
        </div>,
        <div key="warning-logos" className="header__download">
          <img src={CometLogo} key="comet" onClick={() => window.open(getCometLinks(), '_blank')} />
          <img src={SyncLogo} key="sync" onClick={() => window.open(getSyncLinks(), '_blank')} />
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
    return (
      <div className="header">
        <BlockingWarning {...this.props} />
        <div
          className={classnames('header__top', {
            'header--inactive': !this.props.isConnected,
          })}
        >
          <div className="header__center-group">
            <span className={classnames('header__title', {
              'header--mainnet': this.props.networkId === 74,
              'header--testnet': this.props.networkId === 39,
            })}>VEXCHANGE</span>
          </div>
          <Status isConnected />
        </div>
      </div>
    );
  }
}

Header.propTypes = {
  currentAddress: PropTypes.string,
  isConnected: PropTypes.bool.isRequired,
};

export default connect(
  state => ({
    currentAddress: state.connexConnect.account,
    initialized: state.connexConnect.initialized,
    isConnected: !!state.connexConnect.account,
    connex: state.connexConnect.connex,
    networkId: state.connexConnect.networkId,
  }),
)(Header);
