import React from 'react';
import { css, styled } from '@superset-ui/core';
import { ethers } from 'ethers';

const StyledConnectWallet = styled.button`
  width: 118px;
  height: 25px;
  background: #0085FF;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 400;
  color: #FFFFFF;
  border: None;
`

// TODO: Route to Flask API to get nonce
async function getNonce(address: string) {
    const data:object = await fetch(`/get_nonce?address=${address}`).then(res => res.json());
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
    console.log(address, nonce, signature);
    await fetch(`/login?address=${address}&signature=${signature}`)
    location.reload();
}

function WalletConnector() {
  return (
    <StyledConnectWallet onClick={handleWalletConnect}>
        Connect Wallet
    </StyledConnectWallet>
  )
}

export default WalletConnector