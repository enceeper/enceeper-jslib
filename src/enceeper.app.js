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
  this._keys = null
  this._shares = null
  this._plan = null
  // For re-auth
  this._method = null
  this._arguments = null
  // The internal structure
  this._listing = null
  this._mapping = null
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

      // We are OK, get the keys
      self._api.keys(function (data) {
        // Store the keys
        self.setKeys(data, self)

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

    self._api.password(oldPassword, newPassword, successCallback, function (status, errorMessage) {
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
      self.setKeys(data, self)

      // Then execute the callback
      successCallback(data)
    }, function (status, errorMessage) {
      self._checkAndReAuth(self, status, errorMessage, successCallback, failureCallback)
    })
  },

  // Set the cached data
  setCache: function (scryptSalt, keys, data) {
    this._api._crypto = new enceeper.crypto(this._api._pass, scryptSalt)
    this._api._crypto.restoreAccountKeys(keys)
    this.setKeys(data)
  },

  // Set the keys to create the internal structure (ie. using cache)
  setKeys: function (data, ref) {
    var self = ref || this

    self._keys = data.result.keys
    self._shares = data.result.shares

    self._createInternalStructure(self)
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
        categories = [ key.meta.c ]
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
    if (status === 403) {
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
