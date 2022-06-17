/* eslint-disable no-return-assign */
/* eslint-disable no-undef */
import React from 'react'
import { ethers, BigNumber } from 'ethers'
import { ExternalProvider, Web3Provider } from '@ethersproject/providers'
import detectEthereumProvider from '@metamask/detect-provider'
import NftContractType from '../lib/NftContractType'
import CollectionConfig from '../../../../erc721-dynamic-suply/config/CollectionConfig'
import NetworkConfigInterface from '../../../../erc721-dynamic-suply/lib/NetworkConfigInterface'
import CollectionStatus from './CollectionStatus'
import Whitelist from '../lib/Whitelist'
import { toast } from 'react-toastify'
import MintWidget from './MintWidget'

const ContractAbi = require('../../../../erc721-dynamic-suply/artifacts/contracts/' + CollectionConfig.contractName + '.sol/' + CollectionConfig.contractName + '.json').abi

interface Props {}

interface State {
  userAddress: string | null;
  network: ethers.providers.Network | null;
  networkConfig: NetworkConfigInterface;
  totalSupply: number;
  maxSupply: number;
  maxFree: number;
  maxMintAmountPerTx: number;
  maxFreeMintAmountPerTx: number;
  tokenPrice: BigNumber;
  freePrice: BigNumber; // I think you known what it's the value lol
  isPaused: boolean;
  loading: boolean;
  isWhitelistMintEnabled: boolean;
  isUserInWhitelist: boolean;
  merkleProofManualAddress: string;
  merkleProofManualAddressFeedbackMessage: string | JSX.Element | null;
  errorMessage: string | JSX.Element | null;
}

const defaultState: State = {
  userAddress: null,
  network: null,
  networkConfig: CollectionConfig.mainnet,
  totalSupply: 0,
  maxSupply: 0,
  maxFree: 0,
  maxMintAmountPerTx: 0,
  maxFreeMintAmountPerTx: 0,
  tokenPrice: BigNumber.from(0),
  freePrice: BigNumber.from(0),
  isPaused: true,
  loading: false,
  isWhitelistMintEnabled: false,
  isUserInWhitelist: false,
  merkleProofManualAddress: '',
  merkleProofManualAddressFeedbackMessage: null,
  errorMessage: null
}

export default class Dapp extends React.Component<Props, State> {
  provider!: Web3Provider

  contract!: NftContractType

  private merkleProofManualAddressInput!: HTMLInputElement

  constructor (props: Props) {
    super(props)

    this.state = defaultState
  }

  componentDidMount = async () => {
    const browserProvider = await detectEthereumProvider() as ExternalProvider

    if (browserProvider?.isMetaMask !== true) {
      this.setError(
        <>
          We were not able to detect <strong>MetaMask</strong>. We value <strong>privacy and security</strong> a lot so we limit the wallet options on the DAPP.<br />
          <br />
          But dont worry! <span className="emoji">😃</span> You can always interact with the smart-contract through <a href={this.generateContractUrl()} target="_blank" rel="noreferrer">{this.state.networkConfig.blockExplorer.name}</a> and <strong>we do our best to provide you with the best user experience possible</strong>, even from there.<br />
          <br />
          You can also get your <strong>Whitelist Proof</strong> manually, using the tool below.
        </>
      )
    }

    this.provider = new ethers.providers.Web3Provider(browserProvider)

    this.registerWalletEvents(browserProvider)

    await this.initWallet()
  }

  private isWalletConnected (): boolean {
    return this.state.userAddress !== null
  }

  private isContractReady (): boolean {
    return this.contract !== undefined
  }

  private isSoldOut (): boolean {
    return this.state.maxSupply !== 0 && this.state.totalSupply >= this.state.maxSupply
  }

  private isNotMainnet (): boolean {
    return this.state.network !== null && this.state.network.chainId !== CollectionConfig.mainnet.chainId
  }

