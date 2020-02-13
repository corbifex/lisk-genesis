"use strict";
const BigNum = require("@liskhq/bignum");
const {Mnemonic, validation} = require("@liskhq/lisk-passphrase");
const {
  getPrivateAndPublicKeyFromPassphrase,
  encryptPassphraseWithPassword,
  signData,
  hexToBuffer,
  hash,
  getAddressAndPublicKeyFromPassphrase,
  signDataWithPassphrase,
  getFirstEightBytesReversed
} = require("@liskhq/lisk-cryptography");
const {
  TransferTransaction,
  DelegateTransaction,
  VoteTransaction,
  createResponse,
  utils,
} = require("@liskhq/lisk-transactions");
const transfer = require('./transactions/transfer');
const delegate = require('./transactions/delegate');
const vote = require('./transactions/vote');
const crypto = require("crypto");
const ByteBuffer = require("bytebuffer");
const fs = require("fs");
const _ = require("lodash");
const {getId, validateSignature} = utils;
const defaultGenesisBlock = {
  version: 2,
  timestamp: 0,
  height: 1,
  maxHeightPreviouslyForged: 0,
  maxHeightPrevoted: 0,
  reward: "0",
  totalFee: "0",
  payloadLength: 0,
  previousBlockId: null,
};

/**
 * Genesis block generator
 *
 * @class
 * @param {String} valid Lisk passphrase
 */
class GenesisBlock {
  constructor(identifier, passphrase = null) {
    if (_.isEmpty(identifier)) {
      throw "No `communityIdentifier` given use `const genesisBlock = new GenesisBlock('yourProjectName', [passphrase]);";
    }
    this.genesisAccount = this._getAccount(passphrase);
    this.genesisBlock = {...defaultGenesisBlock, communityIdentifier: identifier};
    this.transactions = [];
    this.delegates = [];
    this.password = Mnemonic.generateMnemonic()
      .split(/\s+/)
      .slice(0, 5)
      .join(" ");
  }

  /**
   * Add one or multiple transfers
   *
   * @param {Array|Object} transfersInput
   * @param {string} transfersInput[].recipientId - Address to receive funds
   * @param {string} transfersInput[].amount
   */
  addTransfer(transfersInput) {
    if (_.isArray(transfersInput)) {
      _.map(transfersInput, transferInput => this._addTransfer(transferInput));
    } else {
      this._addTransfer(transfersInput);
    }
  }

  /**
   * Add funds to an address
   *
   * @param {Object} transferInput
   * @param {string} transferInput.recipientId - Address to receive funds
   * @param {string} transferInput.amount
   */
  _addTransfer(transferInput) {
    if (!transferInput.recipientId || !transferInput.amount) {
      throw `Argument missing for addTransfer(). Use addTransfer({recipientId: "12345L", amount: "10000"});`;
    }
    let trasferBase = transfer(transferInput);
    trasferBase.senderPublicKey = getAddressAndPublicKeyFromPassphrase(
      this.passphrase
    ).publicKey;
    trasferBase.timestamp = 0;

    let transferTransaction = new TransferTransaction(trasferBase);
    delete transferTransaction.signatures;
    transferTransaction.sign(this.passphrase);

    if (transferTransaction.validate().status !== 1) {
      throw transferTransaction.validate().errors;
    }

    transferTransaction.fee = "0";
    this.transactions.push(transferTransaction);
  }

  /**
   * Add one or multiple delegates
   *
   * @param {Array|Object} delegatesInput
   * @param {string} delegatesInput[].username - Username for delegate
   * @param {string} [delegatesInput[].passphrase] - Passphrase for delegate account. Use random passphrase when not supplied
   */
  addDelegate(delegatesInput) {
    if (_.isArray(delegatesInput)) {
      _.map(delegatesInput, delegateInput => this._addDelegate(delegateInput));
    } else {
      this._addDelegate(delegatesInput);
    }
  }

  /**
   * Add new delegate transaction
   *
   * @param {Object} delegateInput
   * @param {string} delegateInput.username - Username for delegate
   * @param {string} [delegateInput.passphrase] - Passphrase for delegate account. Use random passphrase when not supplied
   */
  _addDelegate(delegateInput) {
    if (!delegateInput.passphrase) {
      delegateInput.passphrase = Mnemonic.generateMnemonic();
    }

    if (this._getPublicKeys([delegateInput.username], true).length > 0) {
      throw `Can't add '${delegateInput.username}' twice`;
    }

    delegateInput.senderPublicKey = getAddressAndPublicKeyFromPassphrase(
      delegateInput.passphrase
    );
    this.delegates.push({
      username: delegateInput.username,
      publicKey: delegateInput.senderPublicKey,
      passphrase: delegateInput.passphrase,
      encryptedPassphrase: _.map(
        encryptPassphraseWithPassword(delegateInput.passphrase, this.password),
        (v, k) => {
          return encodeURIComponent(k) + "=" + encodeURIComponent(v);
        }
      ).join("&")
    });

    let delegateTransaction = new DelegateTransaction(
      delegate(delegateInput)
    );
    delete delegateTransaction.signatures;
    delegateTransaction.timestamp = 0;
    delegateTransaction.sign(delegateInput.passphrase);

    if (delegateTransaction.validate().status !== 1) {
      throw delegateTransaction.validate().errors;
    }

    delegateTransaction.fee = "0";
    delegateTransaction.recipientId = null;
    this.transactions.push(delegateTransaction);
  }

