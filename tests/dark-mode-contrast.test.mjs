import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')
const darkTheme = css.match(/\[data-theme="dark"\] \{([^}]+)\}/)[1]
const tokens = Object.fromEntries([...darkTheme.matchAll(/(--[\w-]+):\s*(#[\da-f]+)/gi)].map(match => [match[1], match[2]]))

function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map(channel => parseInt(channel, 16) / 255)
    .map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

test('dark-mode foreground tokens meet normal-text contrast on shared surfaces', () => {
  const foregrounds = ['text-1', 'text-2', 'text-3', 'navy-text', 'blue-text', 'green-text', 'red-text']
  for (const foreground of foregrounds) {
    for (const background of ['surface', 'card', 'hover']) {
      const a = luminance(tokens[`--color-${foreground}`])
      const b = luminance(tokens[`--color-${background}`])
      const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
      assert.ok(ratio >= 4.5, `${foreground} on ${background}: ${ratio.toFixed(2)}:1`)
    }
  }
})
