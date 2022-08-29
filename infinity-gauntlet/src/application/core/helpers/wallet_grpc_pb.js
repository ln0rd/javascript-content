/* eslint-disable */
// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('grpc');
var services_wallet_wallet_pb = require('./wallet_pb.js');

function serialize_wallet_CreateWalletReply(arg) {
  if (!(arg instanceof services_wallet_wallet_pb.CreateWalletReply)) {
    throw new Error('Expected argument of type wallet.CreateWalletReply');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_wallet_CreateWalletReply(buffer_arg) {
  return services_wallet_wallet_pb.CreateWalletReply.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_wallet_CreateWalletRequest(arg) {
  if (!(arg instanceof services_wallet_wallet_pb.CreateWalletRequest)) {
    throw new Error('Expected argument of type wallet.CreateWalletRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_wallet_CreateWalletRequest(buffer_arg) {
  return services_wallet_wallet_pb.CreateWalletRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_wallet_FreezeWalletAmountReply(arg) {
  if (!(arg instanceof services_wallet_wallet_pb.FreezeWalletAmountReply)) {
    throw new Error('Expected argument of type wallet.FreezeWalletAmountReply');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_wallet_FreezeWalletAmountReply(buffer_arg) {
  return services_wallet_wallet_pb.FreezeWalletAmountReply.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_wallet_FreezeWalletAmountRequest(arg) {
  if (!(arg instanceof services_wallet_wallet_pb.FreezeWalletAmountRequest)) {
    throw new Error('Expected argument of type wallet.FreezeWalletAmountRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_wallet_FreezeWalletAmountRequest(buffer_arg) {
  return services_wallet_wallet_pb.FreezeWalletAmountRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_wallet_GetWalletHeldAmountReply(arg) {
  if (!(arg instanceof services_wallet_wallet_pb.GetWalletHeldAmountReply)) {
    throw new Error('Expected argument of type wallet.GetWalletHeldAmountReply');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_wallet_GetWalletHeldAmountReply(buffer_arg) {
  return services_wallet_wallet_pb.GetWalletHeldAmountReply.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_wallet_GetWalletHeldAmountRequest(arg) {
  if (!(arg instanceof services_wallet_wallet_pb.GetWalletHeldAmountRequest)) {
    throw new Error('Expected argument of type wallet.GetWalletHeldAmountRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_wallet_GetWalletHeldAmountRequest(buffer_arg) {
  return services_wallet_wallet_pb.GetWalletHeldAmountRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_wallet_GetWalletMaximumAmountThatCanBeTakenReply(arg) {
  if (!(arg instanceof services_wallet_wallet_pb.GetWalletMaximumAmountThatCanBeTakenReply)) {
    throw new Error('Expected argument of type wallet.GetWalletMaximumAmountThatCanBeTakenReply');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_wallet_GetWalletMaximumAmountThatCanBeTakenReply(buffer_arg) {
  return services_wallet_wallet_pb.GetWalletMaximumAmountThatCanBeTakenReply.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_wallet_GetWalletMaximumAmountThatCanBeTakenRequest(arg) {
  if (!(arg instanceof services_wallet_wallet_pb.GetWalletMaximumAmountThatCanBeTakenRequest)) {
    throw new Error('Expected argument of type wallet.GetWalletMaximumAmountThatCanBeTakenRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_wallet_GetWalletMaximumAmountThatCanBeTakenRequest(buffer_arg) {
  return services_wallet_wallet_pb.GetWalletMaximumAmountThatCanBeTakenRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_wallet_GetWalletPastMoneyTransactionsReply(arg) {
  if (!(arg instanceof services_wallet_wallet_pb.GetWalletPastMoneyTransactionsReply)) {
    throw new Error('Expected argument of type wallet.GetWalletPastMoneyTransactionsReply');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_wallet_GetWalletPastMoneyTransactionsReply(buffer_arg) {
  return services_wallet_wallet_pb.GetWalletPastMoneyTransactionsReply.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_wallet_GetWalletPastMoneyTransactionsRequest(arg) {
  if (!(arg instanceof services_wallet_wallet_pb.GetWalletPastMoneyTransactionsRequest)) {
    throw new Error('Expected argument of type wallet.GetWalletPastMoneyTransactionsRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_wallet_GetWalletPastMoneyTransactionsRequest(buffer_arg) {
  return services_wallet_wallet_pb.GetWalletPastMoneyTransactionsRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_wallet_GetWalletTotalFrozenAmountReply(arg) {
  if (!(arg instanceof services_wallet_wallet_pb.GetWalletTotalFrozenAmountReply)) {
    throw new Error('Expected argument of type wallet.GetWalletTotalFrozenAmountReply');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_wallet_GetWalletTotalFrozenAmountReply(buffer_arg) {
  return services_wallet_wallet_pb.GetWalletTotalFrozenAmountReply.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_wallet_GetWalletTotalFrozenAmountRequest(arg) {
  if (!(arg instanceof services_wallet_wallet_pb.GetWalletTotalFrozenAmountRequest)) {
    throw new Error('Expected argument of type wallet.GetWalletTotalFrozenAmountRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_wallet_GetWalletTotalFrozenAmountRequest(buffer_arg) {
  return services_wallet_wallet_pb.GetWalletTotalFrozenAmountRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_wallet_PutMoneyIntoWalletReply(arg) {
  if (!(arg instanceof services_wallet_wallet_pb.PutMoneyIntoWalletReply)) {
    throw new Error('Expected argument of type wallet.PutMoneyIntoWalletReply');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_wallet_PutMoneyIntoWalletReply(buffer_arg) {
  return services_wallet_wallet_pb.PutMoneyIntoWalletReply.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_wallet_PutMoneyIntoWalletRequest(arg) {
  if (!(arg instanceof services_wallet_wallet_pb.PutMoneyIntoWalletRequest)) {
    throw new Error('Expected argument of type wallet.PutMoneyIntoWalletRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_wallet_PutMoneyIntoWalletRequest(buffer_arg) {
  return services_wallet_wallet_pb.PutMoneyIntoWalletRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_wallet_TakeMoneyFromWalletReply(arg) {
  if (!(arg instanceof services_wallet_wallet_pb.TakeMoneyFromWalletReply)) {
    throw new Error('Expected argument of type wallet.TakeMoneyFromWalletReply');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_wallet_TakeMoneyFromWalletReply(buffer_arg) {
  return services_wallet_wallet_pb.TakeMoneyFromWalletReply.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_wallet_TakeMoneyFromWalletRequest(arg) {
  if (!(arg instanceof services_wallet_wallet_pb.TakeMoneyFromWalletRequest)) {
    throw new Error('Expected argument of type wallet.TakeMoneyFromWalletRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_wallet_TakeMoneyFromWalletRequest(buffer_arg) {
  return services_wallet_wallet_pb.TakeMoneyFromWalletRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_wallet_UnfreezeWalletAmountReply(arg) {
  if (!(arg instanceof services_wallet_wallet_pb.UnfreezeWalletAmountReply)) {
    throw new Error('Expected argument of type wallet.UnfreezeWalletAmountReply');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_wallet_UnfreezeWalletAmountReply(buffer_arg) {
  return services_wallet_wallet_pb.UnfreezeWalletAmountReply.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_wallet_UnfreezeWalletAmountRequest(arg) {
  if (!(arg instanceof services_wallet_wallet_pb.UnfreezeWalletAmountRequest)) {
    throw new Error('Expected argument of type wallet.UnfreezeWalletAmountRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_wallet_UnfreezeWalletAmountRequest(buffer_arg) {
  return services_wallet_wallet_pb.UnfreezeWalletAmountRequest.deserializeBinary(new Uint8Array(buffer_arg));
}


var WalletService = exports.WalletService = {
  //
  // This procedure creates a new `Wallet` with an unique `id`.
  // This `id` is returned as the `wallet_id` field inside the `CreateWalletReply`.
  createWallet: {
    path: '/wallet.Wallet/CreateWallet',
    requestStream: false,
    responseStream: false,
    requestType: services_wallet_wallet_pb.CreateWalletRequest,
    responseType: services_wallet_wallet_pb.CreateWalletReply,
    requestSerialize: serialize_wallet_CreateWalletRequest,
    requestDeserialize: deserialize_wallet_CreateWalletRequest,
    responseSerialize: serialize_wallet_CreateWalletReply,
    responseDeserialize: deserialize_wallet_CreateWalletReply,
  },
  //
  // This procedure increases the `Wallet`'s `held_amount` by the amount
  // contained in the `PutMoneyIntoWalletRequest`.
  putMoneyIntoWallet: {
    path: '/wallet.Wallet/PutMoneyIntoWallet',
    requestStream: false,
    responseStream: false,
    requestType: services_wallet_wallet_pb.PutMoneyIntoWalletRequest,
    responseType: services_wallet_wallet_pb.PutMoneyIntoWalletReply,
    requestSerialize: serialize_wallet_PutMoneyIntoWalletRequest,
    requestDeserialize: deserialize_wallet_PutMoneyIntoWalletRequest,
    responseSerialize: serialize_wallet_PutMoneyIntoWalletReply,
    responseDeserialize: deserialize_wallet_PutMoneyIntoWalletReply,
  },
  //
  // This procedure decreases the `Wallet`'s `held_amount` by the amount contained
  // in the `TakeMoneyFromWalletRequest`.
  takeMoneyFromWallet: {
    path: '/wallet.Wallet/TakeMoneyFromWallet',
    requestStream: false,
    responseStream: false,
    requestType: services_wallet_wallet_pb.TakeMoneyFromWalletRequest,
    responseType: services_wallet_wallet_pb.TakeMoneyFromWalletReply,
    requestSerialize: serialize_wallet_TakeMoneyFromWalletRequest,
    requestDeserialize: deserialize_wallet_TakeMoneyFromWalletRequest,
    responseSerialize: serialize_wallet_TakeMoneyFromWalletReply,
    responseDeserialize: deserialize_wallet_TakeMoneyFromWalletReply,
  },
  //
  // The `FreezeRequest` describes an amount to be frozen for a target `Wallet`.
  // After this procedure finishes, it's guaranteed the wallet holds the requested amount,
  // unless unfreeze is called.
  freezeWalletAmount: {
    path: '/wallet.Wallet/FreezeWalletAmount',
    requestStream: false,
    responseStream: false,
    requestType: services_wallet_wallet_pb.FreezeWalletAmountRequest,
    responseType: services_wallet_wallet_pb.FreezeWalletAmountReply,
    requestSerialize: serialize_wallet_FreezeWalletAmountRequest,
    requestDeserialize: deserialize_wallet_FreezeWalletAmountRequest,
    responseSerialize: serialize_wallet_FreezeWalletAmountReply,
    responseDeserialize: deserialize_wallet_FreezeWalletAmountReply,
  },
  //
  // Unfrezees a previously frozen amount. After that this amount can be taken from the wallet.
  unfreezeWalletAmount: {
    path: '/wallet.Wallet/UnfreezeWalletAmount',
    requestStream: false,
    responseStream: false,
    requestType: services_wallet_wallet_pb.UnfreezeWalletAmountRequest,
    responseType: services_wallet_wallet_pb.UnfreezeWalletAmountReply,
    requestSerialize: serialize_wallet_UnfreezeWalletAmountRequest,
    requestDeserialize: deserialize_wallet_UnfreezeWalletAmountRequest,
    responseSerialize: serialize_wallet_UnfreezeWalletAmountReply,
    responseDeserialize: deserialize_wallet_UnfreezeWalletAmountReply,
  },
  //
  // Returns the maximum amount that can be taken from a `Wallet`.
  getWalletMaximumAmountThatCanBeTaken: {
    path: '/wallet.Wallet/GetWalletMaximumAmountThatCanBeTaken',
    requestStream: false,
    responseStream: false,
    requestType: services_wallet_wallet_pb.GetWalletMaximumAmountThatCanBeTakenRequest,
    responseType: services_wallet_wallet_pb.GetWalletMaximumAmountThatCanBeTakenReply,
    requestSerialize: serialize_wallet_GetWalletMaximumAmountThatCanBeTakenRequest,
    requestDeserialize: deserialize_wallet_GetWalletMaximumAmountThatCanBeTakenRequest,
    responseSerialize: serialize_wallet_GetWalletMaximumAmountThatCanBeTakenReply,
    responseDeserialize: deserialize_wallet_GetWalletMaximumAmountThatCanBeTakenReply,
  },
  //
  // Return the total currently frozen in a `Wallet`.
  getWalletTotalFrozenAmount: {
    path: '/wallet.Wallet/GetWalletTotalFrozenAmount',
    requestStream: false,
    responseStream: false,
    requestType: services_wallet_wallet_pb.GetWalletTotalFrozenAmountRequest,
    responseType: services_wallet_wallet_pb.GetWalletTotalFrozenAmountReply,
    requestSerialize: serialize_wallet_GetWalletTotalFrozenAmountRequest,
    requestDeserialize: deserialize_wallet_GetWalletTotalFrozenAmountRequest,
    responseSerialize: serialize_wallet_GetWalletTotalFrozenAmountReply,
    responseDeserialize: deserialize_wallet_GetWalletTotalFrozenAmountReply,
  },
  //
  // Returns all the money that was put in a `Wallet`.
  // This amount may not necessarally be taken, because it includes the total frozen amount.
  getWalletHeldAmount: {
    path: '/wallet.Wallet/GetWalletHeldAmount',
    requestStream: false,
    responseStream: false,
    requestType: services_wallet_wallet_pb.GetWalletHeldAmountRequest,
    responseType: services_wallet_wallet_pb.GetWalletHeldAmountReply,
    requestSerialize: serialize_wallet_GetWalletHeldAmountRequest,
    requestDeserialize: deserialize_wallet_GetWalletHeldAmountRequest,
    responseSerialize: serialize_wallet_GetWalletHeldAmountReply,
    responseDeserialize: deserialize_wallet_GetWalletHeldAmountReply,
  },
  getWalletPastMoneyTransactions: {
    path: '/wallet.Wallet/GetWalletPastMoneyTransactions',
    requestStream: false,
    responseStream: false,
    requestType: services_wallet_wallet_pb.GetWalletPastMoneyTransactionsRequest,
    responseType: services_wallet_wallet_pb.GetWalletPastMoneyTransactionsReply,
    requestSerialize: serialize_wallet_GetWalletPastMoneyTransactionsRequest,
    requestDeserialize: deserialize_wallet_GetWalletPastMoneyTransactionsRequest,
    responseSerialize: serialize_wallet_GetWalletPastMoneyTransactionsReply,
    responseDeserialize: deserialize_wallet_GetWalletPastMoneyTransactionsReply,
  },
};

exports.WalletClient = grpc.makeGenericClientConstructor(WalletService);
