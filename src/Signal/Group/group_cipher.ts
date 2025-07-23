import queueJob from './queue-job';
import { SenderKeyMessage } from './sender-key-message';
import * as crypto from 'libsignal/src/crypto';
import { SenderKeyName } from './sender-key-name';
import { SenderKeyRecord } from './sender-key-record';
import { SenderKeyState } from './sender-key-state';
import { SenderMessageKey } from './sender-message-key';

export interface SenderKeyStore {
  loadSenderKey: (name: SenderKeyName) => Promise<SenderKeyRecord>;
  storeSenderKey: (name: SenderKeyName, record: SenderKeyRecord) => Promise<void>;
}

export class GroupCipher {
  private senderKeyStore: SenderKeyStore;
  private senderKeyName: SenderKeyName;

  constructor(senderKeyStore: SenderKeyStore, senderKeyName: SenderKeyName) {
    this.senderKeyStore = senderKeyStore;
    this.senderKeyName = senderKeyName;
  }

  private queueJob<T>(awaitable: () => Promise<T>): Promise<T> {
    return queueJob(this.senderKeyName.toString(), awaitable);
  }

  async encrypt(paddedPlaintext: Buffer): Promise<Buffer> {
    return this.queueJob(async () => {
      const record = await this.senderKeyStore.loadSenderKey(this.senderKeyName);
      if (!record) throw new Error('No SenderKeyRecord found for encryption');

      const senderKeyState = record.getSenderKeyState();
      if (!senderKeyState) throw new Error('No session to encrypt message');

      const iteration = senderKeyState.getSenderChainKey().getIteration();
      const senderKey = this.getSenderKey(senderKeyState, iteration === 0 ? 0 : iteration + 1);

      const ciphertext = this.getCipherText(
        senderKey.getIv(),
        senderKey.getCipherKey(),
        paddedPlaintext
      );

      const senderKeyMessage = new SenderKeyMessage(
        senderKeyState.getKeyId(),
        senderKey.getIteration(),
        ciphertext,
        senderKeyState.getSigningKeyPrivate()
      );

      await this.senderKeyStore.storeSenderKey(this.senderKeyName, record);
      return senderKeyMessage.serialize();
    });
  }

  async decrypt(senderKeyMessageBytes: Buffer): Promise<Buffer> {
    return this.queueJob(async () => {
      const record = await this.senderKeyStore.loadSenderKey(this.senderKeyName);
      if (!record) throw new Error('No SenderKeyRecord found for decryption');

      const senderKeyMessage = new SenderKeyMessage(
        null,
        null,
        null,
        null,
        senderKeyMessageBytes
      );

      const senderKeyState = record.getSenderKeyState(senderKeyMessage.getKeyId());
      if (!senderKeyState) throw new Error('No session found to decrypt message');

      senderKeyMessage.verifySignature(senderKeyState.getSigningKeyPublic());

      const senderKey = this.getSenderKey(senderKeyState, senderKeyMessage.getIteration());

      const plaintext = this.getPlainText(
        senderKey.getIv(),
        senderKey.getCipherKey(),
        senderKeyMessage.getCipherText()
      );

      await this.senderKeyStore.storeSenderKey(this.senderKeyName, record);

      return plaintext;
    });
  }

  private getSenderKey(senderKeyState: SenderKeyState, iteration: number): SenderMessageKey {
    let senderChainKey = senderKeyState.getSenderChainKey();

    if (senderChainKey.getIteration() > iteration) {
      if (senderKeyState.hasSenderMessageKey(iteration)) {
        return senderKeyState.removeSenderMessageKey(iteration)!;
      }
      throw new Error(
        `Received message with old counter: ${senderChainKey.getIteration()}, ${iteration}`
      );
    }

    if (iteration - senderChainKey.getIteration() > 2000) {
      throw new Error('Over 2000 messages into the future!');
    }

    while (senderChainKey.getIteration() < iteration) {
      senderKeyState.addSenderMessageKey(senderChainKey.getSenderMessageKey());
      senderChainKey = senderChainKey.getNext();
    }

    senderKeyState.setSenderChainKey(senderChainKey.getNext());
    return senderChainKey.getSenderMessageKey();
  }

  private getPlainText(iv: Buffer, key: Buffer, ciphertext: Buffer): Buffer {
    try {
      return crypto.decrypt(key, ciphertext, iv);
    } catch (e) {
      throw new Error('InvalidMessageException');
    }
  }

  private getCipherText(iv: Buffer | string, key: Buffer | string, plaintext: Buffer): Buffer {
    try {
      const ivBuffer = typeof iv === 'string' ? Buffer.from(iv, 'base64') : iv;
      const keyBuffer = typeof key === 'string' ? Buffer.from(key, 'base64') : key;
      return crypto.encrypt(keyBuffer, Buffer.from(plaintext), ivBuffer);
    } catch (e) {
      throw new Error('InvalidMessageException');
    }
  }
}