  /**
   * Add votes to transactions
   *
   * @param {string} passphrase - Valid passphrase for account
   * @param {Array} votes - Array of delegate usernames to vote for
   */
  addVote(passphrase, votes) {
    if (!passphrase || !votes) {
      throw `Argument missing for addVote(). Use addVote({string} passphrase, {Array} Votes).`;
    }

    const votePublicKeys = this._getPublicKeys(votes);
    let castTransaction = vote({
      passphrase: passphrase,
      votes: votePublicKeys
    });
    castTransaction.timestamp = 0;

    let voteTransaction = new VoteTransaction(castTransaction);
    delete voteTransaction.signatures;
    delete voteTransaction.recipientPublicKey;
    voteTransaction.sign(passphrase);

    if (voteTransaction.validate().status !== 1) {
      throw voteTransaction.validate().errors;
    }
    voteTransaction.fee = "0";

    this.transactions.push(voteTransaction);
  }

  /**
   * Save genesis block to file
   *
   * @param {string} [genesisBlockPath=.] - Path to store the genesis_block.json
   * @param {boolean} [saveGenesisAccount=true] - Save genesis account passphrase, privateKey and publicKey?
   */
  saveGenesisBlock(genesisBlockPath = ".", saveGenesisAccount = true) {
    try {
      this._createGenesisBlock();
      if (
        !fs.existsSync(genesisBlockPath) ||
        !fs.existsSync(`${genesisBlockPath}/private`)
      ) {
        fs.mkdirSync(`${genesisBlockPath}`, {recursive: true});
        fs.mkdirSync(`${genesisBlockPath}/private`, {recursive: true});
      }

      fs.writeFileSync(
        `${genesisBlockPath}/genesis_block.json`,
        JSON.stringify(this.genesisBlock, null, 2)
      );
      console.log(
        `Genesis block is saved at: ${genesisBlockPath}/genesis_block.json`
      );

      if (this.delegates.length > 0) {
        const genesisDelegates = {
          delegates: this.delegates,
          password: this.password
        };
        fs.writeFileSync(
          `${genesisBlockPath}/private/genesis_delegates.json`,
          JSON.stringify(genesisDelegates, null, 2)
        );
        const forgingConfig = genesisDelegates.delegates.map(d => {
          return {
            encryptedPassphrase: d.encryptedPassphrase,
            publicKey: d.publicKey.publicKey
          }
        });
        fs.writeFileSync(
          `${genesisBlockPath}/private/forging_config.json`,
          JSON.stringify(forgingConfig, null, 2)
        );
        console.log(
          `Genesis delegates are is saved at: ${genesisBlockPath}/private/genesis_delegates.json`
        );
      }

      if (saveGenesisAccount) {
        fs.writeFileSync(
          `${genesisBlockPath}/private/genesis_account.json`,
          JSON.stringify(this._getGenesisAccount(), null, 2)
        );
        console.log(
          `Genesis account information is saved at: ${genesisBlockPath}/private/genesis_account.json`
        );
      }
    } catch (e) {
      throw this.genesisBlock;
    }
  }

  /**
   * Gives genesis account passphrase, secretKey and publicKey
   *
   * @returns {Object} genesis account
   */
  _getGenesisAccount() {
    return {...this.genesisAccount, passphrase: this.passphrase};
  }

  /**
   * Private sets genesis account details
   *
   * @param {string} [passphrase] - Passphrase for genesis account, when empty generates random passphrase
   * @return {Object} PrivateAndPublicKey
   */
  _getAccount(passphrase) {
    if (passphrase) {
      if (validation.getPassphraseValidationErrors(passphrase).length > 0) {
        throw validation.getPassphraseValidationErrors(passphrase);
      }
      this.passphrase = passphrase;
    }

    if (!this.passphrase) {
      this.passphrase = Mnemonic.generateMnemonic();
    }

    return getPrivateAndPublicKeyFromPassphrase(this.passphrase);
  }

