import React from 'react';
import { styled } from '@superset-ui/core';
import { ethers } from 'ethers';

// eslint-disable-next-line theme-colors/no-literal-colors
const StyledConnectWallet = styled.button`
  width: 118px;
  height: 25px;
  background: #0085ff;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 400;
  color: #ffffff;
  border: None;
`;

interface WalletConnectorProps {
  username: string | undefined;
}

interface NonceResponse {
  nonce: string;
}

function WalletConnector({ username }: WalletConnectorProps) {
  async function getNonce(address: string) {
    const data: NonceResponse = await fetch(
      `/get_nonce?address=${address}`,
    ).then(res => res.json());
    return data.nonce;
  }

  async function handleWalletConnect() {
    if (!window.ethereum) {
      alert('Please install a crypto wallet');
    }
    await window.ethereum.send('eth_requestAccounts');
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const address = await signer.getAddress();
    const nonce = await getNonce(address);
    const signature = await signer.signMessage(nonce);
    await fetch(`/login?address=${address}&signature=${signature}`);
    window.location.reload();
  }

  function truncateText(text: string) {
    if (text.length <= 10) {
      return text;
    }
    return `${text.substr(0, 10)}...`;
  }

  return (
    <div>
      {username ? (
        <StyledConnectWallet disabled>
          {truncateText(username)}
        </StyledConnectWallet>
      ) : (
        <StyledConnectWallet onClick={handleWalletConnect}>
          Connect Wallet
        </StyledConnectWallet>
      )}
    </div>
  );
}

export default WalletConnector;
