//
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Our library entry point
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

/* eslint-disable no-eval, new-cap */

'use strict'

var enceeper = {
}

enceeper._isHex = function (h) {
  var re = /[0-9A-Fa-f]*/g
  return re.test(h)
}
//
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Invalid argument and state exceptions
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

function InvalidArgumentException (message) {
  this.message = message
  // Use V8's native method if available, otherwise fallback
  if ('captureStackTrace' in Error) { Error.captureStackTrace(this, InvalidArgumentException) } else { this.stack = (new Error()).stack }
}

InvalidArgumentException.prototype = Object.create(Error.prototype)
InvalidArgumentException.prototype.name = 'InvalidArgumentException'
InvalidArgumentException.prototype.constructor = InvalidArgumentException

function InvalidStateException (message) {
  this.message = message
  // Use V8's native method if available, otherwise fallback
  if ('captureStackTrace' in Error) { Error.captureStackTrace(this, InvalidStateException) } else { this.stack = (new Error()).stack }
}

InvalidStateException.prototype = Object.create(Error.prototype)
InvalidStateException.prototype.name = 'InvalidStateException'
InvalidStateException.prototype.constructor = InvalidStateException
//
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Our basic network library on top of jQuery.ajax
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

// Check our requirements
if (typeof module === 'object') {
  var jQuery = require('jquery')
}

if (typeof enceeper !== 'object') {
  throw new Error('You need to include the enceeper base file!')
}
if (typeof InvalidArgumentException === 'undefined') {
  throw new Error('You need to include the enceeper exceptions JS file!')
}
if (typeof jQuery !== 'function') {
  throw new Error('You need to include the jQuery JS file!')
}

// The basic network library
enceeper.network = function (baseUrl, successCallback, failureCallback) {
  // This is the constructor
  if (typeof baseUrl !== 'string') {
    throw new InvalidArgumentException('The base URL is required and must be a string in order to make HTTP calls.')
  }

  // Auth variables
  this._authHeader = 'X-Enceeper-Auth'
  this._authToken = null

  this._baseUrl = baseUrl
  this._successCallback = successCallback
  this._failureCallback = failureCallback
}

enceeper.network.prototype = {
  call: function (type, url, json, successCallback, failureCallback) {
    var typeUpper = null
    var jsonBody = null
    var self = this
    var requestTypes = ['GET', 'POST', 'PUT', 'DELETE']

    successCallback = successCallback || this._successCallback
    failureCallback = failureCallback || this._failureCallback

    if (typeof type !== 'string') {
      throw new InvalidArgumentException('The type is required and must be a string to make HTTP calls.')
    } else {
      typeUpper = type.toUpperCase()
      if (!requestTypes.includes(typeUpper)) {
        throw new InvalidArgumentException('The type must be one of the following: GET, POST, PUT or DELETE.')
      }

      if (typeUpper === 'POST' || typeUpper === 'PUT') {
        jsonBody = JSON.stringify(json)
      }
    }
    if (typeof url !== 'string') {
      throw new InvalidArgumentException('The URL is required and must be a string in order to make HTTP calls.')
    }
    if ((typeUpper === 'POST' || typeUpper === 'PUT') && typeof json !== 'object') {
      throw new InvalidArgumentException('The JSON is required and must be an object in order to make HTTP calls.')
    }
    if (typeof successCallback !== 'function') {
      throw new InvalidArgumentException('The success callback is required and must be a function to make HTTP calls.')
    }
    if (typeof failureCallback !== 'function') {
      throw new InvalidArgumentException('The failure callback is required and must be a function to make HTTP calls.')
    }

    jQuery.ajax({
      type: type,
      contentType: 'application/json;charset=utf-8',
      beforeSend: function (request) {
        if (self._authToken !== null) {
          request.setRequestHeader(self._authHeader, self._authToken)
        }
      },
      url: this._baseUrl + url,
      data: jsonBody,
      success: function (data, textStatus, jqXHR) {
        successCallback(data)
      },
      error: function (jqXHR, textStatus, errorThrown) {
        var errorMessage

        if (typeof jqXHR.responseJSON !== 'undefined' &&
                        typeof jqXHR.responseJSON.errorMessage !== 'undefined') {
          errorMessage = jqXHR.responseJSON.errorMessage
        } else {
          errorMessage = 'General network error'
        }

        failureCallback(jqXHR.status, errorMessage)
      }
    })
  },

  // Set the auth token
  setAuthToken: function (authToken) {
    if (typeof authToken !== 'string') {
      throw new InvalidArgumentException('The authentication token must be a string.')
    }

    this._authToken = authToken
  },

  // Reset the auth token
  resetAuthToken: function () {
    this._authToken = null
  }
}
//
// SPDX-License-Identifier: GPL-3.0-or-later
//
// A wrapper around the SRP6a library
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

// Check our requirements
if (typeof module === 'object') {
  var jsrp = require('jsrp')
}

if (typeof enceeper !== 'object') {
  throw new Error('You need to include the enceeper base file!')
}
if (typeof InvalidArgumentException === 'undefined') {
  throw new Error('You need to include the enceeper exceptions JS file!')
}
if (typeof jsrp === 'undefined') {
  throw new Error('You need to include the JRSP JS file!')
}

// A wrapper around SRP6a library
enceeper.srp6a = function (email, pass) {
  if (typeof email !== 'string') {
    throw new InvalidArgumentException('You must provide your email for SRP6a authentication.')
  }
  if (typeof pass !== 'string') {
    throw new InvalidArgumentException('You must provide your password for SRP6a authentication.')
  }

  this._client = new jsrp.client()
  this._options = {
    username: email,
    password: pass,
    length: 8192
  }
}

