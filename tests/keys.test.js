//
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Keys tests
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

// --
beforeAll(done => {
  jest.setTimeout(10000)

  global.enc1 = new enceeper.app(global.enceeper.user1, global.enceeper.pass1)

  // The signin procedure (when calling internally keys)
  // will delete all user keys and shares
  global.enc1.signin(function () {
    done()
  }, function (status, errorMessage) {
    throw new Error(errorMessage || 'Not defined')
  })
})

// --
test('that we are not allowed to delete the account', done => {
  global.enc1.delete(function () {
    throw new Error('Managed to delete the test account')
  }, function (status, errorMessage) {
    if (status === 418) {
      done()
    } else {
      throw new Error(errorMessage || 'Not defined')
    }
  })
})

// --
test('that we cannot change the user password', done => {
  global.enc1.password(global.enceeper.pass1, 'newPassword', function () {
    throw new Error('Managed to update the password of the test account')
  }, function (status, errorMessage) {
    if (status === 418) {
      done()
    } else {
      throw new Error(errorMessage || 'Not defined')
    }
  })
})

describe('perform key actions (keys and slots)', () => {
  var key

  // Before we start create the key
  beforeAll(done => {
    global.enc1.addKey(global.enceeper.keyMeta, global.enceeper.keyValue, function (data) {
      key = data.result.key
      done()
    }, function (status, errorMessage) {
      throw new Error(errorMessage || 'Not defined')
    })
  })

  // We execute this block to perform slot specific actions
  describe('perform slot actions', () => {
    // First we create a new slot
    beforeAll(done => {
      global.enc1.addSlot(key.key_id, 'slotPass', 0, function (data) {
        key = data.result.key
        done()
      }, function (status, errorMessage) {
        throw new Error(errorMessage || 'Not defined')
      })
    })

    // Fetch key contents
    test('retrieve slot externally', done => {
      var encdummy = new enceeper.app('dummy', 'dummy')

      encdummy._api._network.call('GET', 'user/slots/' + key.slots[1].identifier, null, function () {
        done()
      }, function (status, errorMessage) {
        throw new Error(errorMessage || 'Not defined')
      })
    })

    // Update slot - disable
    test('update existing slot', done => {
      global.enc1.updateSlot(key.key_id, key.slots[1].slot_id, 'newSlotPass', 0, 1, function (data) {
        done()
      }, function (status, errorMessage) {
        throw new Error(errorMessage || 'Not defined')
      })
    })

    // Fetch contents should fail
    test('retrieve disabled slot externally', done => {
      var encdummy = new enceeper.app('dummy', 'dummy')

      encdummy._api._network.call('GET', 'user/slots/' + key.slots[1].identifier, null, function () {
        throw new Error('Managed to retrieve disabled slot')
      }, function (status, errorMessage) {
        done()
      })
    })

    // Finally we delete the slot
    afterAll(done => {
      global.enc1.deleteSlot(key.key_id, key.slots[1].slot_id, function (data) {
        done()
      }, function (status, errorMessage) {
        throw new Error(errorMessage || 'Not defined')
      })
    })
  })

  // Update key
  test('update the key', done => {
    global.enc1.updateKey(key.key_id, global.enceeper.keyMeta, global.enceeper.keyValue, 1, function (data) {
      done()
    }, function (status, errorMessage) {
      throw new Error(errorMessage || 'Not defined')
    })
  })

  // After we have finished delete the key
  afterAll(done => {
    global.enc1.deleteKey(key.key_id, function (data) {
      done()
    }, function (status, errorMessage) {
      throw new Error(errorMessage || 'Not defined')
    })
  })
})

afterAll(() => {
  global.enc1.logout()

  expect(() => {
    global.enc1.keys()
  }).toThrow()
})
