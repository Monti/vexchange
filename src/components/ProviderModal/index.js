import React, { Component } from 'react';
import { Modal } from 'antd';

import CometLogo from '../../assets/images/comet.png';
import AkraneLogo from '../../assets/images/arkane.svg';

import './provider-modal.scss';

class ProviderModal extends Component {
  constructor(props) {
    super(props);

    this.state = {
      visible: true,
      provider: null,
    };

    this.setArkane = this.setArkane.bind(this);
    this.setComet = this.setComet.bind(this);
  }

  componentDidMount() {
    const provider = localStorage.getItem('provider');

    if (provider === 'thor') {
      window.location.replace("http://beta.vexchange.io");
			return;
    }

    if (provider) {
      this.setState({
        visible: false,
        provider
      });
    }
  }

  setComet() {
    this.setState({
      provider: 'thor',
      visible: false
    }, () => {
      localStorage.setItem('provider', 'thor');
      window.location.href = 'https://beta.vexchange.io';
    });
  }

  setArkane() {
    this.setState({
      provider: 'arkane',
      visible: false
    }, () => {
      window.arkaneConnect.authenticate();
      localStorage.setItem('provider', 'arkane');
    });
  }

  render() {
    return (
      <>
        { this.state.provider && this.props.render(this.state.provider) }
        <Modal
          title={(
            <div>
              You can manage a wallet using Arkane Network or Comet.<br /> Which would you prefer to use?
            </div>
          )}
          visible={this.state.visible}
          footer={null}
        >
          <div className="provider-chooser">
            <button onClick={this.setArkane} className="provider-chooser__button">
              <img src={AkraneLogo} />
            </button>
            <button onClick={this.setComet} className="provider-chooser__button">
              <img src={CometLogo} />
            </button>
          </div>
        </Modal>
      </>
    )
  }
}

export default ProviderModal;
