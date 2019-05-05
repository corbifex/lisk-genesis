"use strict";
const BigNum = require("@liskhq/bignum");
const liskPassphrase = require("@liskhq/lisk-passphrase");
const liskCryptography = require("@liskhq/lisk-cryptography");
const liskTransactions = require("@liskhq/lisk-transactions");
const crypto = require("crypto");
const ByteBuffer = require("bytebuffer");
const sodium = require("sodium-native");
const fs = require("fs");
const _ = require("lodash");

const defaultGenesisBlock = {
  version: 0,
  totalFee: "0",
  reward: "0",
  timestamp: 0,
  numberOfTransactions: 0,
  payloadLength: 0,
  previousBlock: null
};

/**
 * Genesis block generator
 *
 * @class
 * @param {String} valid Lisk passphrase
 */
class GenesisBlock {
  constructor(passphrase = null) {
    this.genesisAccount = this._getAccount(passphrase);
    this.genesisBlock = { ...defaultGenesisBlock };
    this.transactions = [];
    this.delegates = [];
  }

  /**
   * Add funds to an address
   *
   * @param {Object} transferInput
   * @param {string} transferInput.recipientId - Address to receive funds
   * @param {string} transferInput.amount
   */
  addTransfer(transferInput) {
    transferInput = {
      type: 0,
      passphrase: this.passphrase,
      ...transferInput
    };
    if (!transferInput.recipientId || !transferInput.amount) {
      throw error(
        `Argument missing for addTransfer(). Use addTransfer({recipientId: "12345L", amount: "10000"});`
      );
    }
    let baseTransaction = liskTransactions.transfer(transferInput);
    baseTransaction = {
      ...baseTransaction,
      fee: "0",
      timestamp: 0
    };
    delete baseTransaction.signature;
    baseTransaction.signature = liskTransactions.utils.signTransaction(
      baseTransaction,
      this.passphrase
    );

    if (
      liskTransactions.utils.validateTransaction(baseTransaction).errors
        .length < 2
    ) {
      this.transactions.push(baseTransaction);
      return true;
    }
    throw liskTransactions.utils.validateTransaction(baseTransaction);
  }

