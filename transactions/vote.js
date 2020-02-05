/*
 * Copyright © 2019 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 *
 */
const {
  validatePublicKeys,
} = require('@liskhq/lisk-validator');
const {getAddressFromPassphrase} = require('@liskhq/lisk-cryptography');
const {VoteTransaction, utils} = require('@liskhq/lisk-transactions');
const {createBaseTransaction} = require('@liskhq/lisk-transactions/dist-node/utils');
const {
  prependMinusToPublicKeys,
  prependPlusToPublicKeys,
} = utils;
const validateInputs = ({
                          votes = [],
                          unvotes = [],
                        }) => {
  if (!Array.isArray(votes)) {
    throw new Error(
      'Please provide a valid votes value. Expected an array if present.',
    );
  }
  if (!Array.isArray(unvotes)) {
    throw new Error(
      'Please provide a valid unvotes value. Expected an array if present.',
    );
  }

  validatePublicKeys([...votes, ...unvotes]);
};

module.exports = function (inputs) {
  validateInputs(inputs);
  const {
    passphrase,
    secondPassphrase,
    votes = [],
    unvotes = [],
  } = inputs;

  const plusPrependedVotes = prependPlusToPublicKeys(votes);
  const minusPrependedUnvotes = prependMinusToPublicKeys(unvotes);
  const allVotes = [
    ...plusPrependedVotes,
    ...minusPrependedUnvotes,
  ];

  const transaction = {
    ...createBaseTransaction(inputs),
    type: 11,
    asset: {
      votes: allVotes,
    },
  };

  if (!passphrase) {
    return transaction;
  }

  const recipientId = getAddressFromPassphrase(passphrase);
  const transactionWithSenderInfo = {
    ...transaction,
    // SenderId and SenderPublicKey are expected to be exist from base transaction
    senderPublicKey: transaction.senderPublicKey,
    asset: {
      ...transaction.asset,
      recipientId,
    },
  };

  const voteTransaction = new VoteTransaction(transactionWithSenderInfo);
  voteTransaction.sign(passphrase, secondPassphrase);

  return voteTransaction.toJSON();
};
