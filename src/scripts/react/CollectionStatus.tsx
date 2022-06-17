import React from 'react'

interface Props {
  userAddress: string | null;
  totalSupply: number;
  maxSupply: number;
  maxFree: number;
  isPaused: boolean;
  isWhitelistMintEnabled: boolean;
  isUserWhitelist: boolean;
  isSoldOut: boolean;
}

interface State {}

const defaultState: State = {}

export default class CollectionStatus extends React.Component<Props, State> {
  constructor (props: Props) {
    super(props)

    this.state = defaultState
  }

  private isSaleOpen (): boolean {
    return (this.props.isWhitelistMintEnabled || !this.props.isPaused) && !this.props.isSoldOut
  }

  render () {
    return (
      <>
        <div className='collection-status'>
          <div className='user-address'>
            <span className='label'>Wallet Address</span>
            <span className='address'>{this.props.userAddress}</span>
          </div>

          <div className='supply'>
            <span className='label'>{this.props.totalSupply < this.props.maxFree ? 'Free Supply' : 'Supply'}</span>
            {this.props.totalSupply}/{
              this.props.totalSupply < this.props.maxFree
                ? this.props.maxFree
                : this.props.maxSupply
            }
          </div>

          <div className='current-sale'>
            <span className='label'>Sale Status</span>
            {
              this.isSaleOpen()
                ? <>
                {this.props.isWhitelistMintEnabled ? 'Whitelist Only' : 'Open'}
              </>
                : 'Closed'
            }
          </div>
        </div>
      </>
    )
  }
}
