import React, { Component } from 'react';
import { Modal } from 'antd';
import { timingSafeEqual } from 'crypto';

class TosModal extends Component {
  constructor(props) {
    super(props);

    this.state = {
      visible: false,
    };

    this.handleOk = this.handleOk.bind(this);
    this.handleCancel = this.handleCancel.bind(this);
  }

  handleOk() {
    localStorage.setItem('tos', true);
    this.setState({ visible: false });
  }

  handleCancel() {
    this.setState({ visible: false });
  }

  componentWillMount() {
    const tos = JSON.parse(localStorage.getItem('tos'));
    if (!tos) {
      this.setState({ visible: true });
    }
  }

  render() {
    return (
      <Modal
        title="Terms of Service"
        visible={this.state.visible}
        onOk={this.handleOk}
        onCancel={this.handleCancel}
      >
        <p>
          The Vexchange contracts and front-end are open source works that are licensed under GNU. This software is provided without any guarantees or liability, the code and licenses can be reviewed <a href="https://github.com/Monti/vexchange" target="_blank" rel="noopener noreferrer">here</a>. The Vexchange site is simply an interface to an exchange running on the VeChain blockchain. We do not endorse any of the tokens and are not licensed to give investment advice. You acknowledge that you use this software at your own risk, both in terms of security and financial loss.
        </p>
        <div>
          <a
            href="https://github.com/Monti/vexchange-contracts"
            target="_blank"
            rel="noopener noreferrer"
          >
            Vexchange Contracts Github Repo
          </a>
          <br />
          <a
            href="https://github.com/Monti/vexchange"
            target="_blank"
            rel="noopener noreferrer"
          >
            Vexchange Front-End Github Repo
          </a>
          <br />
          <a
            href="https://github.com/Monti/vexchange/blob/master/FEES.md"
            target="_blank"
            rel="noopener noreferrer"
          >
            Vexchange Fees
          </a>
        </div>
      </Modal>
    )
  }
}

export default TosModal;
