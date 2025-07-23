import { SenderChainKey } from './sender_chain_key';
import { SenderMessageKey } from './sender_message_key';

// Aqui é importante garantir que `protobufs` tenha tipagens adequadas
// Se você tiver os `.proto` gerados com `protobufjs`, melhor ainda
import * as protobufs from './protobufs';

export class SenderKeyState {
  private readonly MAX_MESSAGE_KEYS = 2000;

  private senderKeyStateStructure: any; // Idealmente tipar com `protobufs.SenderKeyStateStructure`
  private senderChainKey?: any;

  constructor(
    id: number | null = null,
    iteration: number | null = null,
    chainKey: Buffer | string | null = null,
    signatureKeyPair: { public: Buffer | string; private: Buffer | string } | null = null,
    signatureKeyPublic: Buffer | string | null = null,
    signatureKeyPrivate: Buffer | string | null = null,
    senderKeyStateStructure: any | null = null
  ) {
    if (senderKeyStateStructure) {
      this.senderKeyStateStructure = senderKeyStateStructure;
    } else {
      if (signatureKeyPair) {
        signatureKeyPublic = signatureKeyPair.public;
        signatureKeyPrivate = signatureKeyPair.private;
      }

      const chainKeyBuffer =
        typeof chainKey === 'string' ? Buffer.from(chainKey, 'base64') : chainKey;

      this.senderKeyStateStructure = protobufs.SenderKeyStateStructure.create();

      const senderChainKeyStructure = protobufs.SenderChainKey.create();
      senderChainKeyStructure.iteration = iteration!;
      senderChainKeyStructure.seed = chainKeyBuffer!;

      this.senderKeyStateStructure.senderChainKey = senderChainKeyStructure;

      const signingKeyStructure = protobufs.SenderSigningKey.create();
      signingKeyStructure.public =
        typeof signatureKeyPublic === 'string'
          ? Buffer.from(signatureKeyPublic, 'base64')
          : signatureKeyPublic!;
      if (signatureKeyPrivate) {
        signingKeyStructure.private =
          typeof signatureKeyPrivate === 'string'
            ? Buffer.from(signatureKeyPrivate, 'base64')
            : signatureKeyPrivate;
      }

      this.senderKeyStateStructure.senderKeyId = id!;
      this.senderChainKey = senderChainKeyStructure;
      this.senderKeyStateStructure.senderSigningKey = signingKeyStructure;
    }

    this.senderKeyStateStructure.senderMessageKeys =
      this.senderKeyStateStructure.senderMessageKeys || [];
  }

  getKeyId(): number {
    return this.senderKeyStateStructure.senderKeyId;
  }

  getSenderChainKey(): SenderChainKey {
    return new SenderChainKey(
      this.senderKeyStateStructure.senderChainKey.iteration,
      this.senderKeyStateStructure.senderChainKey.seed
    );
  }

  setSenderChainKey(chainKey: SenderChainKey): void {
    const senderChainKeyStructure = protobufs.SenderChainKey.create({
      iteration: chainKey.getIteration(),
      seed: chainKey.getSeed(),
    });
    this.senderKeyStateStructure.senderChainKey = senderChainKeyStructure;
  }

  getSigningKeyPublic(): Buffer {
    const key = this.senderKeyStateStructure.senderSigningKey.public;
    return typeof key === 'string' ? Buffer.from(key, 'base64') : key;
  }

  getSigningKeyPrivate(): Buffer {
    const key = this.senderKeyStateStructure.senderSigningKey.private;
    return typeof key === 'string' ? Buffer.from(key, 'base64') : key;
  }

  hasSenderMessageKey(iteration: number): boolean {
    return this.senderKeyStateStructure.senderMessageKeys.some(
      (key: any) => key.iteration === iteration
    );
  }

  addSenderMessageKey(senderMessageKey: SenderMessageKey): void {
    const senderMessageKeyStructure = protobufs.SenderKeyStateStructure.create({
      iteration: senderMessageKey.getIteration(),
      seed: senderMessageKey.getSeed(),
    });

    this.senderKeyStateStructure.senderMessageKeys.push(senderMessageKeyStructure);

    if (this.senderKeyStateStructure.senderMessageKeys.length > this.MAX_MESSAGE_KEYS) {
      this.senderKeyStateStructure.senderMessageKeys.shift();
    }
  }

  removeSenderMessageKey(iteration: number): SenderMessageKey | null {
    let result: any = null;

    this.senderKeyStateStructure.senderMessageKeys = this.senderKeyStateStructure.senderMessageKeys.filter(
      (key: any) => {
        if (key.iteration === iteration) {
          result = key;
          return false;
        }
        return true;
      }
    );

    return result ? new SenderMessageKey(result.iteration, result.seed) : null;
  }

  getStructure(): any {
    return this.senderKeyStateStructure;
  }
}
