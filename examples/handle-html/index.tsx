#!/usr/bin/env tsx

/** @jsx h */

import { resolve } from 'node:path'
import * as url from 'node:url'
import { h, handleHTMLFile } from '../../src/index.node'

const __filename = url.fileURLToPath(import.meta.url)
const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

const _keepH = h

handleHTMLFile(
  resolve(__dirname, 'in.html'),
  (document) => {
    const head = document.querySelector('head')
    head!.appendChild(<meta name="test"></meta>)
    document.body.innerHTML = 'Hello World'
  },
  resolve(__dirname, 'out.html'),
)
