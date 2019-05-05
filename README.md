# Lisk Genesis Block Creator
[![Build Status](https://travis-ci.org/corbifex/lisk-genesis.svg?branch=master)](https://travis-ci.org/corbifex/lisk-genesis)
[![Coverage Status](https://img.shields.io/codecov/c/github/corbifex/lisk-genesis.svg)](https://codecov.io/gh/corbifex/lisk-genesis/list/master/)
[![Dependencies Status](https://david-dm.org/corbifex/lisk-genesis.svg)](https://david-dm.org/corbifex/lisk-genesis)
[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](http://www.gnu.org/licenses/gpl-3.0)

## What is the Lisk Genesis Block Creator
With this module you can easily create your own genesis block for your Lisk dapps or sidechains.

## Installation
You can install Lisk Genesis by using npm
```
npm install lisk-genesis
```
Or using yarn
```
yarn add lisk-genesis
```

## Usage
After installation you can use lisk-genesis. Below you the find possible function examples.

### Construction
Starting with construction there are two options, use a generated passphrase for the genesis account or use a passphrase of your choosing.
```js
const { GenesisBlock } = require('lisk-genesis');
const genesisBlock = new GenesisBlock();
```
```js
const { GenesisBlock } = require('lisk-genesis');
const genesisBlock = new GenesisBlock("medal differ embody nose prepare inherit popular allow pizza design youth more");
```

### Add Transfer
To add funds to an account you can use the addTransfer() function
```js
genesisBlock.addTransfer({
    recipientId: "18254294583320434366L",
    amount: "10000000000"
});
```

### Add Delegate
To add delegates to your genesis block use the addDelegate() function
```js
// Passphrase is optional if not given a random passphrase will be used and saved to genesis_delegates.json
genesisBlock.addDelegate({
    username: "genesis_0",
    passphrase: "trigger oblige mom orchard please knife slow mixed afraid until suspect setup"
});
```

### Add Votes
To vote for delegates you can use the addVote() function.
addVote uses two arguments `passphrase` and an array with `usernames`.

```js
genesisBlock.addVote(
    "same swamp fade drink radio fancy matter error picnic dial tone cinnamon",
    ["genesis_1", "genesis_0"]
);
```

### Save the Genesis Block
To save the `genesis_block.json`, `genesis_account.json` and `genesis_delegates.json` use the saveGenesisBlock() function.
```js
genesisBlock.saveGenesisBlock('.', true);
```
Optional arguments are `path` default '.' and `saveGenesisAccount` default `true`.

## Credits
[Lisk Foundation](https://github.com/LiskHQ/lisk-sdk) for providing the basic building blocks for this module

## License

Copyright © 2019 Corbifex

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the [GNU General Public License](https://github.com/corbifex/lisk-genesis/tree/master/LICENSE) along with this program. If not, see <http://www.gnu.org/licenses/>.

---

Copyright © 2019 Corbifex

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
