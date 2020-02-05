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
const { getAddressFromPublicKey } = require('@liskhq/lisk-cryptography');
const {
  isValidTransferAmount,
  validateAddress,
  validatePublicKey,
} = require('@liskhq/lisk-validator');
const { TransferTransaction, constants: { BYTESIZES } } = require('@liskhq/lisk-transactions');
const { createBaseTransaction } = require('@liskhq/lisk-transactions/dist-node/utils');

const validateInputs = ({
                          amount,
                          recipientId,
                          recipientPublicKey,
                          data,
                        }) => {
  if (!isValidTransferAmount(amount)) {
    throw new Error('Amount must be a valid number in string format.');
  }

  if (!recipientId && !recipientPublicKey) {
    throw new Error(
      'Either recipientId or recipientPublicKey must be provided.',
    );
  }

  if (typeof recipientId !== 'undefined') {
    validateAddress(recipientId);
  }

  if (typeof recipientPublicKey !== 'undefined') {
    validatePublicKey(recipientPublicKey);
  }

  if (
    recipientId &&
    recipientPublicKey &&
    recipientId !== getAddressFromPublicKey(recipientPublicKey)
  ) {
    throw new Error('recipientId does not match recipientPublicKey.');
  }

  if (data && data.length > 0) {
    if (typeof data !== 'string') {
      throw new Error(
        'Invalid encoding in transaction data. Data must be utf-8 encoded string.',
      );
    }
    if (data.length > BYTESIZES.DATA) {
      throw new Error('Transaction data field cannot exceed 64 bytes.');
    }
  }
};

module.exports = function(inputs) {
  validateInputs(inputs);
  const {
    data,
    amount,
    recipientPublicKey,
    passphrase,
    secondPassphrase,
  } = inputs;

  const recipientIdFromPublicKey = recipientPublicKey
    ? getAddressFromPublicKey(recipientPublicKey)
    : undefined;
  const recipientId = inputs.recipientId
    ? inputs.recipientId
    : recipientIdFromPublicKey;

  const transaction = {
    ...createBaseTransaction(inputs),
    type: 8,
    asset: {
      amount,
      recipientId: recipientId,
      data,
    },
  };

  if (!passphrase) {
    return transaction;
  }

  const transactionWithSenderInfo = {
    ...transaction,
    senderPublicKey: transaction.senderPublicKey,
    asset: {
      ...transaction.asset,
      recipientId: recipientId,
    },
  };

  const transferTransaction = new TransferTransaction(
    transactionWithSenderInfo,
  );

  transferTransaction.sign(passphrase, secondPassphrase);

  return transferTransaction.toJSON();
};
