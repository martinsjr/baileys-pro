import { CiphertextMessage } from './ciphertext_message';
import * as protobufs from './protobufs';

export class SenderKeyDistributionMessage extends CiphertextMessage {
  private serialized!: Buffer;
  private id!: number;
  private iteration!: number;
  private chainKey!: Buffer | string;
  private signatureKey!: Buffer | string;

  constructor(
    id: number | null = null,
    iteration: number | null = null,
    chainKey: Buffer | string | null = null,
    signatureKey: Buffer | string | null = null,
    serialized: Buffer | null = null
  ) {
    super();

    if (serialized) {
      try {
        const version = serialized[0];
        const message = serialized.slice(1);

        const distributionMessage = protobufs.SenderKeyDistributionMessage.decode(message).toJSON();

        this.serialized = serialized;
        this.id = distributionMessage.id;
        this.iteration = distributionMessage.iteration;
        this.chainKey = distributionMessage.chainKey;
        this.signatureKey = distributionMessage.signingKey;
      } catch (e: any) {
        throw new Error(e);
      }
    } else {
      const version = this.intsToByteHighAndLow(this.CURRENT_VERSION, this.CURRENT_VERSION);

      this.id = id!;
      this.iteration = iteration!;
      this.chainKey = chainKey!;
      this.signatureKey = signatureKey!;

      const message = protobufs.SenderKeyDistributionMessage.encode(
        protobufs.SenderKeyDistributionMessage.create({
          id: this.id,
          iteration: this.iteration,
          chainKey: this.chainKey,
          signingKey: this.signatureKey,
        })
      ).finish();

      this.serialized = Buffer.concat([Buffer.from([version]), message]);
    }
  }

  // Converte duas versões em um único byte como (major << 4 | minor)
  private intsToByteHighAndLow(highValue: number, lowValue: number): number {
    return (((highValue << 4) | lowValue) & 0xff) % 256;
  }

  serialize(): Buffer {
    return this.serialized;
  }

  getType(): number {
    return this.SENDERKEY_DISTRIBUTION_TYPE;
  }

  getIteration(): number {
    return this.iteration;
  }

  getChainKey(): Buffer {
    return typeof this.chainKey === 'string'
      ? Buffer.from(this.chainKey, 'base64')
      : this.chainKey;
  }

  getSignatureKey(): Buffer {
    return typeof this.signatureKey === 'string'
      ? Buffer.from(this.signatureKey, 'base64')
      : this.signatureKey;
  }

  getId(): number {
    return this.id;
  }
}
