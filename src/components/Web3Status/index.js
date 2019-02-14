import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classnames from 'classnames';
import { isHexStrict, toChecksumAddress } from 'web3-utils';
import { Button } from 'antd';
import { startWatching } from '../../ducks/web3connect';
import { CSSTransitionGroup } from "react-transition-group";
import { withNamespaces } from 'react-i18next';
import { picasso } from '@vechain/picasso'
import './web3-status.scss';

import Modal from '../Modal';

function getVeforgeLink(tx) {
  return `https://explore.veforge.com/transactions/${tx}`;
}

class Web3Status extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isShowingModal: false,
    };
  }

  componentDidMount() {
  }

  handleClick = () => {
    if (this.props.pending.length && !this.state.isShowingModal) {
      this.setState({isShowingModal: true});
    }
  };

  renderPendingTransactions() {
    return this.props.pending.map((transaction) => {
      return (
        <>
          <div
            key={transaction}
            className={classnames('pending-modal__transaction-row')}
            onClick={() => window.open(getVeforgeLink(transaction), '_blank')}
          >
            <div className="pending-modal__transaction-label">
              {transaction}
            </div>
            <div className="pending-modal__pending-indicator">
              <div className="loader" /> {this.props.t("pending")}
            </div>
          </div>
        </>
      );
    });
  }

  renderModal() {
    if (!this.state.isShowingModal) {
      return null;
    }

    return (
      <Modal onClose={() => this.setState({ isShowingModal: false })}>
        <CSSTransitionGroup
          transitionName="token-modal"
          transitionAppear={true}
          transitionLeave={true}
          transitionAppearTimeout={200}
          transitionLeaveTimeout={200}
          transitionEnterTimeout={200}
        >
          <div className="pending-modal">
            <div className="pending-modal__transaction-list">
              <div className="pending-modal__header">Transactions</div>
              {this.renderPendingTransactions()}
            </div>
          </div>
        </CSSTransitionGroup>
      </Modal>
    );
  }

  render() {
    const { t, address, pending, confirmed } = this.props;
    const hasPendingTransactions = !!pending.length;
    const hasConfirmedTransactions = !!confirmed.length;

    const svg = picasso(address);

    return (
      <Button type={ hasPendingTransactions ? 'primary' : ''}>
        <div className={classnames("web3-status", {
          'web3-status__connected': this.props.isConnected,
          'web3-status--confirmed': hasConfirmedTransactions,
        })}
        onClick={this.handleClick}
        >
          <div className="web3-status__text">
            { hasPendingTransactions ?
                getPendingText(pending, t("pending")) : 
                getText(address, t("disconnected")) 
            }
          </div>
          <div
            className="web3-status__identicon"
            style={{ background: `no-repeat url('data:image/svg+xml;utf8,${svg}')` }}
          />
          {this.renderModal()}
        </div>

      </Button>
    );
  }
}

function getPendingText(pendingTransactions, pendingLabel) {
  return (
    <div className="web3-status__pending-container">
      <div className="loader" />
      <span key="text">{pendingTransactions.length} {pendingLabel}</span>
    </div>
  );
}

function getText(text, disconnectedText) {
  if (!text || text.length < 42 || !isHexStrict(text)) {
    return disconnectedText;
  }

  const address = toChecksumAddress(text);
  return `${address.substring(0, 6)}...${address.substring(38)}`;
}

Web3Status.propTypes = {
  isConnected: PropTypes.bool,
  address: PropTypes.string,
};

Web3Status.defaultProps = {
  isConnected: false,
  address: 'Disconnected',
};

export default connect(
  state => ({
    address: state.web3connect.account,
    isConnected: !!window.connex,
    // isConnected: !!(state.web3connect.web3 && state.web3connect.account),
    pending: state.web3connect.transactions.pending,
    confirmed: state.web3connect.transactions.confirmed,
    provider: state.web3connect.provider
  }),
  dispatch => ({
    startWatching: () => dispatch(startWatching()),
  }),
)(withNamespaces()(Web3Status));
