# Minting NFT DApp
Minting platform for any eth nft collection just connecting the wanted contract

## How to use
This repository is intended to run with my [smart contract project](https://github.com/JVmano/erc721-dynamic-suply) also based on hashlips original project.

First things first, you'll need to setup up the files that the minting dapp will use to read the contract. The needed changes is:

1. In *src/scripts/main.tsx* change the config path to your contract config.
```
import CollectionConfig from '../../../erc721-dynamic-suply/config/CollectionConfig'
```

2. In *src/scripts/lib/NftContractType.ts* compile your contract and target the generated typeschain file and the right contract name intead of "NftContract" (if isn't yet)
```
import { NftContract as NftContractType } from '../../../../erc721-dynamic-suply/typechain/index'
```

3. In *src/scripts/lib/Whitelist.ts* target the JSON file with the list of whitelisted users.
```
import whitelistAddresses from '../../../../erc721-dynamic-suply/config/whitelist.json'
```

4. In *src/scripts/react/Dapp.tsx* you'll have to change the path three times.
```
import CollectionConfig from '../../../../erc721-dynamic-suply/config/CollectionConfig'
import NetworkConfigInterface from '../../../../erc721-dynamic-suply/lib/NetworkConfigInterface'

const ContractAbi = require('../../../../erc721-dynamic-suply/artifacts/contracts/' + CollectionConfig.contractName + '.sol/' + CollectionConfig.contractName + '.json').abi
```

5. At least, in *src/scripts/react/MintWidget.tsx*
```
import NetworkConfigInterface from '../../../../erc721-dynamic-suply/lib/NetworkConfigInterface'
```

6. After all of this, you can simply use ``yarn install`` or ``npm install`` to install dependencies.

7. To execute the project in dev mode, execute ``yarn dev-server``

8. To build use ``yarn build``

9. Deploy the Dapp in any website host using the files generated in **public** folder.

## Why?
The idea of this project was to simpy study solidity and how this can be functional in real world NFT collections although this project can be used in production, this isn't the best code possible and can enhanced in the future.

## Found a bug?
Create a issue in the repo or simply create a pull request with the solution and a description about it (I'll thank a lot).

## Disclaimer
This code was **heavily** based on [Hashlips mint dapp repository](https://github.com/hashlips-lab/nft-erc721-collection/tree/main/minting-dapp) so give a star on that project too!

Special thanks to Liarco and Daniel (Hashlips) by creating a very intuitive guide for beguinners.
