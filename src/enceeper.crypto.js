//
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Crypto wrapper around SJCL and TweetNaCl library
//
// Copyright (C) 2019 Vassilis Poursalidis (poursal@gmail.com)
//
// This program is free software: you can redistribute it and/or modify it under the terms of the
// GNU General Public License as published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without
// even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
// General Public License for more details.
//
// You should have received a copy of the GNU General Public License along with this program. If
// not, see <https://www.gnu.org/licenses/>.
//
// Maybe use the following to not block the UI:
// https://github.com/dchest/scrypt-async-js
//

// Check our requirements
if (typeof module === 'object') {
  // eslint-disable-next-line
  var sjcl = require('sjcl')
  // eslint-disable-next-line
  var nacl = require('tweetnacl')
}

if (typeof enceeper !== 'object') {
  throw new Error('You need to include the enceeper base file!')
}
if (typeof InvalidArgumentException === 'undefined') {
  throw new Error('You need to include the enceeper exceptions JS file!')
}
if (typeof sjcl !== 'object') {
  throw new Error('You need to include the SJCL JS file!')
}
if (typeof nacl !== 'object') {
  throw new Error('You need to include the TweetNaCl JS file!')
}

// A wrapper around SJCL and TweetNaCl library
enceeper.crypto = function (pass, salt) {
  if (typeof pass !== 'string') {
    throw new InvalidArgumentException('You must provide your password for crypto operations.')
  }
  if (typeof salt !== 'string' || !enceeper._isHex(salt)) {
    throw new InvalidArgumentException('The salt must be a HEX string.')
  }

  this._defaults = { iter: -1 }
  this._masterKey = sjcl.misc.scrypt(pass, sjcl.codec.hex.toBits(salt))
  this._kek = null
  this._keyPair = null
}

