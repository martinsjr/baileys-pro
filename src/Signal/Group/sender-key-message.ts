import { CiphertextMessage } from './ciphertext-message';
import * as curve from 'libsignal/src/curve';
import * as protobufs from './protobufs';

export class SenderKeyMessage extends CiphertextMessage {
  private readonly SIGNATURE_LENGTH = 64;
  private serialized!: Buffer;
  private messageVersion!: number;
  private keyId!: number;
  private iteration!: number;
  private ciphertext!: Buffer;
  private signature!: Buffer;

  constructor(
    keyId: number | null = null,
    iteration: number | null = null,
    ciphertext: Buffer | null = null,
    signatureKey: any = null,
    serialized: Buffer | null = null
  ) {
    super();

    if (serialized) {
      const version = serialized[0];

      const message = serialized.slice(1, serialized.length - this.SIGNATURE_LENGTH);
      const signature = serialized.slice(-this.SIGNATURE_LENGTH);

      const senderKeyMessage = protobufs.SenderKeyMessage.decode(message).toJSON();
      senderKeyMessage.ciphertext = Buffer.from(senderKeyMessage.ciphertext, 'base64');

      this.serialized = serialized;
      this.messageVersion = (version & 0xff) >> 4;

      this.keyId = senderKeyMessage.id;
      this.iteration = senderKeyMessage.iteration;
      this.ciphertext = senderKeyMessage.ciphertext;
      this.signature = signature;
    } else {
      const version =
        (((this.CURRENT_VERSION << 4) | this.CURRENT_VERSION) & 0xff) % 256;

      const ciphertextBuffer = Buffer.from(ciphertext!); // For�a a exist�ncia

      const message = protobufs.SenderKeyMessage.encode(
        protobufs.SenderKeyMessage.create({
          id: keyId!,
          iteration: iteration!,
          ciphertext: ciphertextBuffer,
        })
      ).finish();

      const signature = this.getSignature(
        signatureKey,
        Buffer.concat([Buffer.from([version]), message])
      );

      this.serialized = Buffer.concat([
        Buffer.from([version]),
        message,
        signature,
      ]);

      this.messageVersion = this.CURRENT_VERSION;
      this.keyId = keyId!;
      this.iteration = iteration!;
      this.ciphertext = ciphertextBuffer;
      this.signature = signature;
    }
  }

  getKeyId(): number {
    return this.keyId;
  }

  getIteration(): number {
    return this.iteration;
  }

  getCipherText(): Buffer {
    return this.ciphertext;
  }

  verifySignature(signatureKey: any): void {
    const part1 = this.serialized.slice(0, this.serialized.length - this.SIGNATURE_LENGTH);
    const part2 = this.serialized.slice(-this.SIGNATURE_LENGTH);

    const isValid = curve.verifySignature(signatureKey, part1, part2);
    if (!isValid) throw new Error('Invalid signature!');
  }

  getSignature(signatureKey: any, serialized: Buffer): Buffer {
    return Buffer.from(
      curve.calculateSignature(signatureKey, serialized)
    );
  }

  serialize(): Buffer {
    return this.serialized;
  }

  getType(): number {
    return 4;
  }
}
