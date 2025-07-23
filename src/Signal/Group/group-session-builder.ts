import { SenderKeyDistributionMessage } from './sender-key-distribution-message';
import * as keyhelper from './keyhelper';
import { SenderKeyRecord } from './sender-key-record';
import { SenderKeyName } from './sender-key-name';

export interface SenderKeyStore {
  loadSenderKey: (name: SenderKeyName) => Promise<SenderKeyRecord>;
  storeSenderKey: (name: SenderKeyName, record: SenderKeyRecord) => Promise<void>;
}

export class GroupSessionBuilder {
  private senderKeyStore: SenderKeyStore;

  constructor(senderKeyStore: SenderKeyStore) {
    this.senderKeyStore = senderKeyStore;
  }

  async process(
    senderKeyName: SenderKeyName,
    senderKeyDistributionMessage: SenderKeyDistributionMessage
  ): Promise<void> {
    const senderKeyRecord = await this.senderKeyStore.loadSenderKey(senderKeyName);

    senderKeyRecord.addSenderKeyState(
      senderKeyDistributionMessage.getId(),
      senderKeyDistributionMessage.getIteration(),
      senderKeyDistributionMessage.getChainKey(),
      senderKeyDistributionMessage.getSignatureKey()
    );

    await this.senderKeyStore.storeSenderKey(senderKeyName, senderKeyRecord);
  }

  async create(senderKeyName: SenderKeyName): Promise<SenderKeyDistributionMessage> {
    const senderKeyRecord = await this.senderKeyStore.loadSenderKey(senderKeyName);

    if (senderKeyRecord.isEmpty()) {
      const keyId = keyhelper.generateSenderKeyId();
      const senderKey = keyhelper.generateSenderKey();
      const signingKey = keyhelper.generateSenderSigningKey();

      senderKeyRecord.setSenderKeyState(keyId, 0, senderKey, signingKey);
      await this.senderKeyStore.storeSenderKey(senderKeyName, senderKeyRecord);
    }

    const state = senderKeyRecord.getSenderKeyState();

    return new SenderKeyDistributionMessage(
      state.getKeyId(),
      state.getSenderChainKey().getIteration(),
      state.getSenderChainKey().getSeed(),
      state.getSigningKeyPublic()
    );
  }
}