  /**
   * Private build genesis block
   *
   * Helper function to create genesis block before saving it to a file
   */
  _createGenesisBlock() {
    const payloadHash = crypto.createHash("sha256");
    let totalAmount = new BigNum(0);

    for (let i = 0; i < this.transactions.length; i++) {
      const bytes = this.transactions[i].getBytes();
      this.genesisBlock.payloadLength += bytes.length;
      if (this.transactions[i].asset && this.transactions[i].asset.amount) {
        totalAmount = totalAmount.plus(this.transactions[i].asset.amount);
      }
      payloadHash.update(bytes);
    }
    this.genesisBlock.payloadHash = payloadHash.digest().toString("hex");
    this.genesisBlock.totalAmount = totalAmount.toString();
    this.genesisBlock.numberOfTransactions = this.transactions.length;
    this.genesisBlock.generatorPublicKey = this.genesisAccount.publicKey.toString(
      "hex"
    );
    this.genesisBlock.transactions = this.transactions.map(tx => {
      let txData = { ...tx.toJSON() };
      delete txData.fee;
      delete txData.senderId;
      return txData;
    });
    this.genesisBlock.height = 1;
    this.genesisBlock.blockSignature = signDataWithPassphrase(
      hash(this._getBlockBytes(this.genesisBlock)),
      this.passphrase
    );
    this.genesisBlock.id = new BigNum.fromBuffer(
      getFirstEightBytesReversed(hash(this._getBlockBytes(this.genesisBlock)))
    ).toString();
  }

  /**
   * Private get public keys for delegates by usernames
   *
   * @param {Array} usernames
   * @param {Boolean} ignoreThrow
   * @return {Array} publicKeys
   */
  _getPublicKeys(usernames, ignoreThrow = false) {
    if (!usernames || !_.isArray(usernames) || usernames.length === 0) {
      throw `No delegate usernames found to vote. \n
      Please use as follows: genesisBlock.addVote(passphrase, ["username_1", "username_2"]);`;
    }
    return _.compact(
      usernames.map(username => {
        try {
          return _.find(
            this.transactions,
            tx => tx.type === 10 && tx.asset.username === username
          ).senderPublicKey;
        } catch (e) {
          if (!ignoreThrow) {
            throw `Couldn't find ${username} in delegates`;
          }
          return null;
        }
      })
    );
  }

  /**
   * Private get bytes block
   *
   * @param {Object} block
   * @return {Buffer} blockBytes
   */
  _getBlockBytes(block) {
    let bytes;

    const byteBuffer = new ByteBuffer();
    byteBuffer.writeInt(block.version);
    byteBuffer.writeInt(block.timestamp);

    for (let i = 0; i < 8; i++) {
      byteBuffer.writeByte(0);
    }

    byteBuffer.writeInt(block.numberOfTransactions);
    byteBuffer.writeLong(block.totalAmount.toString());
    byteBuffer.writeLong(block.totalFee.toString());
    byteBuffer.writeLong(block.reward.toString());

    byteBuffer.writeInt(block.payloadLength);

    const payloadHashBuffer = hexToBuffer(block.payloadHash);
    for (let i = 0; i < payloadHashBuffer.length; i++) {
      byteBuffer.writeByte(payloadHashBuffer[i]);
    }

    const generatorPublicKeyBuffer = hexToBuffer(block.generatorPublicKey);
    for (let i = 0; i < generatorPublicKeyBuffer.length; i++) {
      byteBuffer.writeByte(generatorPublicKeyBuffer[i]);
    }

    if (block.blockSignature) {
      const blockSignatureBuffer = hexToBuffer(block.blockSignature);
      for (let i = 0; i < blockSignatureBuffer.length; i++) {
        byteBuffer.writeByte(blockSignatureBuffer[i]);
      }
    }

    byteBuffer.flip();
    bytes = byteBuffer.toBuffer();

    return bytes;
  }
}

const validate = function () {
  const errors = [...this._validateSchema(), ...this.validateAsset()];
  if (errors.length > 0) {
    return createResponse(this.id, errors);
  }

  const transactionBytes = this.getBasicBytes();

  this._id = getId(this.getBytes());

  const {
    valid: signatureValid,
    error: verificationError,
  } = validateSignature(
    this.senderPublicKey,
    this.signature,
    transactionBytes,
    this.id,
  );

  if (!signatureValid && verificationError) {
    errors.push(verificationError);
  }

  if (this.type !== this.constructor.TYPE) {
    errors.push(
      new TransactionError(
        `Invalid type`,
        this.id,
        '.type',
        this.type,
        this.constructor.TYPE,
      ),
    );
  }

  return createResponse(this.id, errors);
};

const sign = function (passphrase, secondPassphrase = null) {
  const {publicKey} = getAddressAndPublicKeyFromPassphrase(passphrase);

  if (this._senderPublicKey !== '' && this._senderPublicKey !== publicKey) {
    throw new Error(
      'Transaction senderPublicKey does not match public key from passphrase',
    );
  }

  this._senderPublicKey = publicKey;

  this._signature = undefined;
  this._signSignature = undefined;

  this._signature = signData(
    hash(this.getBytes()),
    passphrase,
  );

  if (secondPassphrase) {
    this._signSignature = signData(
      hash(
        Buffer.concat([
          this.getBytes(),
          hexToBuffer(this._signature),
        ]),
      ),
      secondPassphrase,
    );
  }

  this._id = getId(this.getBytes());
};

TransferTransaction.prototype.validate = validate;
DelegateTransaction.prototype.validate = validate;
VoteTransaction.prototype.validate = validate;
TransferTransaction.prototype.sign = sign;
DelegateTransaction.prototype.sign = sign;
VoteTransaction.prototype.sign = sign;

module.exports = GenesisBlock;
