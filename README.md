# Enceeper JS library

A reference library for building Javascript applications on top of the Enceeper service. Our own cross-platform Enceeper app is using this library.

## Introduction

The Enceeper app (https://github.com/enceeper/enceeper) and the Enceeper service (https://www.enceeper.com/) can be used to securely store and retrieve credentials (usernames, passwords, API keys etc). The Enceeper app can be divided into two parts:
- The User Interface (UI) that handles all user input
- The core functionality and the utilization of the Enceeper service

For the later we have created this repository, to make it a seperate project for easier integration (via npm) to other solutions.

The purpose of this library is:
* To execute the SRP6a protocol both for user registration and authentication (https://github.com/alax/jsrp)
* Implement all cryptographic functionality by utilizing SJCL (https://github.com/bitwiseshiftleft/sjcl) and TweetNaCl (https://github.com/dchest/tweetnacl-js)
* Handle all network communication with the Enceeper service (https://www.enceeper.com/) using ajax calls (via JQuery)
* Expose a convenient and abstract API to be used by other solutions
* Allow transparent re-authentication when the auth token expires

## Installation with npm

```bash
npm install enceeper-jslib --save
```

### Important notes

The library assumes that the machine we are running is not hostile. If another hostile process can allocate a memory previously used by our app it can gain access to important key information. We do not zero variables after usage and also JS allocates memory dynamically, so by itself this would be a very hard task.

*The safest way is to use the library in your personal machine.*

## Usage

The library is broken into the following files:
* enceeper.exceptions.js: contains the exceptions used througout the library
* enceeper.network.js: handling the network communication with the Enceeper service
* enceeper.srp6a.js: the SRP6a protocol details for user registration and authentication
* enceeper.crypto.js: all the crypto related operations (keys, slots, key sharing etc.)
* enceeper.api.js: a low-level mapping of the Enceeper service API calls to Javascript functions
* enceeper.app.js: a high-level usage of the library with convenient methods and an internal data structure to access the keys

Only a small portion of the operations do not rely on network calls (i.e. logout or getCategories), most operations will either perform a lengthy crypto calculation or communicate with the Enceeper service. This requires the use of callbacks in order to make the required operations asynchronous and report back the outcome. We have two types of callbacks:
* a success callback that will provide the outcome of the request
* a failure callback providing the error code (most likely an HTTP status code) and an exception message

The following example illustrates how to sign-in to a user account and then retrieve various details about the stored keys.

```javascript
const enceeper = require('enceeper-jslib')

var enc = new enceeper.app('user@example.com', 'secret')

enc.signin(function (data) {
  console.log('OK with data')
  console.log(data)

  // Get the categories
  // enc.getCategories()

  // Get the keys for a category
  // enc.getKeys('Category')

  // Get the key details
  // enc.getKeyDetails(<key id>)

  // Get the key password
  // enc.getPassword(<key id>)
}, function (status, errorMessage) {
  console.log('Error: [' + status + '] [' + errorMessage + ']')
})
```

## Copyright and license

Copyright 2019 Vassilis Poursalidis. Released under GNU GPL3 or later - see the `LICENSE` file for details.
