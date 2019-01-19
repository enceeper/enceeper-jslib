//
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Share tests and key values + internal structure
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

var enceeper = require('../dist/enceeper.js')
var key

// --
beforeAll(done => {
  jest.setTimeout(10000)

  global.enc2 = new enceeper.app(global.enceeper.user2, global.enceeper.pass2)
  global.enc2.signin(function (data) {
    key = data.result.keys[0]
    done()
  }, function (status, errorMessage) {
    throw new Error(errorMessage || 'Not defined')
  })
})

describe('perform share actions 1', () => {
  var share

  beforeAll(done => {
    global.enc2.createShare(global.enceeper.user1, key.key_id, function (data) {
      share = data.result.share
      done()
    }, function (status, errorMessage) {
      throw new Error(errorMessage || 'Not defined')
    })
  })

  // Delete created share
  test('delete created share', done => {
    global.enc2.deleteShare(share.share_id, function (data) {
      done()
    }, function (status, errorMessage) {
      throw new Error(errorMessage || 'Not defined')
    })
  })
})

// Login as the third user
describe('perform actions under a third account', () => {
  beforeAll(done => {
    global.enc3 = new enceeper.app(global.enceeper.user3, global.enceeper.pass3)
    global.enc3.signin(function (data) {
      done()
    }, function (status, errorMessage) {
      throw new Error(errorMessage || 'Not defined')
    })
  })

  // We execute this block to perform share specific actions
  describe('perform share actions 2', () => {
    var share, sharedKey

    beforeAll(done => {
      global.enc2.createShare(global.enceeper.user3, key.key_id, function (data) {
        share = data.result.share
        done()
      }, function (status, errorMessage) {
        throw new Error(errorMessage || 'Not defined')
      })
    })

    // Accept share
    test('accept share', done => {
      share.pub = global.enc2._api._crypto._Uint8toHex(global.enc2._api._crypto._keyPair.publicKey)
      global.enc3._shares = [ share ]

      global.enc3.acceptShare(share.share_id, function (data) {
        sharedKey = data.result.key
        done()
      }, function (status, errorMessage) {
        throw new Error(errorMessage || 'Not defined')
      })
    })

    // Finally we delete the slot
    afterAll(done => {
      global.enc3.deleteSlot(sharedKey.key_id, sharedKey.slots[0].slot_id, function (data) {
        done()
      }, function (status, errorMessage) {
        throw new Error(errorMessage || 'Not defined')
      })
    })
  })

  describe('perform share actions 3', () => {
    var share

    beforeAll(done => {
      global.enc2.createShare(global.enceeper.user3, key.key_id, function (data) {
        share = data.result.share
        done()
      }, function (status, errorMessage) {
        throw new Error(errorMessage || 'Not defined')
      })
    })

    // Delete slot as user3
    test('delete share as another user', done => {
      global.enc3._shares = [ share ]
      global.enc3.deleteShare(share.share_id, function (data) {
        done()
      }, function (status, errorMessage) {
        throw new Error(errorMessage || 'Not defined')
      })
    })
  })
})

// --
test('retrieve account keys and test internal structure', done => {
  global.enc2.keys(function (data) {
    var categories, keys, keyMeta, keyValue, firstSlot

    // Test return value
    expect(typeof data.result).toBe('object')
    expect(typeof data.result.keys).toBe('object')
    expect(typeof data.result.shares).toBe('object')

    categories = global.enc2.getCategories()
    keys = global.enc2.getKeys(categories[0])
    keyMeta = global.enc2.getKeyDetails(keys[0].key_id)
    keyValue = global.enc2.getPassword(keys[0].key_id)
    firstSlot = global.enc2.getSlotDetails(keys[0].key_id, -1)

    // Check with the input we have provided on key creation
    expect(categories).toEqual(global.enceeper.keyMeta.c)
    expect(keyMeta).toEqual(keys[0])
    expect(keyMeta.meta).toEqual(global.enceeper.keyMeta)
    expect(keyValue).toEqual(global.enceeper.keyValue)
    expect(firstSlot).toEqual(keys[0].slots[0])

    // Now check the remaining data
    expect(typeof keyMeta.key_id).toBe('number')
    expect(typeof keyMeta.slots).toBe('object')
    expect(keyMeta.slots.length).toBeGreaterThan(0)
    expect(keyMeta.slots[0].slot_id).toBe(-1)

    done()
  }, function (status, errorMessage) {
    throw new Error(errorMessage || 'Not defined')
  })
})
