//
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Generic tests
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

test('is object', () => {
  expect(typeof enceeper).toBe('object')
})

test('network test', done => {
  var enc1 = new enceeper.app(global.enceeper.user1, global.enceeper.pass1)

  enc1._api.test(function () {
    done()
  }, function (status, errorMessage) {
    throw new Error(errorMessage || 'Not defined')
  })
})
