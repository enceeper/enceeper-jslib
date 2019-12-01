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
    var key, decrypted, categories, category, sharedCategories, mySharedCategory, categorySharedHeader

    categorySharedHeader = '🌐 '
    mySharedCategory = null
    sharedCategories = []
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

        // This is a shared entry, so do not include the category
        if (key.shared) {
          category = categorySharedHeader + 'with ' + key.with

          if (!sharedCategories.includes(category)) {
            sharedCategories.push(category)
            self._mapping['cat_' + category] = []
          }
        } else {
          if (!self._listing.includes(category)) {
            self._listing.push(category)
            self._mapping['cat_' + category] = []
          }
        }

        // Mapping of categories to key indexes
        self._mapping['cat_' + category].push(i)

        // We break as we do not need to loop the categories
        if (key.shared) {
          break
        }
      }

      // Check slots for keys that I have shared with others
      if (!key.shared) {
        for (var k = 0; k < key.slots.length; k++) {
          if (key.slots[k].shared) {
            if (mySharedCategory === null) {
              mySharedCategory = categorySharedHeader + ' with others'
              self._mapping['cat_' + mySharedCategory] = []
            }

            self._mapping['cat_' + mySharedCategory].push(i)

            break
          }
        }
      }

      // Mapping of key_id's to key indexes
      self._mapping['key_' + key.key_id] = i
    }

    self._listing.sort()
    // Now add the shared categories
    if (mySharedCategory !== null) {
      self._listing.push(mySharedCategory)
    }
    if (sharedCategories.length > 0) {
      sharedCategories.sort()
      self._listing = self._listing.concat(sharedCategories)
    }
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
