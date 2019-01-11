//
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Our test environment, the goal is to perform only functional tests
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

// enceeper test environment
const JsdomeEnvironment = require('jest-environment-jsdom')

class EnceeperEnvironment extends JsdomeEnvironment {
  constructor (config) {
    super(config)

    this.details = {
      // User 1 - most tests
      user1: 'demo1@enceeper.com',
      pass1: 'SuperSecret',
      // User 2 - share test
      user2: 'demo2@enceeper.com',
      pass2: 'ShareSecret',
      user3: 'demo3@enceeper.com',
      pass3: 'ShareSecret2',
      // User 4 - register test
      user4: 'demo4@enceeper.com',
      pass4: 'RegisterSecret',
      // keyMeta and keyValue
      keyMeta: {
        'v': 1,
        'u': 'enceeper',
        't': 'Facebook',
        'l': 'https://www.facebook.com',
        'c': [
          'Internet',
          'Social'
        ],
        'n': 'The main FB account'
      },
      keyValue: {
        'v': 1,
        'p': [
          {
            'v': 'secret',
            't': 1546300800
          }
        ]
      }
    }
  }

  async setup () {
    await super.setup()

    this.global.enceeper = this.details
  }

  async teardown () {
    await super.teardown()
  }

  runScript (script) {
    return super.runScript(script)
  }
}

module.exports = EnceeperEnvironment