  private copyMerkleProofToClipboard (): void {
    const merkleProof = Whitelist.getRawProofForAddress(this.state.userAddress ?? this.state.merkleProofManualAddress)

    if (merkleProof.length < 1) {
      this.setState({
        merkleProofManualAddressFeedbackMessage: 'The given address is not in the whitelist, please double-check.'
      })

      return
    }

    navigator.clipboard.writeText(merkleProof)

    this.setState({
      merkleProofManualAddressFeedbackMessage:
      <>
        <strong>Congratulations!</strong> <span className="emoji">🎉</span><br />
        Your Merkle Proof <strong>has been copied to the clipboard</strong>. You can paste it into <a href={this.generateContractUrl()} target="_blank" rel="noreferrer">{this.state.networkConfig.blockExplorer.name}</a> to claim your tokens.
      </>
    })
  }

  private setError (error: any = null): void {
    let errorMessage = 'Unknown error...'

    if (error === null || typeof error === 'string') {
      errorMessage = error
    } else if (typeof error === 'object') {
      if (error?.error.message !== undefined) {
        errorMessage = error.error.message
      } else if (error?.data?.message !== undefined) {
        errorMessage = error.data.message
      } else if (error?.message !== undefined) {
        errorMessage = error.message
      } else if (React.isValidElement(error)) {
        this.setState({ errorMessage: error })

        return
      }
    }

    this.setState({
      errorMessage: errorMessage === null ? null : errorMessage.charAt(0).toLocaleUpperCase() + errorMessage.slice(1)
    })
  }

  private generateContractUrl (): string {
    return this.state.networkConfig.blockExplorer.generateContractUrl(CollectionConfig.contractAddress!)
  }

  private generateMarketplaceUrl (): string {
    return CollectionConfig.marketplaceConfig.generateCollectionUrl(CollectionConfig.marketplaceIdentifier, !this.isNotMainnet())
  }

  private generateTransactionUrl (transactionHash: string): string {
    return this.state.networkConfig.blockExplorer.generateTransactionUrl(transactionHash)
  }

  private async connectWallet (): Promise<void> {
    try {
      await this.provider.provider.request!({ method: 'eth_requestAccounts' })

      this.initWallet()
    } catch (e) {
      this.setError(e)
    }
  }

  private async refreshContractState (): Promise<void> {
    this.setState({
      maxSupply: (await this.contract.maxSupply()).toNumber(),
      maxFree: (await this.contract.maxFree()).toNumber(),
      totalSupply: (await this.contract.totalSupply()).toNumber(),
      maxMintAmountPerTx: (await this.contract.maxperAddressPublicMint()).toNumber(),
      maxFreeMintAmountPerTx: (await this.contract.maxperAddressFreeLimit()).toNumber(),
      tokenPrice: await this.contract.cost(),
      isPaused: await this.contract.paused(),
      isWhitelistMintEnabled: await this.contract.whitelistMintEnabled(),
      isUserInWhitelist: Whitelist.contains(this.state.userAddress ?? '')
    })
  }

  private async initWallet (): Promise<void> {
    const walletAccounts = await this.provider.listAccounts()

    this.setState(defaultState)

    if (walletAccounts.length === 0) {
      return
    }

    const network = await this.provider.getNetwork()
    let networkConfig: NetworkConfigInterface

    if (network.chainId === CollectionConfig.mainnet.chainId) {
      networkConfig = CollectionConfig.mainnet
    } else if (network.chainId === CollectionConfig.ropsten.chainId) {
      networkConfig = CollectionConfig.ropsten
    } else if (network.chainId === CollectionConfig.rinkeby.chainId) {
      networkConfig = CollectionConfig.rinkeby
    } else if (network.chainId === CollectionConfig.goerli.chainId) {
      networkConfig = CollectionConfig.goerli
    } else {
      this.setError('Unsupported network!')

      return
    }

    this.setState({
      userAddress: walletAccounts[0],
      network,
      networkConfig
    })

    if (await this.provider.getCode(CollectionConfig.contractAddress!) === '0x') {
      this.setError('Could not find the contract, are you connected to the right chain?')

      return
    }

    this.contract = new ethers.Contract(
      CollectionConfig.contractAddress!,
      ContractAbi,
      this.provider.getSigner()
    ) as unknown as NftContractType

    this.refreshContractState()
  }

