import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router-dom';
import { withNamespaces } from 'react-i18next';
import _ from 'lodash';
import { isAddress } from 'web3-utils';

import {selectors, addPendingTx} from "../../ducks/connexConnect";
import classnames from "classnames";
import NavigationTabs from "../../components/NavigationTabs";
import ModeSelector from "./ModeSelector";
import AddressInputPanel from "../../components/AddressInputPanel";
import OversizedPanel from "../../components/OversizedPanel";
import FACTORY_ABI from "../../abi/factory";
import {addExchange} from "../../ducks/addresses";

class CreateExchange extends Component {
  static propTypes = {
    web3: PropTypes.object,
    selectors: PropTypes.func.isRequired,
    addExchange: PropTypes.func.isRequired,
    account: PropTypes.string,
    isConnected: PropTypes.bool.isRequired,
    factoryAddress: PropTypes.string.isRequired,
    exchangeAddresses: PropTypes.shape({
      fromToken: PropTypes.object.isRequired,
    }).isRequired,
  };

  constructor(props) {
    super(props);
    const { match: { params: { tokenAddress } } } = this.props;

    this.state = {
      tokenAddress,
      label: '',
      decimals: 0,
    };
  }

  validate() {
    const { tokenAddress } = this.state;
    const {
      t,
      connex,
      account,
      selectors,
      factoryAddress,
      exchangeAddresses: { fromToken },
      addExchange,
    } = this.props;

    let isValid = true;
    let errorMessage = '';

    if (!tokenAddress) {
      return {
        isValid: false,
      };
    }

    if (!isAddress(tokenAddress)) {
      return {
        isValid: false,
        errorMessage: t("invalidTokenAddress"),
      };
    }

    const { label, decimals } = selectors().getBalance(account, tokenAddress);
    const getExchangeABI = _.find(FACTORY_ABI, { name: 'getExchange' });
    const getExchange = connex.thor.account(factoryAddress).method(getExchangeABI);
    const exchangeAddress = fromToken[tokenAddress];
    
    if (!exchangeAddress) {
      getExchange.call(tokenAddress).then(data => {
        if (data !== '0x0000000000000000000000000000000000000000') {
          addExchange({ label, tokenAddress, exchangeAddress: data });
        }
      }).catch(err => {
        console.log(err);
      })
    } else {
      errorMessage = t("exchangeExists", { label });
    }

    if (!label) {
      errorMessage = t("invalidSymbol");
    }

    if (!decimals) {
      errorMessage = t("invalidDecimals");
    }

    return {
      isValid: isValid && !errorMessage,
      errorMessage,
    };
  }

  onChange = tokenAddress => {
    const { selectors, account } = this.props;
    if (isAddress(tokenAddress)) {
      const { label, decimals } = selectors().getBalance(account, tokenAddress);
      this.setState({
        label,
        decimals,
        tokenAddress,
      });
    } else {
      this.setState({
        label: '',
        decimals: 0,
        tokenAddress,
      });
    }
  };

  onCreateExchange = async () => {
    const { tokenAddress } = this.state;
    const { connex, factoryAddress } = this.props;
    const signingService = connex.vendor.sign('tx')

    if (isAddress(tokenAddress)) {
      return;
    }

    const createExchangeABI = _.find(FACTORY_ABI, { name: 'createExchange' });
    const createExchange = connex.thor.account(factoryAddress).method(createExchangeABI);

    signingService.request([
      createExchange.asClause(tokenAddress),
    ]).then(({ txid }) => {
      this.setState({
        label: '',
        decimals: 0,
        tokenAddress: '',
      });
      addPendingTx(txid);
    }).catch(error => {
      console.log(error);
    });
  };

  renderSummary() {
    const { tokenAddress } = this.state;
    const { errorMessage } = this.validate();

    if (!tokenAddress) {
      return (
        <div className="create-exchange__summary-panel">
          <div className="create-exchange__summary-text">{this.props.t("enterTokenCont")}</div>
        </div>
      )
    }

    if (errorMessage) {
      return (
        <div className="create-exchange__summary-panel">
          <div className="create-exchange__summary-text create-exchange--error">{errorMessage}</div>
        </div>
      )
    }

    return null;
  }

  render() {
    const { tokenAddress } = this.state;
    const { t, isConnected, account, selectors, web3 } = this.props;
    const { isValid, errorMessage } = this.validate();
    let label, decimals;

    if (web3 && web3.utils && web3.utils.isAddress(tokenAddress)) {
      const { label: _label, decimals: _decimals } = selectors().getBalance(account, tokenAddress);
      label = _label;
      decimals = _decimals;
    }

    return (
      <div
        key="content"
        className={classnames('swap__content', {
          'swap--inactive': !isConnected,
        })}
      >
        <NavigationTabs
          className={classnames('header__navigation', {
            'header--inactive': !isConnected,
          })}
        />
        <ModeSelector title={t("createExchange")} />
        <AddressInputPanel
          title={t("tokenAddress")}
          value={tokenAddress}
          onChange={this.onChange}
          errorMessage={errorMessage}
        />
        <OversizedPanel hideBottom>
          <div className="pool__summary-panel">
            <div className="pool__exchange-rate-wrapper">
              <span className="pool__exchange-rate">{t("label")}</span>
              <span>{label || ' - '}</span>
            </div>
            <div className="pool__exchange-rate-wrapper">
              <span className="swap__exchange-rate">{t("decimals")}</span>
              <span>{decimals || ' - '}</span>
            </div>
          </div>
        </OversizedPanel>
        { this.renderSummary() }
        <div className="pool__cta-container">
          <button
            className={classnames('pool__cta-btn', {
              'swap--inactive': !isConnected,
            })}
            disabled={!isValid}
            onClick={this.onCreateExchange}
          >
            {t("createExchange")}
          </button>
        </div>
      </div>
    );
  }
}

export default withRouter(
  connect(
    state => ({
      isConnected: !!state.connexConnect.account,
      account: state.connexConnect.account,
      balances: state.connexConnect.balances,
      connex: state.connexConnect.connex,
      exchangeAddresses: state.addresses.exchangeAddresses,
      factoryAddress: state.addresses.factoryAddress,
    }),
    dispatch => ({
      selectors: () => dispatch(selectors()),
      addExchange: opts => dispatch(addExchange(opts)),
      addPendingTx: id => dispatch(addPendingTx(id)),
    })
  )(withNamespaces()(CreateExchange))
);
