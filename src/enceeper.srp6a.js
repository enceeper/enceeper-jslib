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
  // eslint-disable-next-line
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

    const client = this._client

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

    const client = this._client

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