  /**
   * Add new delegate transaction
   *
   * @param {Object} delegateInput
   * @param {string} delegateInput.username - Username for delegate
   * @param {string} [delegateInput.passphrase] - Passphrase for delegate account. Use random passphrase when not supplied
   */
  addDelegate(delegateInput) {
    delegateInput = {
      ...delegateInput,
      type: 2,
      timestamp: 0,
      amount: "0"
    };
    if (!delegateInput.passphrase) {
      delegateInput.passphrase = liskPassphrase.Mnemonic.generateMnemonic();
    }
    this.delegates.push({
      username: delegateInput.username,
      passphrase: delegateInput.passphrase
    });
    if (this._getPublicKeys([delegateInput.username], true).length > 0) {
      throw `Can't add '${delegateInput.username}' twice`;
    }
    let delegateTransaction = liskTransactions.registerDelegate(delegateInput);
    delegateTransaction = {
      ...delegateTransaction,
      fee: "0",
      timestamp: 0,
      recipientId: null
    };
    delete delegateTransaction.signature;
    delegateTransaction.signature = liskTransactions.utils.signTransaction(
      delegateTransaction,
      delegateInput.passphrase
    );
    if (
      liskTransactions.utils.validateTransaction(delegateTransaction).errors
        .length < 3
    ) {
      this.transactions.push(delegateTransaction);
      return true;
    }
    throw liskTransactions.utils.validateTransaction(delegateTransaction);
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
    let voteTransaction = liskTransactions.castVotes({
      passphrase: passphrase,
      votes: votePublicKeys
    });
    voteTransaction = {
      ...voteTransaction,
      fee: "0",
      timestamp: 0
    };
    delete voteTransaction.signature;
    voteTransaction.signature = liskTransactions.utils.signTransaction(
      voteTransaction,
      passphrase
    );
    if (
      liskTransactions.utils.validateTransaction(voteTransaction).errors
        .length < 2
    ) {
      this.transactions.push(voteTransaction);
      return true;
    }
    throw liskTransactions.utils.validateTransaction(voteTransaction);
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
      if (genesisBlockPath !== "." && !fs.existsSync(genesisBlockPath)) {
        fs.mkdirSync(`${genesisBlockPath}/private`, { recursive: true });
      }
      if (!fs.existsSync(`${genesisBlockPath}/private`)) {
        fs.mkdirSync(`${genesisBlockPath}/private`, { recursive: true });
      }
      fs.writeFileSync(
        `${genesisBlockPath}/genesis_block.json`,
        JSON.stringify(this.genesisBlock, "", 2)
      );
      console.log(
        `Genesis block is saved at: ${genesisBlockPath}/genesis_block.json`
      );
      if (this.delegates.length > 0) {
        fs.writeFileSync(
          `${genesisBlockPath}/private/genesis_delegates.json`,
          JSON.stringify(this.delegates, "", 2)
        );
        console.log(
          `Genesis delegates are is saved at: ${genesisBlockPath}/private/genesis_delegates.json`
        );
      }
      if (saveGenesisAccount) {
        fs.writeFileSync(
          `${genesisBlockPath}/private/genesis_account.json`,
          JSON.stringify(this._getGenesisAccount(), "", 2)
        );
        console.log(
          `Genesis account information is saved at: ${genesisBlockPath}/private/genesis_account.json`
        );
      }
    } catch (e) {
      throw e;
    }
  }

  /**
   * Gives genesis account passphrase, secretKey and publicKey
   *
   * @returns {Object} genesis account
   */
  _getGenesisAccount() {
    return { ...this.genesisAccount, passphrase: this.passphrase };
  }

  /**
   * Private sets genesis account details
   *
   * @param {string} [passphrase] - Passphrase for genesis account, when empty generates random passphrase
   * @return {Object} PrivateAndPublicKey
   */
  _getAccount(passphrase) {
    if (passphrase) {
      if (
        liskPassphrase.validation.getPassphraseValidationErrors(passphrase)
          .length > 0
      ) {
        throw liskPassphrase.validation.getPassphraseValidationErrors(
          passphrase
        );
      }
      this.passphrase = passphrase;
    }
    if (!this.passphrase) {
      this.passphrase = liskPassphrase.Mnemonic.generateMnemonic();
    }
    return liskCryptography.getPrivateAndPublicKeyFromPassphrase(
      this.passphrase
    );
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
      const transaction = this.transactions[i];
      const bytes = this._getBytes(transaction);
      this.genesisBlock.payloadLength += bytes.length;
      totalAmount = totalAmount.plus(transaction.amount);
      payloadHash.update(bytes);
    }
    this.genesisBlock.payloadHash = payloadHash.digest().toString("hex");
    this.genesisBlock.totalAmount = totalAmount.toString();
    this.genesisBlock.numberOfTransactions = this.transactions.length;
    this.genesisBlock.generatorPublicKey = this.genesisAccount.publicKey.toString(
      "hex"
    );
    this.genesisBlock.transactions = this.transactions;

    let hash = crypto
      .createHash("sha256")
      .update(this._getBlockBytes(this.genesisBlock))
      .digest();
    this.genesisBlock.height = 1;
    this.genesisBlock.blockSignature = this._signBlock(hash).toString("hex");
    this.genesisBlock.id = this._getBlockId(this.genesisBlock);
  }

  /**
   * Private get block id
   *
   * @param {Object} block
   * @return {Object} blockId
   */
  _getBlockId(block) {
    const hash = crypto
      .createHash("sha256")
      .update(this._getBlockBytes(block))
      .digest();
    const temp = Buffer.alloc(8);
    for (let i = 0; i < 8; i++) {
      temp[i] = hash[7 - i];
    }

    return new BigNum.fromBuffer(temp).toString();
  }

  /**
   * Private sign block
   *
   * @param {string} hash
   * @return {string} signature
   */
  _signBlock(hash) {
    const signature = Buffer.alloc(sodium.crypto_sign_BYTES);
    sodium.crypto_sign_detached(
      signature,
      hash,
      liskCryptography.hexToBuffer(this.genesisAccount.privateKey)
    );
    return signature;
  }

  /**
   * Private get public keys for delegates by usernames
   *
   * @param {Array} usernames
   * @param {Boolean} ignoreThrow
   * @return {Array} publicKeys
   */
  _getPublicKeys(usernames, ignoreThrow = false) {
    if (!usernames || typeof usernames !== "object" || usernames.length === 0) {
      throw `No delegate usernames found to vote. \n
      Please use as follows: genesisBlock.addVote(passphrase, ["username_1", "username_2"]);`;
    }
    return _.compact(
      usernames.map(username => {
        try {
          return _.find(
            this.transactions,
            tx => tx.type === 2 && tx.asset.delegate.username === username
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
   * Private get bytes transactions
   *
   * @param {Object} transaction
   * @return {Buffer} transactionBytes
   */
  _getBytes(transaction) {
    const transactionType = Buffer.alloc(
      liskTransactions.constants.BYTESIZES.TYPE,
      transaction.type
    );
    const transactionTimestamp = Buffer.alloc(1);
    transactionTimestamp.writeIntLE(1, 0, 1);

    const transactionSenderPublicKey = liskCryptography.hexToBuffer(
      transaction.senderPublicKey
    );

    const transactionRecipientID = transaction.recipientId
      ? liskCryptography
          .bigNumberToBuffer(
            transaction.recipientId.slice(0, -1),
            liskTransactions.constants.BYTESIZES.RECIPIENT_ID
          )
          .slice(0, liskTransactions.constants.BYTESIZES.RECIPIENT_ID)
      : Buffer.alloc(liskTransactions.constants.BYTESIZES.RECIPIENT_ID);

    const transactionAmount = new BigNum(transaction.amount).toBuffer({
      endian: "little",
      size: liskTransactions.constants.BYTESIZES.AMOUNT
    });

    return Buffer.concat([
      transactionType,
      transactionTimestamp,
      transactionSenderPublicKey,
      transactionRecipientID,
      transactionAmount
    ]);
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

    const payloadHashBuffer = liskCryptography.hexToBuffer(block.payloadHash);
    for (let i = 0; i < payloadHashBuffer.length; i++) {
      byteBuffer.writeByte(payloadHashBuffer[i]);
    }

    const generatorPublicKeyBuffer = liskCryptography.hexToBuffer(
      block.generatorPublicKey
    );
    for (let i = 0; i < generatorPublicKeyBuffer.length; i++) {
      byteBuffer.writeByte(generatorPublicKeyBuffer[i]);
    }

    if (block.blockSignature) {
      const blockSignatureBuffer = liskCryptography.hexToBuffer(
        block.blockSignature
      );
      for (let i = 0; i < blockSignatureBuffer.length; i++) {
        byteBuffer.writeByte(blockSignatureBuffer[i]);
      }
    }

    byteBuffer.flip();
    bytes = byteBuffer.toBuffer();

    return bytes;
  }
}

function error(e) {
  return e;
}

module.exports = GenesisBlock;
