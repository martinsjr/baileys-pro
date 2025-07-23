import { SenderMessageKey } from './sender-message-key';
// import { HKDF } from './hkdf'; // caso precise futuramente
import * as crypto from 'libsignal/src/crypto';

export class SenderChainKey {
  private readonly MESSAGE_KEY_SEED: Buffer = Buffer.from([0x01]);
  private readonly CHAIN_KEY_SEED: Buffer = Buffer.from([0x02]);

  private iteration: number;
  private chainKey: Buffer;

  constructor(iteration: number, chainKey: Buffer | string) {
    this.iteration = iteration;
    this.chainKey = typeof chainKey === 'string' ? Buffer.from(chainKey, 'base64') : chainKey;
  }

  getIteration(): number {
    return this.iteration;
  }

  getSenderMessageKey(): SenderMessageKey {
    const messageKeySeed = this.getDerivative(this.MESSAGE_KEY_SEED, this.chainKey);
    return new SenderMessageKey(this.iteration, messageKeySeed);
  }

  getNext(): SenderChainKey {
    const nextChainKey = this.getDerivative(this.CHAIN_KEY_SEED, this.chainKey);
    return new SenderChainKey(this.iteration + 1, nextChainKey);
  }

  getSeed(): Buffer {
    return this.chainKey;
  }

  private getDerivative(seed: Buffer, key: Buffer | string): Buffer {
    const keyBuffer = typeof key === 'string' ? Buffer.from(key, 'base64') : key;
    const hash = crypto.calculateMAC(keyBuffer, seed);
    return hash;
  }
}