  private registerWalletEvents (browserProvider: ExternalProvider): void {
    // @ts-ignore
    browserProvider.on('accountsChanged', () => {
      this.initWallet()
    })

    // @ts-ignore
    browserProvider.on('chainChanged', () => {
      window.location.reload()
    })
  }

  async mintTokens (amount: number): Promise<void> {
    try {
      this.setState({ loading: true })
      // set the transaction with the responsible mint method of the contract
      const transaction = await this.contract.mint(amount, { value: this.state.tokenPrice.mul(amount) })

      toast.info(
        <>
          Transaction sent! Please wait...<br/>
          <a href={this.generateTransactionUrl(transaction.hash)} target='_blank' rel='noopener noreferrer'>View on {this.state.networkConfig.blockExplorer.name}</a>
        </>
      )

      const receipt = await transaction.wait()

      toast.success(
        <>
          Success!<br />
          <a href={this.generateTransactionUrl(receipt.transactionHash)} target='_blank' rel='noopener noreferrer'>View on {this.state.networkConfig.blockExplorer.name}</a>
        </>
      )

      this.refreshContractState()
      this.setState({ loading: false })
    } catch (err) {
      this.setError(err)
      this.setState({ loading: false })
    }
  }

  async mintFree (amount: number): Promise<void> {
    try {
      this.setState({ loading: true })
      const transaction = await this.contract.mintFree(amount, { value: this.state.freePrice.mul(amount) })

      toast.info(
        <>
          Transaction sent! Please wait...<br/>
          <a href={this.generateTransactionUrl(transaction.hash)} target='_blank' rel='noopener noreferrer'>View on {this.state.networkConfig.blockExplorer.name}</a>
        </>
      )

      const receipt = await transaction.wait()

      toast.success(
        <>
          Success!<br />
          <a href={this.generateTransactionUrl(receipt.transactionHash)} target='_blank' rel='noopener noreferrer'>View on {this.state.networkConfig.blockExplorer.name}</a>
        </>
      )

      this.refreshContractState()
      this.setState({ loading: false })
    } catch (err) {
      this.setError(err)
      this.setState({ loading: false })
    }
  }

  async whitelistMintTokens (amount: number): Promise<void> {
    try {
      this.setState({ loading: true })
      const transaction = await this.contract.whitelistMint(amount, Whitelist.getProofForAddress(this.state.userAddress!), { value: this.state.tokenPrice.mul(amount) })

      toast.info(<>
        Transaction sent! Please wait...<br/>
        <a href={this.generateTransactionUrl(transaction.hash)} target="_blank" rel="noopener noreferrer">View on {this.state.networkConfig.blockExplorer.name}</a>
      </>)

      const receipt = await transaction.wait()

      toast.success(<>
        Success!<br />
        <a href={this.generateTransactionUrl(receipt.transactionHash)} target="_blank" rel="noopener noreferrer">View on {this.state.networkConfig.blockExplorer.name}</a>
      </>)

      this.refreshContractState()
      this.setState({ loading: false })
    } catch (err) {
      this.setError(err)
      this.setState({ loading: false })
    }
  }

