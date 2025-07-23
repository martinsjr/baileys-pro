import { SenderKeyState } from './sender_key_state';

export class SenderKeyRecord {
  private readonly MAX_STATES = 5;
  private senderKeyStates: SenderKeyState[];

  constructor(serialized?: any[]) {
    this.senderKeyStates = [];

    if (serialized) {
      for (let i = 0; i < serialized.length; i++) {
        const structure = serialized[i];
        this.senderKeyStates.push(
          new SenderKeyState(null, null, null, null, null, null, structure)
        );
      }
    }
  }

  isEmpty(): boolean {
    return this.senderKeyStates.length === 0;
  }

  getSenderKeyState(keyId?: number): SenderKeyState | undefined {
    if (!keyId && this.senderKeyStates.length > 0) {
      return this.senderKeyStates[this.senderKeyStates.length - 1];
    }

    return this.senderKeyStates.find((state) => state.getKeyId() === keyId);
  }

  addSenderKeyState(
    id: number,
    iteration: number,
    chainKey: Buffer | string,
    signatureKey: Buffer | string
  ): void {
    this.senderKeyStates.push(
      new SenderKeyState(id, iteration, chainKey, null, signatureKey)
    );

    if (this.senderKeyStates.length > this.MAX_STATES) {
      this.senderKeyStates.shift();
    }
  }

  setSenderKeyState(
    id: number,
    iteration: number,
    chainKey: Buffer | string,
    keyPair: { public: Buffer | string; private: Buffer | string }
  ): void {
    this.senderKeyStates.length = 0;
    this.senderKeyStates.push(
      new SenderKeyState(id, iteration, chainKey, keyPair)
    );
  }

  serialize(): any[] {
    return this.senderKeyStates.map((state) => state.getStructure());
  }
}
