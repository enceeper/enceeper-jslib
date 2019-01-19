//
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Registration tests, loading data from cache and re-auth
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

beforeAll(done => {
  jest.setTimeout(25000)

  global.enc4 = new enceeper.app(global.enceeper.user4, global.enceeper.pass4)
  global.enc4.register(function (data) {
    done()
  }, function (status, errorMessage) {
    throw new Error(errorMessage || 'Not defined')
  })
})

describe('perform basic account actions', () => {
  beforeAll(done => {
    global.enc4.signin(function (data) {
      done()
    }, function (status, errorMessage) {
      throw new Error(errorMessage || 'Not defined')
    })
  })

  test('load data from cache', () => {
    var categories, keys, keyMeta, keyValue

    var enc = new enceeper.app(global.enceeper.user4, global.enceeper.pass4)
    enc.restoreCache(global.enc4.getForCache())

    categories = enc.getCategories()
    keys = enc.getKeys(categories[0])
    keyMeta = enc.getKeyDetails(keys[0].key_id)
    keyValue = enc.getPassword(keys[0].key_id)

    // Check with the input we have provided on key creation
    expect(categories).toEqual(global.enceeper.keyMeta.c)
    expect(keyMeta).toEqual(keys[0])
    expect(keyMeta.meta).toEqual(global.enceeper.keyMeta)
    expect(keyValue).toEqual(global.enceeper.keyValue)

    // Now check the remaining data
    expect(typeof keyMeta.key_id).toBe('number')
    expect(typeof keyMeta.slots).toBe('object')
    expect(keyMeta.slots.length).toBeGreaterThan(0)
    expect(keyMeta.slots[0].slot_id).toBe(-1)
  })

  // --
  test('change the user password and also testing re-auth', done => {
    setTimeout(() => {
      global.enc4.password(global.enceeper.pass4, 'newPassword', function () {
        done()
      }, function (status, errorMessage) {
        if (status === 400 && errorMessage === 'User authentication failed') { done() } else { throw new Error(errorMessage || 'Not defined') }
      })
    }, 10000)
  })

  // --
  test('delete the account', done => {
    global.enc4.delete(function () {
      done()
    }, function (status, errorMessage) {
      throw new Error(errorMessage || 'Not defined')
    })
  })
})