  render () {
    return (
      <>
        {this.isNotMainnet()
          ? <div className="not-mainnet">
            You are not connected to the main network.
            <span className="small">Current network: <strong>{this.state.network?.name}</strong></span>
          </div>
          : null}

        {this.state.errorMessage ? <div className="error"><p>{this.state.errorMessage}</p><button onClick={() => this.setError()}>Close</button></div> : null}

        {this.isWalletConnected()
          ? <>
            {this.isContractReady()
              ? <>
                <CollectionStatus
                  userAddress={this.state.userAddress}
                  maxSupply={this.state.maxSupply}
                  maxFree={this.state.maxFree}
                  totalSupply={this.state.totalSupply}
                  isPaused={this.state.isPaused}
                  isWhitelistMintEnabled={this.state.isWhitelistMintEnabled}
                  isUserWhitelist={this.state.isUserInWhitelist}
                  isSoldOut={this.isSoldOut()}
                />
                {!this.isSoldOut()
                  ? <MintWidget
                    networkConfig={this.state.networkConfig}
                    maxSupply={this.state.maxSupply}
                    maxFree={this.state.maxFree}
                    totalSupply={this.state.totalSupply}
                    tokenPrice={this.state.tokenPrice}
                    maxMintAmountPerTx={this.state.maxMintAmountPerTx}
                    maxFreeMintAmountPerTx={this.state.maxFreeMintAmountPerTx}
                    isPaused={this.state.isPaused}
                    loading={this.state.loading}
                    isUserInWhitelist={this.state.isUserInWhitelist}
                    isWhitelistMintEnabled={this.state.isWhitelistMintEnabled}
                    mintTokens={(mintAmount) => this.mintTokens(mintAmount)}
                    mintFree={(mintAmount) => this.mintFree(mintAmount)}
                    whitelistMintTokens={(mintAmount) => this.whitelistMintTokens(mintAmount)}
                  />
                  : <div className="collection-sold-out">
                    <h2>Tokens have been <strong>sold out</strong>! <span className="emoji">🥳</span></h2>

                    You can buy from our beloved holders on <a href={this.generateMarketplaceUrl()} target="_blank" rel="noreferrer">{CollectionConfig.marketplaceConfig.name}</a>.
                  </div>
                }
              </>
              : <div className="collection-not-ready">
                <svg className="spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>

                Loading collection data...
              </div>
            }
          </>
          : <div className="no-wallet">
            {!this.isWalletConnected() ? <button className="primary" disabled={this.provider === undefined} onClick={() => this.connectWallet()}>Connect Wallet</button> : null}

            <div className="use-block-explorer">
              Hey, looking for a <strong>super-safe experience</strong>? <span className="emoji">😃</span><br />
              You can interact with the smart-contract <strong>directly</strong> through <a href={this.generateContractUrl()} target="_blank" rel="noreferrer">{this.state.networkConfig.blockExplorer.name}</a>, without even connecting your wallet to this DAPP! <span className="emoji">🚀</span><br />
              <br />
              Keep safe! <span className="emoji">❤️</span>
            </div>

            {!this.isWalletConnected() || this.state.isWhitelistMintEnabled
              ? <div className="merkle-proof-manual-address">
                <h2>Whitelist Proof</h2>
                <p>
                  Anyone can generate the proof using any public address in the list, but <strong>only the owner of that address</strong> will be able to make a successful transaction by using it.
                </p>

                {this.state.merkleProofManualAddressFeedbackMessage ? <div className="feedback-message">{this.state.merkleProofManualAddressFeedbackMessage}</div> : null}

                <label htmlFor="merkle-proof-manual-address">Public address:</label>
                <input id="merkle-proof-manual-address" type="text" placeholder="0x000..." disabled={this.state.userAddress !== null} value={this.state.userAddress ?? this.state.merkleProofManualAddress} ref={(input) => this.merkleProofManualAddressInput = input!} onChange={() => { this.setState({ merkleProofManualAddress: this.merkleProofManualAddressInput.value }) }} /> <button onClick={() => this.copyMerkleProofToClipboard()}>Generate and copy to clipboard</button>
              </div>
              : null}
          </div>
        }
      </>
    )
  }
}