enceeper.srp6a.prototype = {
  register: function (callback) {
    if (typeof callback !== 'function') {
      throw new InvalidArgumentException('The callback is required for returning the SRP6a registration values.')
    }

    var client = this._client

    client.init(this._options, function () {
      client.createVerifier(function (err, result) {
        if (err) throw err

        // result will contain the necessary values the server needs to
        // authenticate this user in the future.
        callback(result.salt, result.verifier)
      })
    })
  },

  step1: function (salt, sPubKey, callback) {
    if (typeof salt !== 'string' || !enceeper._isHex(salt)) {
      throw new InvalidArgumentException('The salt must be a HEX string.')
    }
    if (typeof sPubKey !== 'string' || !enceeper._isHex(sPubKey)) {
      throw new InvalidArgumentException('The server public key B must be a HEX string.')
    }
    if (typeof callback !== 'function') {
      throw new InvalidArgumentException('The callback is required for returning the SRP6a challenge.')
    }

    var client = this._client

    client.init(this._options, function () {
      client.setSalt(salt)
      client.setServerPublicKey(sPubKey)

      // we will send back the client Public Key A and the client Proof M1
      callback(client.getPublicKey(), client.getProof())
    })
  },

  step2: function (m2) {
    if (typeof m2 !== 'string' || !enceeper._isHex(m2)) {
      throw new InvalidArgumentException('The server proof M2 must be a HEX string.')
    }

    return this._client.checkServerProof(m2)
  },

  _hexToBase64: function (hexstring) {
    if (typeof module === 'object') {
      return Buffer.from(hexstring, 'hex').toString('base64')
    } else {
      // eslint-disable-next-line
      return btoa(hexstring.match(/\w{2}/g).map(function (a) {
        return String.fromCharCode(parseInt(a, 16))
      }).join(''))
    }
  }
}
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
  var sjcl = require('sjcl')
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
    var randomKey, keyPair

    // We create a KeyEncryptionKey to easily change the user password
    // and a Public-Private key pair to facilitate key sharing
    randomKey = sjcl.random.randomWords(8)
    keyPair = nacl.box.keyPair()

    return this.returnAccountKeys(randomKey, keyPair)
  },

  returnAccountKeys: function (randomKey, keyPair) {
    var accountKeys

    randomKey = randomKey || this._kek
    keyPair = keyPair || this._keyPair

    if (randomKey === null) {
      throw new InvalidStateException('You must call restoreAccountKeys first.')
    }
    if (keyPair === null) {
      throw new InvalidStateException('You must call restoreAccountKeys first.')
    }

    accountKeys = {
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
    var randomKey, encMeta, encValue

    if (typeof meta !== 'object') {
      throw new InvalidArgumentException('The meta must be a JSON object.')
    }
    if (typeof value !== 'object') {
      throw new InvalidArgumentException('The value must be a JSON object.')
    }

    // Generate a random key to encrypt meta and value
    randomKey = sjcl.random.randomWords(8)
    encMeta = this._encrypt(randomKey, JSON.stringify(meta))
    encValue = this._encrypt(randomKey, JSON.stringify(value))

    return {
      meta: encMeta,
      value: encValue,
      slot: this._addSlot0(randomKey)
    }
  },

  // Restore random key and decrypt input values
  getKey: function (slot0, meta, value) {
    var randomKey; var decMeta = null; var decValue = null

    if (typeof slot0 !== 'string') {
      throw new InvalidArgumentException('You must provide slot 0 and it must be a string to restore the random key.')
    }
    if (meta !== null && typeof meta !== 'string') {
      throw new InvalidArgumentException('If you provide the meta it must be a string for decryption.')
    }
    if (value !== null && typeof value !== 'string') {
      throw new InvalidArgumentException('If you provide the value it must be a string for decryption.')
    }

    randomKey = this._getKeyFromSlot0(slot0)
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
    var randomKey; var result = {}

    if (typeof slot0 !== 'string') {
      throw new InvalidArgumentException('You must provide slot 0 and it must be a string to restore the random key.')
    }
    if (meta !== null && typeof meta !== 'object') {
      throw new InvalidArgumentException('If you provide the meta it must be a JSON object.')
    }
    if (value !== null && typeof value !== 'object') {
      throw new InvalidArgumentException('If you provide the value it must be a JSON object.')
    }

    // Generate a random key to encrypt meta and value
    randomKey = this._getKeyFromSlot0(slot0)
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
    var salt, randomKey, defaults, passKey

    if (typeof slot0 !== 'string') {
      throw new InvalidArgumentException('You must provide slot 0 and it must be a string add a new slot.')
    }
    if (typeof newPass !== 'string') {
      throw new InvalidArgumentException('You must provide your new password for the creation of the new slot.')
    }

    salt = sjcl.random.randomWords(8)
    defaults = this._iterationCopy(this._defaults)
    randomKey = this._getKeyFromSlot0(slot0)
    passKey = sjcl.misc.scrypt(newPass, salt).slice(0, 8)

    // Set the scrypt salt for decryption
    //
    // https://github.com/P-H-C/phc-string-format/blob/master/phc-sf-spec.md
    //
    defaults.scrypt = salt

    return sjcl.encrypt(passKey, sjcl.codec.hex.fromBits(randomKey), defaults)
  },

  createShareSlot: function (slot0, pubKey) {
    var randomKey, salt, slotUint8

    if (this._kek === null) {
      throw new InvalidStateException('You must first restore the Key Encryption Key.')
    }

    if (typeof slot0 !== 'string') {
      throw new InvalidArgumentException('You must provide slot 0 and it must be a string to add a new slot.')
    }
    if (typeof pubKey !== 'string') {
      throw new InvalidArgumentException('You must provide the public key of the recepient.')
    }

    randomKey = this._getKeyFromSlot0(slot0)
    salt = nacl.randomBytes(nacl.secretbox.nonceLength)

    slotUint8 = nacl.box(this._convertWordArrayToUint8Array(randomKey),
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
    var share, randomKey

    if (this._kek === null) {
      throw new InvalidStateException('You must first restore the Key Encryption Key.')
    }

    if (typeof slot !== 'string') {
      throw new InvalidArgumentException('You must provide the slot that holds the shared key.')
    }
    if (typeof pubKey !== 'string') {
      throw new InvalidArgumentException('You must provide the public key of the sender.')
    }

    share = JSON.parse(slot)

    if (share.v === 1) {
      randomKey = nacl.box.open(
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

    var keyMeta = {
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

    var decKey, keyMeta

    decKey = this._decrypt(this._kek, slot)
    keyMeta = JSON.parse(decKey)

    if (keyMeta.v === 1) {
      return sjcl.codec.hex.toBits(keyMeta.key)
    } else {
      throw new InvalidStateException('Unknown version of key meta: ' + keyMeta.v)
    }
  },

  // Check the secondary password against the slot
  _getKeyFromSlotX: function (newPass, slot) {
    var encKey, passKey

    encKey = JSON.parse(slot)
    passKey = sjcl.misc.scrypt(newPass, sjcl.codec.base64.toBits(encKey.scrypt)).slice(0, 8)

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
    var target = {}
    for (var prop in src) {
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
    var len = wordArray.length

    var u8Array = new Uint8Array(len << 2)

    var offset = 0; var word; var i

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
    var words = []; var i = 0; var len = u8Array.length

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
//
// SPDX-License-Identifier: GPL-3.0-or-later
//
// A wrapper around the enceeper service (API calls)
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

// Check our requirements
if (typeof enceeper !== 'object') {
  throw new Error('You need to include the enceeper base file!')
}
if (typeof enceeper.network !== 'function') {
  throw new Error('You need to include the enceeper.network JS file!')
}
if (typeof enceeper.srp6a !== 'function') {
  throw new Error('You need to include the enceeper.srp6a JS file!')
}
if (typeof enceeper.crypto !== 'function') {
  throw new Error('You need to include the enceeper.crypto JS file!')
}
if (typeof ''.normalize !== 'function') {
  throw new Error('You need to include the unorm js file!')
}
if (typeof sjcl !== 'object') {
  throw new Error('You need to include the SJCL JS file!')
}
if (typeof InvalidArgumentException === 'undefined') {
  throw new Error('You need to include the enceeper exceptions JS file!')
}

// A wrapper around the enceeper service
enceeper.api = function (email, pass, successCallback, failureCallback) {
  if (typeof email !== 'string') {
    throw new InvalidArgumentException('You must provide your email.')
  }
  if (typeof pass !== 'string') {
    throw new InvalidArgumentException('You must provide your password.')
  }

  // Consts
  this.baseUrl = 'https://www.enceeper.com/api/v1/'
  this.notificationType = {
    NOTHING: 0,
    REPORT: 1,
    APPROVE: 2
  }
  this.keyStatus = {
    ENABLED: 0,
    DISABLED: 1
  }

  this._email = email
  this._pass = pass.normalize('NFKC')

  // Our libraries
  this._crypto = null // We will instantiate once we are logged
  this._srp6a = new enceeper.srp6a(this._email, this._pass)
  this._network = new enceeper.network(this.baseUrl, successCallback, failureCallback)

  // The callbacks
  this._successCallback = successCallback
  this._failureCallback = failureCallback

  // Internal vars
  this._srp6a_ref = null
  this._srp6a_salt = null
  this._srp6a_B = null
  this._scrypt_salt = null
}

enceeper.api.prototype = {
  test: function (successCallback, failureCallback) {
    successCallback = successCallback || this._successCallback || this._defaultCallback
    failureCallback = failureCallback || this._failureCallback || this._defaultCallback

    this._network.call('GET', '', null, successCallback, failureCallback)
  },

  register: function (successCallback, failureCallback) {
    var self = this

    this._resetState(this)

    successCallback = successCallback || this._successCallback || this._defaultCallback
    failureCallback = failureCallback || this._failureCallback || this._defaultCallback

    this._srp6a.register(function (salt, verifier) {
      var scryptSalt = sjcl.codec.hex.fromBits(sjcl.random.randomWords(8))
      var regCrypto = new enceeper.crypto(self._pass, scryptSalt)

      // If we change scrypt or keys we must update: login, signin and password
      var register = {
        email: self._email,
        auth: {
          srp6a: {
            salt: salt,
            verifier: verifier
          },
          scrypt: {
            salt: scryptSalt
          },
          keys: regCrypto.createAccountKeys()
        }
      }

      self._network.call('POST', 'user', register, successCallback, failureCallback)
    })
  },

  challenge: function (successCallback, failureCallback) {
    var self = this

    if (this._crypto !== null) {
      throw new InvalidStateException('You are already logged in. Please logout first.')
    }
    if (this._srp6a_ref !== null) {
      throw new InvalidStateException('You already have a challenge, try to login or use logout first.')
    }

    successCallback = successCallback || this._successCallback || this._defaultCallback
    failureCallback = failureCallback || this._failureCallback || this._defaultCallback

    this._network.call('POST', 'user/challenge', { email: this._email }, function (data) {
      // First alter our internal state
      self._srp6a_ref = data.result.srp6a.ref
      self._srp6a_salt = data.result.srp6a.salt
      self._srp6a_B = data.result.srp6a.B

      // Then execute the callback
      successCallback(data)
    }, failureCallback)
  },

  login: function (successCallback, failureCallback) {
    var self = this

    if (this._crypto !== null) {
      throw new InvalidStateException('You are already logged in. Please logout first.')
    }
    if (this._srp6a_ref === null) {
      throw new InvalidStateException('You must call challenge first to init the login procedure.')
    }

    successCallback = successCallback || this._successCallback || this._defaultCallback
    failureCallback = failureCallback || this._failureCallback || this._defaultCallback

    this._srp6a.step1(this._srp6a_salt, this._srp6a_B, function (cPubKey, m1) {
      var login = {
        srp6a: {
          A: cPubKey,
          M1: m1,
          ref: self._srp6a_ref
        }
      }

      self._network.call('POST', 'user/login', login, function (data) {
        // Invalidate ref
        self._srp6a_ref = null
        self._srp6a_salt = null
        self._srp6a_B = null

        // Check the server proof and we are done!
        if (!self._srp6a.step2(data.result.srp6a.M2)) {
          failureCallback(500, 'Server authentication failed')
          return
        }

        // Calc crypto key
        self._scrypt_salt = data.result.scrypt.salt
        self._crypto = new enceeper.crypto(self._pass, self._scrypt_salt)
        self._crypto.restoreAccountKeys(data.result.keys)

        // Set authToken to network library
        self._network.setAuthToken(data.result.enceeper.authToken)

        // Then execute the callback
        successCallback(data)
      }, failureCallback)
    })
  },

  signin: function (successCallback, failureCallback) {
    var self = this

    if (this._crypto !== null) {
      throw new InvalidStateException('You are already logged in. Please logout first.')
    }

    successCallback = successCallback || this._successCallback || this._defaultCallback
    failureCallback = failureCallback || this._failureCallback || this._defaultCallback

    this._bundledSRP6a(this, this._srp6a, function (data) {
      // Calc crypto key
      self._scrypt_salt = data.result.scrypt.salt
      self._crypto = new enceeper.crypto(self._pass, self._scrypt_salt)
      self._crypto.restoreAccountKeys(data.result.keys)

      // Set authToken to network library
      self._network.setAuthToken(data.result.enceeper.authToken)

      // Then execute the callback
      successCallback(data)
    }, failureCallback)
  },

  password: function (oldPassword, newPassword, successCallback, failureCallback) {
    var self = this
    var newSRP6a, newCrypto, kek

    if (this._crypto === null) {
      throw new InvalidStateException('You must login first.')
    }

    if (typeof oldPassword !== 'string') {
      throw new InvalidArgumentException('You must provide your current password.')
    }
    if (typeof newPassword !== 'string') {
      throw new InvalidArgumentException('You must provide your new password.')
    }

    // Normalize prior to usage
    oldPassword = oldPassword.normalize('NFKC')
    newPassword = newPassword.normalize('NFKC')

    if (oldPassword !== this._pass) {
      throw new InvalidArgumentException('The current password you have entered is incorrect.')
    }
    if (oldPassword === newPassword) {
      throw new InvalidArgumentException('Your current and new password must be different.')
    }

    successCallback = successCallback || this._successCallback || this._defaultCallback
    failureCallback = failureCallback || this._failureCallback || this._defaultCallback

    // Create the new values
    newSRP6a = new enceeper.srp6a(this._email, newPassword)
    newCrypto = new enceeper.crypto(newPassword, this._scrypt_salt)
    kek = newCrypto.encryptKEK(this._crypto.getKEK())

    newSRP6a.register(function (salt, verifier) {
      var update = {
        srp6a: {
          salt: salt,
          verifier: verifier
        },
        keys: {
          kek: kek
        }
      }

      self._network.call('PUT', 'user', update, function (data) {
        // Chain with challenge and then login
        self._bundledSRP6a(self, newSRP6a, function (data) {
          // Calc crypto key
          self._pass = newPassword
          self._srp6a = newSRP6a
          self._crypto = newCrypto
          self._crypto.restoreAccountKeys(data.result.keys)

          // Set authToken to network library
          self._network.setAuthToken(data.result.enceeper.authToken)

          // Then execute the callback
          successCallback(data)
        }, failureCallback)
      }, failureCallback)
    })
  },

  delete: function (successCallback, failureCallback) {
    var self = this

    if (this._crypto === null) {
      throw new InvalidStateException('You must login first.')
    }

    successCallback = successCallback || this._successCallback || this._defaultCallback
    failureCallback = failureCallback || this._failureCallback || this._defaultCallback

    self._network.call('DELETE', 'user', null, function (data) {
      // Logout
      self._resetState(self)

      successCallback(data)
    }, failureCallback)
  },

  webAuth: function (successCallback, failureCallback) {
    var self = this

    if (this._crypto === null) {
      throw new InvalidStateException('You must login first.')
    }

    successCallback = successCallback || this._successCallback || this._defaultCallback
    failureCallback = failureCallback || this._failureCallback || this._defaultCallback

    self._network.call('GET', 'user/webauth', null, function (data) {
      successCallback(self.baseUrl + 'user/login/' + data.result.token)
    }, failureCallback)
  },

  keys: function (successCallback, failureCallback) {
    if (this._crypto === null) {
      throw new InvalidStateException('You must login first.')
    }

    successCallback = successCallback || this._successCallback || this._defaultCallback
    failureCallback = failureCallback || this._failureCallback || this._defaultCallback

    this._network.call('GET', 'user/keys', null, successCallback, failureCallback)
  },

  addKey: function (meta, value, successCallback, failureCallback) {
    var key

    if (this._crypto === null) {
      throw new InvalidStateException('You must login first.')
    }

    successCallback = successCallback || this._successCallback || this._defaultCallback
    failureCallback = failureCallback || this._failureCallback || this._defaultCallback

    key = this._crypto.createKey(meta, value)

    this._network.call('POST', 'user/keys', key, successCallback, failureCallback)
  },

  deleteKey: function (keyId, successCallback, failureCallback) {
    if (this._crypto === null) {
      throw new InvalidStateException('You must login first.')
    }
    if (typeof keyId !== 'number') {
      throw new InvalidArgumentException('You must provide a valid value for the key Id.')
    }

    successCallback = successCallback || this._successCallback || this._defaultCallback
    failureCallback = failureCallback || this._failureCallback || this._defaultCallback

    this._network.call('DELETE', 'user/keys/' + keyId, null, successCallback, failureCallback)
  },

  updateKey: function (keyId, slot0, meta, value, status, successCallback, failureCallback) {
    var key

    if (this._crypto === null) {
      throw new InvalidStateException('You must login first.')
    }
    if (typeof keyId !== 'number') {
      throw new InvalidArgumentException('You must provide a valid value for the key Id.')
    }
    if (typeof status !== 'number') {
      throw new InvalidArgumentException('You must provide a valid value for the status parameter.')
    }
    if (!this._checkValueInList(status, this.keyStatus)) {
      throw new InvalidArgumentException('You must select one of the available keyStatus values.')
    }

    successCallback = successCallback || this._successCallback || this._defaultCallback
    failureCallback = failureCallback || this._failureCallback || this._defaultCallback

    key = this._crypto.updateKey(slot0, meta, value)
    key.status = status

    this._network.call('PUT', 'user/keys/' + keyId, key, successCallback, failureCallback)
  },

  addSlot: function (keyId, slot0, newPass, notify, successCallback, failureCallback) {
    var key

    if (this._crypto === null) {
      throw new InvalidStateException('You must login first.')
    }
    if (typeof keyId !== 'number') {
      throw new InvalidArgumentException('You must provide a valid value for the key Id.')
    }
    if (typeof notify !== 'number') {
      throw new InvalidArgumentException('You must provide a valid value for the notify parameter.')
    }
    if (!this._checkValueInList(notify, this.notificationType)) {
      throw new InvalidArgumentException('You must select one of the available notificationType values.')
    }

    successCallback = successCallback || this._successCallback || this._defaultCallback
    failureCallback = failureCallback || this._failureCallback || this._defaultCallback

    key = {
      value: this._crypto.addSlot(slot0, newPass),
      notify: notify
    }

    this._network.call('POST', 'user/keys/' + keyId + '/slots', key, successCallback, failureCallback)
  },

  updateSlot: function (keyId, slotId, slot0, newPass, notify, status, successCallback, failureCallback) {
    var key

    if (this._crypto === null) {
      throw new InvalidStateException('You must login first.')
    }
    if (typeof keyId !== 'number') {
      throw new InvalidArgumentException('You must provide a valid value for the key Id.')
    }
    if (typeof slotId !== 'number') {
      throw new InvalidArgumentException('You must provide a valid value for the slot Id.')
    }
    if (typeof notify !== 'number') {
      throw new InvalidArgumentException('You must provide a valid value for the notify parameter.')
    }
    if (!this._checkValueInList(notify, this.notificationType)) {
      throw new InvalidArgumentException('You must select one of the available notificationType values.')
    }
    if (typeof status !== 'number') {
      throw new InvalidArgumentException('You must provide a valid value for the status parameter.')
    }
    if (!this._checkValueInList(status, this.keyStatus)) {
      throw new InvalidArgumentException('You must select one of the available keyStatus values.')
    }

    successCallback = successCallback || this._successCallback || this._defaultCallback
    failureCallback = failureCallback || this._failureCallback || this._defaultCallback

    key = {
      notify: notify,
      status: status
    }

    if (newPass !== null) {
      key.value = this._crypto.addSlot(slot0, newPass)
    }

    this._network.call('PUT', 'user/keys/' + keyId + '/slots/' + slotId, key, successCallback, failureCallback)
  },

  deleteSlot: function (keyId, slotId, successCallback, failureCallback) {
    if (this._crypto === null) {
      throw new InvalidStateException('You must login first.')
    }
    if (typeof keyId !== 'number') {
      throw new InvalidArgumentException('You must provide a valid value for the key Id.')
    }
    if (typeof slotId !== 'number') {
      throw new InvalidArgumentException('You must provide a valid value for the slot Id.')
    }

    successCallback = successCallback || this._successCallback || this._defaultCallback
    failureCallback = failureCallback || this._failureCallback || this._defaultCallback

    this._network.call('DELETE', 'user/keys/' + keyId + '/slots/' + slotId, null, successCallback, failureCallback)
  },

  findUser: function (email, successCallback, failureCallback) {
    if (this._crypto === null) {
      throw new InvalidStateException('You must login first.')
    }
    if (typeof email !== 'string') {
      throw new InvalidArgumentException('You must provide the email of the user to share with.')
    }

    successCallback = successCallback || this._successCallback || this._defaultCallback
    failureCallback = failureCallback || this._failureCallback || this._defaultCallback

    this._network.call('POST', 'user/search', { email: email }, successCallback, failureCallback)
  },

  createShare: function (keyId, slot0, email, pubKey, successCallback, failureCallback) {
    var share

    if (this._crypto === null) {
      throw new InvalidStateException('You must login first.')
    }
    if (typeof keyId !== 'number') {
      throw new InvalidArgumentException('You must provide a valid value for the key Id.')
    }
    if (typeof email !== 'string') {
      throw new InvalidArgumentException('You must provide the email of the user to share with.')
    }

    share = {
      email: email,
      slot: this._crypto.createShareSlot(slot0, pubKey)
    }

    successCallback = successCallback || this._successCallback || this._defaultCallback
    failureCallback = failureCallback || this._failureCallback || this._defaultCallback

    this._network.call('POST', 'user/keys/' + keyId + '/share', share, successCallback, failureCallback)
  },

  deleteShare: function (shareId, successCallback, failureCallback) {
    if (this._crypto === null) {
      throw new InvalidStateException('You must login first.')
    }
    if (typeof shareId !== 'number') {
      throw new InvalidArgumentException('You must provide a valid value for the share Id.')
    }

    successCallback = successCallback || this._successCallback || this._defaultCallback
    failureCallback = failureCallback || this._failureCallback || this._defaultCallback

    this._network.call('DELETE', 'user/keys/shares/' + shareId, null, successCallback, failureCallback)
  },

  acceptShare: function (shareId, slot, pubKey, successCallback, failureCallback) {
    if (this._crypto === null) {
      throw new InvalidStateException('You must login first.')
    }
    if (typeof shareId !== 'number') {
      throw new InvalidArgumentException('You must provide a valid value for the share Id.')
    }

    successCallback = successCallback || this._successCallback || this._defaultCallback
    failureCallback = failureCallback || this._failureCallback || this._defaultCallback

    this._network.call('POST', 'user/keys/shares/' + shareId, {
      slot: this._crypto.acceptShareSlot(slot, pubKey)
    }, successCallback, failureCallback)
  },

  logout: function () {
    this._srp6a_ref = null
    this._resetState(this)
  },

  _defaultCallback: function () {
    throw new InvalidArgumentException('You must provide callbacks during object creation or when calling a method.')
  },

  _resetState: function (self) {
    self._crypto = null
    self._srp6a = new enceeper.srp6a(self._email, self._pass)
    self._network.resetAuthToken()
  },

  _checkValueInList: function (value, list) {
    var found, singleValue

    found = false
    for (var index in list) {
      singleValue = list[index]

      if (value === singleValue) {
        found = true
        break
      }
    }

    return found
  },

  _bundledSRP6a: function (self, srp6a, successCallback, failureCallback) {
    // Using from self: _network and _email
    self._network.call('POST', 'user/challenge', { email: self._email }, function (dataStep1) {
      srp6a.step1(dataStep1.result.srp6a.salt, dataStep1.result.srp6a.B, function (cPubKey, m1) {
        var login = {
          srp6a: {
            A: cPubKey,
            M1: m1,
            ref: dataStep1.result.srp6a.ref
          }
        }

        self._network.call('POST', 'user/login', login, function (dataStep2) {
          // Check the server proof and we are done!
          if (!srp6a.step2(dataStep2.result.srp6a.M2)) {
            failureCallback(500, 'Server authentication failed')
            return
          }

          successCallback(dataStep2)
        }, failureCallback)
      })
    }, failureCallback)
  }
}
//
// SPDX-License-Identifier: GPL-3.0-or-later
//
// A wrapper around the common functionality of the Enceeper App
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

if (typeof enceeper.api !== 'function') {
  throw new Error('You need to include the enceeper.api JS file!')
}

// A wrapper around the common functionality of the Enceeper App
enceeper.app = function (email, pass, successCallback, failureCallback) {
  // Original values to be used for caching
  this._accountKeys = null
  this._data = null
  // The internal structures
  this._keys = null
  this._shares = null
  this._plan = null
  // For re-auth
  this._method = null
  this._arguments = null
  // The internal structure
  this._listing = null
  this._mapping = null
  // Search helpers
  this._searchChangeTimer = null
  this._eventHandlingDelay = 100
  // The actual API calls
  this._api = new enceeper.api(email, pass, successCallback, failureCallback)
}

enceeper.app.prototype = {
  register: function (successCallback, failureCallback) {
    this._api.register(successCallback, failureCallback)
  },

  signin: function (successCallback, failureCallback) {
    var self = this

    successCallback = successCallback || self._api._successCallback || self._api._defaultCallback
    failureCallback = failureCallback || self._api._failureCallback || self._api._defaultCallback

    self._api.signin(function (data) {
      // Store the plan
      self._plan = data.result.enceeper.plan
      // Store the account keys
      self._accountKeys = data.result.keys

      // We are OK, get the keys
      self._api.keys(function (data) {
        // Store the keys
        self._setKeys(data.result, self)

        // Then execute the callback
        successCallback(data)
      }, failureCallback)
    }, failureCallback)
  },

  logout: function () {
    this._keys = null
    this._shares = null
    this._listing = null
    this._mapping = null

    this._api.logout()
  },

  password: function (oldPassword, newPassword, successCallback, failureCallback, ref) {
    // -- block to allow reauth
    var self = ref || this

    self._method = 'password'
    self._arguments = arguments
    if (ref) {
      delete self._arguments[self._arguments.length - 1]
      self._arguments.length--
    }

    successCallback = successCallback || self._api._successCallback || self._api._defaultCallback
    failureCallback = failureCallback || self._api._failureCallback || self._api._defaultCallback
    // -- end of block

    self._api.password(oldPassword, newPassword, function (data) {
      // First store the new account keys
      self._accountKeys = data.result.keys
      // Then execute the callback
      successCallback(data)
    }, function (status, errorMessage) {
      self._checkAndReAuth(self, status, errorMessage, successCallback, failureCallback)
    })
  },

  delete: function (successCallback, failureCallback, ref) {
    // -- block to allow reauth
    var self = ref || this

    self._method = 'delete'
    self._arguments = arguments
    if (ref) {
      delete self._arguments[self._arguments.length - 1]
      self._arguments.length--
    }

    successCallback = successCallback || self._api._successCallback || self._api._defaultCallback
    failureCallback = failureCallback || self._api._failureCallback || self._api._defaultCallback
    // -- end of block

    self._api.delete(successCallback, function (status, errorMessage) {
      self._checkAndReAuth(self, status, errorMessage, successCallback, failureCallback)
    })
  },

  webAuth: function (successCallback, failureCallback, ref) {
    // -- block to allow reauth
    var self = ref || this

    self._method = 'webAuth'
    self._arguments = arguments
    if (ref) {
      delete self._arguments[self._arguments.length - 1]
      self._arguments.length--
    }

    successCallback = successCallback || self._api._successCallback || self._api._defaultCallback
    failureCallback = failureCallback || self._api._failureCallback || self._api._defaultCallback
    // -- end of block

    self._api.webAuth(successCallback, function (status, errorMessage) {
      self._checkAndReAuth(self, status, errorMessage, successCallback, failureCallback)
    })
  },

  keys: function (successCallback, failureCallback, ref) {
    // -- block to allow reauth
    var self = ref || this

    self._method = 'keys'
    self._arguments = arguments
    if (ref) {
      delete self._arguments[self._arguments.length - 1]
      self._arguments.length--
    }

    successCallback = successCallback || self._api._successCallback || self._api._defaultCallback
    failureCallback = failureCallback || self._api._failureCallback || self._api._defaultCallback
    // -- end of block

    self._api.keys(function (data) {
      // Store the keys
      self._setKeys(data.result, self)

      // Then execute the callback
      successCallback(data)
    }, function (status, errorMessage) {
      self._checkAndReAuth(self, status, errorMessage, successCallback, failureCallback)
    })
  },

  // Create a cache structure
  getForCache: function () {
    var cache

    if (this._api._crypto === null) {
      throw new InvalidStateException('You must login in order to create a fresh cache structure.')
    }

    cache = {
      v: 1,
      scrypt: {
        salt: this._api._scrypt_salt
      },
      accountKeys: this._accountKeys,
      userData: this._data
    }

    return cache
  },

  // Restore the data from the cache
  restoreCache: function (cache) {
    if (typeof cache !== 'object') {
      throw new InvalidArgumentException('You must provide an object to the restoreCache function.')
    }
    if (typeof cache.v !== 'number') {
      throw new InvalidArgumentException('The cache version is not a number.')
    }

    if (cache.v === 1) {
      if (typeof cache.scrypt === 'undefined' || typeof cache.scrypt.salt !== 'string') {
        throw new InvalidArgumentException('The cache object must have a hex representation of the scrypt salt.')
      }
      if (typeof cache.accountKeys !== 'object') {
        throw new InvalidArgumentException('The cache object must have a account keys object.')
      }
      if (typeof cache.userData !== 'object') {
        throw new InvalidArgumentException('The cache object must contain the user data (keys and shares).')
      }
    } else {
      throw new InvalidArgumentException('Unknown version number found in cache: ' + cache.v)
    }

    // Restore the scrypt salt
    this._api._scrypt_salt = cache.scrypt.salt
    // Initiate crypto
    this._api._crypto = new enceeper.crypto(this._api._pass, this._api._scrypt_salt)
    // Restore account keys
    this._api._crypto.restoreAccountKeys(cache.accountKeys)
    // Restore shares and keys from the cache
    this._setKeys(cache.userData)
  },

  // Get the calculated categories
  getCategories: function () {
    return this._listing
  },

  // Get the keys of the provided category
  getKeys: function (category) {
    var keys = []

    if (typeof category !== 'string') {
      throw new InvalidArgumentException('You must provide the category.')
    }
    if (typeof this._mapping['cat_' + category] === 'undefined') {
      throw new InvalidArgumentException('Could not locate the provided category: ' + category + '.')
    }

    for (var i = 0; i < this._mapping['cat_' + category].length; i++) {
      keys.push(this._keys[this._mapping['cat_' + category][i]])
    }

    return keys
  },

  // Get the keys of the provided keywords
  search: function (keywords, callback) {
    var self = this

    if (typeof keywords !== 'string') {
      throw new InvalidArgumentException('You must provide the keywords string.')
    }
    if (typeof callback !== 'function') {
      throw new InvalidArgumentException('You must provide a callback for the search results.')
    }

    clearTimeout(this._searchChangeTimer)

    this._searchChangeTimer = setTimeout(function () {
      // Get and send the results
      callback(self._getSearchResults(keywords, self))
    }, this._eventHandlingDelay)
  },

  // Internal search functionality
  _getSearchResults: function (keywords, self) {
    var BreakException = {}
    var noSearchPerformed = false
    var foundKeys = []
    var keywordArray = keywords.trim().toLowerCase().split(/\s+/)

    if (self._keys !== null) {
      noSearchPerformed = true
      self._keys.forEach(function (singleKey) {
        var inKeyWords = []

        if (singleKey.meta.v === 1) {
          inKeyWords = []

          // We require the categories to be a string or an array
          if (self._stringNotEmpty(singleKey.meta.c)) {
            inKeyWords.push(singleKey.meta.c)
          } else if (Array.isArray(singleKey.meta.c)) {
            inKeyWords = singleKey.meta.c.slice()
          }

          // The rest are not
          if (self._stringNotEmpty(singleKey.meta.u)) {
            inKeyWords.push(singleKey.meta.u)
          }
          if (self._stringNotEmpty(singleKey.meta.t)) {
            inKeyWords.push(singleKey.meta.t)
          }
          if (self._stringNotEmpty(singleKey.meta.l)) {
            inKeyWords.push(singleKey.meta.l)
          }
          // Finally the notes
          if (self._stringNotEmpty(singleKey.meta.n)) {
            inKeyWords = inKeyWords.concat(singleKey.meta.n.trim().split(/\s+/))
          }
        }

        try {
          inKeyWords.forEach(function (value) {
            var inKeyWord = value.toLowerCase()

            keywordArray.forEach(function (keyword) {
              noSearchPerformed = false

              if (inKeyWord.search(keyword) !== -1) {
                foundKeys.push(singleKey)
                throw BreakException
              }
            })
          })
        } catch (e) {
          if (e !== BreakException) throw e
        }
      })
    }

    if (noSearchPerformed) {
      foundKeys = self._keys
    }

    return foundKeys
  },

  // Check if a string is empty
  _stringNotEmpty: function (str) {
    if (typeof str !== 'string') {
      return false
    }
    return (str.trim().length !== 0)
  },

  // Get the key details provided the keyId
  getKeyDetails: function (keyId) {
    if (typeof keyId !== 'number') {
      throw new InvalidArgumentException('You must provide the keyId.')
    }
    if (typeof this._mapping['key_' + keyId] === 'undefined') {
      throw new InvalidArgumentException('Could not locate the provided keyId: ' + keyId + '.')
    }

    return this._keys[this._mapping['key_' + keyId]]
  },

  // Get the slot details provided the keyId and slotId
  getSlotDetails: function (keyId, slotId) {
    var slotIndex

    if (typeof keyId !== 'number') {
      throw new InvalidArgumentException('You must provide the keyId.')
    }
    if (typeof this._mapping['key_' + keyId] === 'undefined') {
      throw new InvalidArgumentException('Could not locate the provided keyId: ' + keyId + '.')
    }
    if (typeof slotId !== 'number') {
      throw new InvalidArgumentException('You must provide the slotId.')
    }
    slotIndex = this._findSlotIndex(this._keys[this._mapping['key_' + keyId]].slots, slotId)
    if (slotIndex === -1) {
      throw new InvalidArgumentException('Could not locate the provided slotId: ' + slotId + ' for keyId: ' + keyId + '.')
    }

    return this._keys[this._mapping['key_' + keyId]].slots[slotIndex]
  },

  // Get the key password provided the keyId
  getPassword: function (keyId) {
    var key, decryptedKey

    if (typeof keyId !== 'number') {
      throw new InvalidArgumentException('You must provide the keyId.')
    }
    if (typeof this._mapping['key_' + keyId] === 'undefined') {
      throw new InvalidArgumentException('Could not locate the provided keyId: ' + keyId + '.')
    }

    key = this._keys[this._mapping['key_' + keyId]]
    decryptedKey = this._api._crypto.getKey(key.slots[0].value, null, key.value)

    return decryptedKey.value
  },

  addKey: function (meta, value, successCallback, failureCallback, ref) {
    // -- block to allow reauth
    var self = ref || this

    self._method = 'addKey'
    self._arguments = arguments
    if (ref) {
      delete self._arguments[self._arguments.length - 1]
      self._arguments.length--
    }

    successCallback = successCallback || self._api._successCallback || self._api._defaultCallback
    failureCallback = failureCallback || self._api._failureCallback || self._api._defaultCallback
    // -- end of block

    self._api.addKey(meta, value, function (data) {
      // Store the new key
      self._keys.push(data.result.key)

      self._createInternalStructure(self)

      // Then execute the callback
      successCallback(data)
    }, function (status, errorMessage) {
      self._checkAndReAuth(self, status, errorMessage, successCallback, failureCallback)
    })
  },

  deleteKey: function (keyId, successCallback, failureCallback, ref) {
    // -- block to allow reauth
    var self = ref || this

    self._method = 'deleteKey'
    self._arguments = arguments
    if (ref) {
      delete self._arguments[self._arguments.length - 1]
      self._arguments.length--
    }

    successCallback = successCallback || self._api._successCallback || self._api._defaultCallback
    failureCallback = failureCallback || self._api._failureCallback || self._api._defaultCallback
    // -- end of block

    if (typeof keyId !== 'number') {
      throw new InvalidArgumentException('You must provide the keyId.')
    }
    if (typeof self._mapping['key_' + keyId] === 'undefined') {
      throw new InvalidArgumentException('Could not locate the provided keyId: ' + keyId + '.')
    }

    self._api.deleteKey(keyId, function (data) {
      // Remove the deleted key
      self._keys.splice(self._mapping['key_' + keyId], 1)
      // Remove the deleted key from the shares
      for (var i = 0; i < self._shares.length; i++) {
        if (self._shares[i].key_id === keyId) {
          self._shares.splice(i, 1)
          break
        }
      }

      self._createInternalStructure(self)

      // Then execute the callback
      successCallback(data)
    }, function (status, errorMessage) {
      self._checkAndReAuth(self, status, errorMessage, successCallback, failureCallback)
    })
  },

  updateKey: function (keyId, meta, value, status, successCallback, failureCallback, ref) {
    // -- block to allow reauth
    var self = ref || this

    self._method = 'updateKey'
    self._arguments = arguments
    if (ref) {
      delete self._arguments[self._arguments.length - 1]
      self._arguments.length--
    }

    successCallback = successCallback || self._api._successCallback || self._api._defaultCallback
    failureCallback = failureCallback || self._api._failureCallback || self._api._defaultCallback
    // -- end of block

    if (typeof keyId !== 'number') {
      throw new InvalidArgumentException('You must provide the keyId.')
    }
    if (typeof self._mapping['key_' + keyId] === 'undefined') {
      throw new InvalidArgumentException('Could not locate the provided keyId: ' + keyId + '.')
    }

    self._api.updateKey(keyId, self._keys[self._mapping['key_' + keyId]].slots[0].value, meta, value, status, function (data) {
      // Update the key contents
      self._keys[self._mapping['key_' + keyId]] = data.result.key

      self._createInternalStructure(self)

      // Then execute the callback
      successCallback(data)
    }, function (status, errorMessage) {
      self._checkAndReAuth(self, status, errorMessage, successCallback, failureCallback)
    })
  },

  addSlot: function (keyId, newPass, notify, successCallback, failureCallback, ref) {
    // -- block to allow reauth
    var self = ref || this

    self._method = 'addSlot'
    self._arguments = arguments
    if (ref) {
      delete self._arguments[self._arguments.length - 1]
      self._arguments.length--
    }

    successCallback = successCallback || self._api._successCallback || self._api._defaultCallback
    failureCallback = failureCallback || self._api._failureCallback || self._api._defaultCallback
    // -- end of block

    if (typeof keyId !== 'number') {
      throw new InvalidArgumentException('You must provide the keyId.')
    }
    if (typeof self._mapping['key_' + keyId] === 'undefined') {
      throw new InvalidArgumentException('Could not locate the provided keyId: ' + keyId + '.')
    }

    self._api.addSlot(keyId, self._keys[self._mapping['key_' + keyId]].slots[0].value, newPass, notify, function (data) {
      // Update the key contents
      self._keys[self._mapping['key_' + keyId]] = data.result.key

      self._createInternalStructure(self)

      // Then execute the callback
      successCallback(data)
    }, function (status, errorMessage) {
      self._checkAndReAuth(self, status, errorMessage, successCallback, failureCallback)
    })
  },

  updateSlot: function (keyId, slotId, newPass, notify, status, successCallback, failureCallback, ref) {
    var slotIndex

    // -- block to allow reauth
    var self = ref || this

    self._method = 'updateSlot'
    self._arguments = arguments
    if (ref) {
      delete self._arguments[self._arguments.length - 1]
      self._arguments.length--
    }

    successCallback = successCallback || self._api._successCallback || self._api._defaultCallback
    failureCallback = failureCallback || self._api._failureCallback || self._api._defaultCallback
    // -- end of block

    if (typeof keyId !== 'number') {
      throw new InvalidArgumentException('You must provide the keyId.')
    }
    if (typeof self._mapping['key_' + keyId] === 'undefined') {
      throw new InvalidArgumentException('Could not locate the provided keyId: ' + keyId + '.')
    }
    if (typeof slotId !== 'number') {
      throw new InvalidArgumentException('You must provide the slotId.')
    }
    slotIndex = self._findSlotIndex(self._keys[self._mapping['key_' + keyId]].slots, slotId)
    if (slotIndex === -1) {
      throw new InvalidArgumentException('Could not locate the provided slotId: ' + slotId + ' for keyId: ' + keyId + '.')
    }
    if (self._keys[self._mapping['key_' + keyId]].slots[slotIndex].shared) {
      throw new InvalidArgumentException('You cannot update a shared slot, you can only use it or delete it.')
    }

    self._api.updateSlot(keyId, slotId, self._keys[self._mapping['key_' + keyId]].slots[0].value, newPass, notify, status, function (data) {
      // Update the key contents
      self._keys[self._mapping['key_' + keyId]] = data.result.key

      self._createInternalStructure(self)

      // Then execute the callback
      successCallback(data)
    }, function (status, errorMessage) {
      self._checkAndReAuth(self, status, errorMessage, successCallback, failureCallback)
    })
  },

  deleteSlot: function (keyId, slotId, successCallback, failureCallback, ref) {
    var slotIndex

    // -- block to allow reauth
    var self = ref || this

    self._method = 'deleteSlot'
    self._arguments = arguments
    if (ref) {
      delete self._arguments[self._arguments.length - 1]
      self._arguments.length--
    }

    successCallback = successCallback || self._api._successCallback || self._api._defaultCallback
    failureCallback = failureCallback || self._api._failureCallback || self._api._defaultCallback
    // -- end of block

    if (typeof keyId !== 'number') {
      throw new InvalidArgumentException('You must provide the keyId.')
    }
    if (typeof self._mapping['key_' + keyId] === 'undefined') {
      throw new InvalidArgumentException('Could not locate the provided keyId: ' + keyId + '.')
    }
    if (typeof slotId !== 'number') {
      throw new InvalidArgumentException('You must provide the slotId.')
    }
    slotIndex = self._findSlotIndex(self._keys[self._mapping['key_' + keyId]].slots, slotId)
    if (slotIndex === -1) {
      throw new InvalidArgumentException('Could not locate the provided slotId: ' + slotId + ' for keyId: ' + keyId + '.')
    }

    self._api.deleteSlot(keyId, slotId, function (data) {
      // Remove the deleted slot
      self._keys[self._mapping['key_' + keyId]].slots.splice(slotIndex, 1)
      // If not slots remain remove key entry (this is for shared keys)
      if (self._keys[self._mapping['key_' + keyId]].slots.length === 0) {
        self._keys.splice(self._mapping['key_' + keyId], 1)
        self._createInternalStructure(self)
      }

      // Then execute the callback
      successCallback(data)
    }, function (status, errorMessage) {
      self._checkAndReAuth(self, status, errorMessage, successCallback, failureCallback)
    })
  },

  createShare: function (email, keyId, successCallback, failureCallback, ref) {
    // -- block to allow reauth
    var self = ref || this

    self._method = 'createShare'
    self._arguments = arguments
    if (ref) {
      delete self._arguments[self._arguments.length - 1]
      self._arguments.length--
    }

    successCallback = successCallback || self._api._successCallback || self._api._defaultCallback
    failureCallback = failureCallback || self._api._failureCallback || self._api._defaultCallback
    // -- end of block

    if (typeof keyId !== 'number') {
      throw new InvalidArgumentException('You must provide the keyId.')
    }
    if (typeof self._mapping['key_' + keyId] === 'undefined') {
      throw new InvalidArgumentException('Could not locate the provided keyId: ' + keyId + '.')
    }

    self._api.findUser(email, function (data) {
      self._api.createShare(keyId, self._keys[self._mapping['key_' + keyId]].slots[0].value, email, data.result.sharePubKey, function (data) {
        // Store the new share
        self._shares.push(data.result.share)

        // Then execute the callback
        successCallback(data)
      }, function (status, errorMessage) {
        self._checkAndReAuth(self, status, errorMessage, successCallback, failureCallback)
      })
    }, function (status, errorMessage) {
      self._checkAndReAuth(self, status, errorMessage, successCallback, failureCallback)
    })
  },

  deleteShare: function (shareId, successCallback, failureCallback, ref) {
    var shareIndex

    // -- block to allow reauth
    var self = ref || this

    self._method = 'deleteShare'
    self._arguments = arguments
    if (ref) {
      delete self._arguments[self._arguments.length - 1]
      self._arguments.length--
    }

    successCallback = successCallback || self._api._successCallback || self._api._defaultCallback
    failureCallback = failureCallback || self._api._failureCallback || self._api._defaultCallback
    // -- end of block

    if (typeof shareId !== 'number') {
      throw new InvalidArgumentException('You must provide the shareId.')
    }
    shareIndex = self._findShareIndex(self._shares, shareId)
    if (shareIndex === -1) {
      throw new InvalidArgumentException('Could not locate the provided shareId: ' + shareId + '.')
    }

    self._api.deleteShare(shareId, function (data) {
      // Remove the deleted share
      self._shares.splice(shareIndex, 1)

      // Then execute the callback
      successCallback(data)
    }, function (status, errorMessage) {
      self._checkAndReAuth(self, status, errorMessage, successCallback, failureCallback)
    })
  },

  acceptShare: function (shareId, successCallback, failureCallback, ref) {
    var shareIndex

    // -- block to allow reauth
    var self = ref || this

    self._method = 'acceptShare'
    self._arguments = arguments
    if (ref) {
      delete self._arguments[self._arguments.length - 1]
      self._arguments.length--
    }

    successCallback = successCallback || self._api._successCallback || self._api._defaultCallback
    failureCallback = failureCallback || self._api._failureCallback || self._api._defaultCallback
    // -- end of block

    if (typeof shareId !== 'number') {
      throw new InvalidArgumentException('You must provide the shareId.')
    }
    shareIndex = self._findShareIndex(self._shares, shareId)
    if (shareIndex === -1) {
      throw new InvalidArgumentException('Could not locate the provided shareId: ' + shareId + '.')
    }
    if (self._shares[shareIndex].pub === null) {
      throw new InvalidArgumentException('You cannot accept the shares that you have created.')
    }

    self._api.acceptShare(shareId, self._shares[shareIndex].slot, self._shares[shareIndex].pub, function (data) {
      // Remove the accepted share
      self._shares.splice(shareIndex, 1)
      // Store the new key
      self._keys.push(data.result.key)

      self._createInternalStructure(self)

      // Then execute the callback
      successCallback(data)
    }, function (status, errorMessage) {
      self._checkAndReAuth(self, status, errorMessage, successCallback, failureCallback)
    })
  },

  // Set the keys to create the internal structure (ie. using cache)
  _setKeys: function (data, ref) {
    var self = ref || this

    // Clone object (to store it intact in cache)
    // ->
    // This is called in signin and keys, so any changes between
    // re-sync (add, delete, update) will not be available
    // <-
    self._data = JSON.parse(JSON.stringify(data))

    // Assign values
    self._keys = data.keys
    self._shares = data.shares

    self._createInternalStructure(self)
  },

  _findShareIndex: function (shares, shareId) {
    var ret = -1

    for (var i = 0; i < shares.length; i++) {
      if (shares[i].share_id === shareId) {
        ret = i
        break
      }
    }

    return ret
  },

  _findSlotIndex: function (slots, slotId) {
    var ret = -1

    for (var i = 0; i < slots.length; i++) {
      if (slots[i].slot_id === slotId) {
        ret = i
        break
      }
    }

    return ret
  },

  _createInternalStructure: function (self) {
    var key, decrypted, categories, category

    self._listing = []
    self._mapping = {}

    // Init null to empty array
    if (self._keys === null) {
      self._keys = []
    }
    if (self._shares === null) {
      self._shares = []
    }

    for (var i = 0; i < self._keys.length; i++) {
      key = self._keys[i]

      if (typeof key.meta === 'string') {
        decrypted = self._api._crypto.getKey(key.slots[0].value, key.meta, null)
        key.meta = decrypted.meta
      }

      if (typeof key.meta.c === 'string') {
        categories = [key.meta.c]
      } else {
        categories = key.meta.c
      }

      var arrayLength = categories.length
      for (var j = 0; j < arrayLength; j++) {
        category = categories[j]

        if (category.length === 0) {
          continue
        }

        if (!self._listing.includes(category)) {
          self._listing.push(category)
          self._mapping['cat_' + category] = []
        }

        // Mapping of categories to key indexes
        self._mapping['cat_' + category].push(i)
      }

      // Mapping of key_id's to key indexes
      self._mapping['key_' + key.key_id] = i
    }

    self._listing.sort()
  },

  _checkAndReAuth: function (self, status, errorMessage, successCallback, failureCallback) {
    if (status === 401 || status === 403) {
      var args = ''
      for (var i = 0; i < self._arguments.length; i++) {
        // if ( typeof self._arguments[i] === 'function' )
        //    args += self._arguments[i].name + ', ';
        if (typeof self._arguments[i] === 'number') {
          args += self._arguments[i] + ', '
        } else if (typeof self._arguments[i] === 'string') {
          args += '"' + self._arguments[i] + '", '
        } else if (typeof self._arguments[i] === 'object') {
          args += JSON.stringify(self._arguments[i]) + ', '
        }
      }
      args += 'successCallback, failureCallback, self'

      self._api.logout()

      self._api.signin(function (data) {
        // Store the plan
        self._plan = data.result.enceeper.plan

        eval('self.' + self._method + '(' + args + ')')
      }, failureCallback)
    } else {
      failureCallback(status, errorMessage)
    }
  }
}

if (typeof module === 'object') {
  module.exports = enceeper
}
