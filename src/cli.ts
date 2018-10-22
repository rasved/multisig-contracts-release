import minimist = require('minimist')
import chalk from 'chalk'
import { validate } from './validate-input.js'
import { createSig, retrieveKeystore } from './sigTools.js'
import { keystore } from 'eth-lightwallet'
import * as lightwallet from 'eth-lightwallet'
import {BigNumber} from 'bignumber.js'
import { Web3 as Web3Class } from 'web3x'
import { ContractAbi } from 'web3x/contract'
const Web3 = require('web3')

const txutils = (lightwallet as any).txutils // type washing
console.assert(txutils, 'lightwallet.txutils should be a thing');

const {yellow, red, blue, greenBright} = chalk

const argv = minimist(process.argv.slice(2), {
  string: ['m', 'multisig', 'd', 'dest', 'from'] // always treat these as strings
})
if (argv.v) {
  console.debug(argv)
}

const subcommand:string = argv._[0]

// assertions
validate(subcommand,argv)

const cmdTpl = '$ node/cli.js'

// node               ./cli.js    sign -s "pretty harsh depart gloom whip quit stable turtle question supreme rather problem" -n 0 -d 0x213 -m 0x333 -v
// nodemon --delay 1s ./cli.js -- sign -s "pretty harsh depart gloom whip quit stable turtle question supreme rather problem" -n 0 -d 0x213 -m 0x333 -v

switch (subcommand) {
  case "mk":
  case "create":
    const createName = argv._[1] || argv.name

    // const s1 = keystore.generateRandomSeed()
    // const s2 = keystore.generateRandomSeed()

    console.log(`Creating contract '${argv.n}'`)
    console.log(`from source '${createName}'`)
    // console.debug(s1)
    // console.debug(s2)
    console.log("Deploying...")
    console.log("Mined at block 30120312 tx hash 0xa8DBBB00d88e88s88f88ge9d")
    console.log("Done.")
    break

  case "ls":
  case "list":
    console.log("You can sign the following:")
    console.log(" 1. Hello world")
    console.log(" 2. Aftale om samarbejde")
    console.log('')
    console.log('See all contracts using --see=all')
    console.log(blue(`Proceed by ${cmdTpl} sign <contract id>`))
    console.log('')
    break

  case "tx":
    const sig1 = JSON.parse(argv._[1]) // {"sigV":28,"sigR":"0x7d223c507acf17887340f364f7cf910ec54dfb2f10e08ce5ddc3d60bf9b221b3","sigS":"0x1bdd9f4ba9afd5466b59010746caf55dd396769a1c8a8c001e3ee693276af1d3"}
    const sig2 = JSON.parse(argv._[2]) // {"sigV":28,"sigR":"0x7d223c507acf17887340f364f7cf910ec54dfb2f10e08ce5ddc3d60bf9b221b3","sigS":"0x1bdd9f4ba9afd5466b59010746caf55dd396769a1c8a8c001e3ee693276af1d3"}

    const sigsOrdered:any = [sig1, sig2] // .sort() // should have been sorted based on sender address
    const sigs = {
      sigV: sigsOrdered.map(sig => sig.sigV),
      sigR: sigsOrdered.map(sig => sig.sigR),
      sigS: sigsOrdered.map(sig => sig.sigS),
    }
    console.assert(sigs.sigV[0], "missing a V", sigs)
    console.assert(sigs.sigS[1], "missing a S")

    const destAddr2     = argv.d || argv.dest     || require('../ethereum/build/contracts/TestContract1.json').networks['1337'].address // demo stuff
    const multisigAddr2 = argv.m || argv.multisig || require('../ethereum/build/contracts/SimpleMultiSig.json').networks['1337'].address // dev stuff

    const web3 = new Web3('http://localhost:7545') as Web3Class
    const multisigInstance:any = new web3.eth.Contract(require('../ethereum/build/contracts/SimpleMultiSig').abi as ContractAbi,
      multisigAddr2,
      {
        from: '0x2153f712f208b8698312cd2737525aefa2de7bb9',
      })

    // Web3 use call because we just reading
    multisigInstance.methods.nonce().call().then(async nonce => {
      const data = txutils._encodeFunctionTxData('nextState', [], []);// sending data doesn't work https://github.com/ethereum/solidity/issues/2884

      console.log('nonce ' + nonce);
      // send transaction here, not using .call!
      const res = await multisigInstance.methods.execute(sigs.sigV, sigs.sigR, sigs.sigS, destAddr2, nonce, data).send()
    })

    break

  case "seed":
    const newSeed = keystore.generateRandomSeed()
    retrieveKeystore(newSeed, '')
      .then(([ks, keyFromPw]) => {
          ks.generateNewAddress(keyFromPw, 1)
          const [signingAddr] = ks.getAddresses()
          console.log(newSeed)
          console.log(signingAddr)
        })

    break

  case "sign":
    const seedPhrase = argv.s || argv.seed
    const password = argv.p || argv.password || ''

    const nonce:number = [argv.n, argv.nonce].find(val => val !== undefined)
    console.assert(nonce != undefined, "should have nonce")

    const multisigAddr = argv.m || argv.multisig || require('../ethereum/build/contracts/SimpleMultiSig.json').networks['1337'].address // dev stuff
    const destAddr = argv.d || argv.dest || require('../ethereum/build/contracts/TestContract1.json').networks['1337'].address // demo stuff

    retrieveKeystore(seedPhrase, password)
      .then(([ks, keyFromPw]) => {
        ks.generateNewAddress(keyFromPw, 1)
        const [signingAddr] = ks.getAddresses()
        let s
        try {
          s = createSig(ks,signingAddr, keyFromPw, multisigAddr, nonce, destAddr)
        }
        catch (e) {
          console.error(red(e.toString()))
          console.error(e)
        }
        if (s) {
          console.log("Signature:")
          console.log(JSON.stringify(s))
        }
      }, err => console.error)
      .catch(err => console.error)
    break

  case "help":
  default:
    console.log('USAGE')
    console.log(`  ${cmdTpl} [-v] <command>`)
    console.log('')
    console.log('COMMANDS')
    console.log('  list, sign, create')
    console.log('')
    console.log('FLAGS')
    console.log('  use -v to show debug output')

    break
}