enceeper.crypto.prototype = {
  createAccountKeys: function () {
    // We create a KeyEncryptionKey to easily change the user password
    // and a Public-Private key pair to facilitate key sharing
    const randomKey = sjcl.random.randomWords(8)
    const keyPair = nacl.box.keyPair()

    return this.returnAccountKeys(randomKey, keyPair)
  },

  returnAccountKeys: function (randomKey, keyPair) {
    randomKey = randomKey || this._kek
    keyPair = keyPair || this._keyPair

    if (randomKey === null) {
      throw new InvalidStateException('You must call restoreAccountKeys first.')
    }
    if (keyPair === null) {
      throw new InvalidStateException('You must call restoreAccountKeys first.')
    }

    const accountKeys = {
      v: 1,
      kek: this.encryptKEK(randomKey),
      pub: this._Uint8toHex(keyPair.publicKey),
      prv: this._encrypt(randomKey, this._Uint8toHex(keyPair.secretKey))
    }

    return accountKeys
  },

  restoreAccountKeys: function (accountKeys) {
    if (typeof accountKeys !== 'object') {
      throw new InvalidArgumentException('You must provide an object to the restoreAccountKeys function.')
    }
    if (typeof accountKeys.v !== 'number') {
      throw new InvalidArgumentException('The account keys version is not a number.')
    }

    if (accountKeys.v === 1) {
      if (typeof accountKeys.kek !== 'string') {
        throw new InvalidArgumentException('The account keys object must have a hex representation of KEK.')
      }
      if (typeof accountKeys.pub !== 'string') {
        throw new InvalidArgumentException('The account keys object must have a hex representation of the public key.')
      }
      if (typeof accountKeys.prv !== 'string') {
        throw new InvalidArgumentException('The account keys object must have a hex representation of the private key.')
      }
    } else {
      throw new InvalidArgumentException('Unknown version number found in account keys: ' + accountKeys.v)
    }

    this._kek = sjcl.codec.hex.toBits(this._decrypt(this._masterKey.slice(0, 8), accountKeys.kek))
    this._keyPair = {
      publicKey: this._Uint8fromHex(accountKeys.pub),
      secretKey: this._Uint8fromHex(this._decrypt(this._kek, accountKeys.prv))
    }
  },

  getKEK: function () {
    if (this._kek === null) {
      throw new InvalidStateException('You must call restoreAccountKeys first.')
    }

    return this._kek
  },

  encryptKEK: function (kek) {
    if (typeof kek !== 'object') {
      throw new InvalidArgumentException('The KEK must be an array.')
    }

    return this._encrypt(this._masterKey.slice(0, 8), sjcl.codec.hex.fromBits(kek))
  },

  // Create new random key and encrypt input values
  createKey: function (meta, value) {
    if (typeof meta !== 'object') {
      throw new InvalidArgumentException('The meta must be a JSON object.')
    }
    if (typeof value !== 'object') {
      throw new InvalidArgumentException('The value must be a JSON object.')
    }

    // Generate a random key to encrypt meta and value
    const randomKey = sjcl.random.randomWords(8)
    const encMeta = this._encrypt(randomKey, JSON.stringify(meta))
    const encValue = this._encrypt(randomKey, JSON.stringify(value))

    return {
      meta: encMeta,
      value: encValue,
      slot: this._addSlot0(randomKey)
    }
  },

  // Restore random key and decrypt input values
  getKey: function (slot0, meta, value) {
    let decMeta = null; let decValue = null

    if (typeof slot0 !== 'string') {
      throw new InvalidArgumentException('You must provide slot 0 and it must be a string to restore the random key.')
    }
    if (meta !== null && typeof meta !== 'string') {
      throw new InvalidArgumentException('If you provide the meta it must be a string for decryption.')
    }
    if (value !== null && typeof value !== 'string') {
      throw new InvalidArgumentException('If you provide the value it must be a string for decryption.')
    }

    const randomKey = this._getKeyFromSlot0(slot0)
    if (meta !== null) {
      decMeta = this._decrypt(randomKey, meta)
    }
    if (value !== null) {
      decValue = this._decrypt(randomKey, value)
    }

    return {
      meta: JSON.parse(decMeta),
      value: JSON.parse(decValue)
    }
  },

  // Encrypt input values using existing random key from slot0
  updateKey: function (slot0, meta, value) {
    if (typeof slot0 !== 'string') {
      throw new InvalidArgumentException('You must provide slot 0 and it must be a string to restore the random key.')
    }
    if (meta !== null && typeof meta !== 'object') {
      throw new InvalidArgumentException('If you provide the meta it must be a JSON object.')
    }
    if (value !== null && typeof value !== 'object') {
      throw new InvalidArgumentException('If you provide the value it must be a JSON object.')
    }

    const result = {}
    // Generate a random key to encrypt meta and value
    const randomKey = this._getKeyFromSlot0(slot0)
    if (meta !== null) {
      result.meta = this._encrypt(randomKey, JSON.stringify(meta))
    }
    if (value !== null) {
      result.value = this._encrypt(randomKey, JSON.stringify(value))
    }

    return result
  },

  // Use a secondary password to create a new slot (for server keys)
  addSlot: function (slot0, newPass) {
    if (typeof slot0 !== 'string') {
      throw new InvalidArgumentException('You must provide slot 0 and it must be a string add a new slot.')
    }
    if (typeof newPass !== 'string') {
      throw new InvalidArgumentException('You must provide your new password for the creation of the new slot.')
    }

    const salt = sjcl.random.randomWords(8)
    const defaults = this._iterationCopy(this._defaults)
    const randomKey = this._getKeyFromSlot0(slot0)
    const passKey = sjcl.misc.scrypt(newPass, salt).slice(0, 8)

    // Set the scrypt salt for decryption
    //
    // https://github.com/P-H-C/phc-string-format/blob/master/phc-sf-spec.md
    //
    defaults.scrypt = salt

    return sjcl.encrypt(passKey, sjcl.codec.hex.fromBits(randomKey), defaults)
  },

  createShareSlot: function (slot0, pubKey) {
    if (this._kek === null) {
      throw new InvalidStateException('You must first restore the Key Encryption Key.')
    }

    if (typeof slot0 !== 'string') {
      throw new InvalidArgumentException('You must provide slot 0 and it must be a string to add a new slot.')
    }
    if (typeof pubKey !== 'string') {
      throw new InvalidArgumentException('You must provide the public key of the recepient.')
    }

    const randomKey = this._getKeyFromSlot0(slot0)
    const salt = nacl.randomBytes(nacl.secretbox.nonceLength)

    const slotUint8 = nacl.box(this._convertWordArrayToUint8Array(randomKey),
      salt,
      this._Uint8fromHex(pubKey),
      this._keyPair.secretKey)

    return JSON.stringify({
      v: 1,
      salt: this._Uint8toHex(salt),
      slot: this._Uint8toHex(slotUint8)
    })
  },

  acceptShareSlot: function (slot, pubKey) {
    if (this._kek === null) {
      throw new InvalidStateException('You must first restore the Key Encryption Key.')
    }

    if (typeof slot !== 'string') {
      throw new InvalidArgumentException('You must provide the slot that holds the shared key.')
    }
    if (typeof pubKey !== 'string') {
      throw new InvalidArgumentException('You must provide the public key of the sender.')
    }

    const share = JSON.parse(slot)

    if (share.v === 1) {
      const randomKey = nacl.box.open(
        this._Uint8fromHex(share.slot),
        this._Uint8fromHex(share.salt),
        this._Uint8fromHex(pubKey),
        this._keyPair.secretKey)

      return this._addSlot0(this._convertUint8ArrayToWordArray(randomKey))
    } else {
      throw new InvalidStateException('Unknown version of share meta: ' + share.v)
    }
  },

  // Encrypt and create slot 0
  _addSlot0: function (randomKey) {
    if (this._kek === null) {
      throw new InvalidStateException('You must first restore the Key Encryption Key.')
    }

    const keyMeta = {
      v: 1,
      key: sjcl.codec.hex.fromBits(randomKey)
    }

    return this._encrypt(this._kek, JSON.stringify(keyMeta))
  },

  // Get the key from slot 0 (random key)
  _getKeyFromSlot0: function (slot) {
    if (this._kek === null) {
      throw new InvalidStateException('You must first restore the Key Encryption Key.')
    }

    const decKey = this._decrypt(this._kek, slot)
    const keyMeta = JSON.parse(decKey)

    if (keyMeta.v === 1) {
      return sjcl.codec.hex.toBits(keyMeta.key)
    } else {
      throw new InvalidStateException('Unknown version of key meta: ' + keyMeta.v)
    }
  },

  // Check the secondary password against the slot
  _getKeyFromSlotX: function (newPass, slot) {
    const encKey = JSON.parse(slot)
    const passKey = sjcl.misc.scrypt(newPass, sjcl.codec.base64.toBits(encKey.scrypt)).slice(0, 8)

    return sjcl.codec.hex.toBits(sjcl._decrypt(passKey, slot))
  },

  // A wrapper around encrypt
  _encrypt: function (key, value) {
    return sjcl.encrypt(key, value, this._defaults)
  },

  // A wrapper around decrypt
  _decrypt: function (key, value) {
    return sjcl.decrypt(key, value, this._defaults)
  },

  _iterationCopy: function (src) {
    const target = {}
    for (const prop in src) {
      if (Object.prototype.hasOwnProperty.call(src, prop)) {
        target[prop] = src[prop]
      }
    }
    return target
  },

  _Uint8toHex: function (arr) {
    return sjcl.codec.hex.fromBits(this._convertUint8ArrayToWordArray(arr))
  },

  _Uint8fromHex: function (hex) {
    return this._convertWordArrayToUint8Array(sjcl.codec.hex.toBits(hex))
  },

  _convertWordArrayToUint8Array: function (wordArray) {
    const len = wordArray.length
    const u8Array = new Uint8Array(len << 2)
    let offset = 0; let word; let i

    for (i = 0; i < len; i++) {
      word = wordArray[i]
      u8Array[offset++] = word >> 24
      u8Array[offset++] = (word >> 16) & 0xff
      u8Array[offset++] = (word >> 8) & 0xff
      u8Array[offset++] = word & 0xff
    }
    return u8Array
  },

  _convertUint8ArrayToWordArray: function (u8Array) {
    const words = []; let i = 0; const len = u8Array.length

    while (i < len) {
      words.push(
        (u8Array[i++] << 24) |
                (u8Array[i++] << 16) |
                (u8Array[i++] << 8) |
                (u8Array[i++])
      )
    }

    return words
  }
}
