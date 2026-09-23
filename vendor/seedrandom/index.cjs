'use strict';

function hashSeed(seed) {
  const text = String(seed ?? '');
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seedrandom(seed) {
  let state = hashSeed(seed) || 0x6d2b79f5;
  const random = () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  random.quick = random;
  random.double = random;
  random.int32 = () => (random() * 4294967296) | 0;
  return random;
}

seedrandom.alea = seedrandom;
seedrandom.xor128 = seedrandom;
seedrandom.xorwow = seedrandom;
seedrandom.xorshift7 = seedrandom;
seedrandom.xor4096 = seedrandom;
seedrandom.tychei = seedrandom;

module.exports = seedrandom;
