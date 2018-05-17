[![Build Status](https://travis-ci.org/catdawg/randomfschanger.svg?branch=master)](https://travis-ci.org/catdawg/randomfschanger)
## LIBRARY IN DEVELOPMENT, NOT READY TO USE
Random Filesystem Changer
=========

This library provides a way to randomly change a directory in order to mimic filesystem changes. The idea is to use this to stress test components in applications that operate on filesystem changes.

## Installation

  `npm install @catdawg/randomfschanger`

## Usage

'''
await runRandomFSChanger("adirectory/something/", 60000); // runs for 60 seconds
await runRandomFSChanger("adirectory/something/", 60000, {
    seed: 1234,
    workerCount: 4
}); // runs for 60 seconds using a specific seed and worker count

'''

## Tests

  `npm test`
