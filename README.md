[![Build Status](https://travis-ci.org/catdawg/randomfschanger.svg?branch=master)](https://travis-ci.org/catdawg/randomfschanger)
## LIBRARY IN DEVELOPMENT, NOT READY TO USE
Random Filesystem Changer
=========

This library provides a way to randomly change a directory in order to mimic filesystem changes. The idea is to use this to stress test components in applications that operate on filesystem changes. It runs on a separate process, to attempt to mimic typical conditions of concurrent reads and writes.

## Installation

  `npm install @catdawg/randomfschanger`

## Usage

'''

const randomfschanger = new RandomFSChanger(tmpDir.name, {
    seed: 1234, // random seed, to replicate the same file changes
    workerCount: 4 // how many workers will be independently writing on the filesystem, to test load.
});

randomfschanger.start();
// wait for the changer to work
await randomfschanger.stop(); // waits for confirmation from the changer that it actually stopped.
'''

## Tests
  `npm run dist` - fork.js needs to be generated.
  `npm test`
