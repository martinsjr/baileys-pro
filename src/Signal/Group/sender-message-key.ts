// Importação do método de derivação
import { deriveSecrets } from 'libsignal/src/crypto';

// Classe SenderMessageKey com tipagens explícitas
export class SenderMessageKey {
  iteration: number = 0;
  iv: Buffer = Buffer.alloc(0);
  cipherKey: Buffer = Buffer.alloc(0);
  seed: Buffer = Buffer.alloc(0);

  constructor(iteration: number, seed: Buffer) {
    // Deriva chaves com base na seed
    const derivative: [Buffer, Buffer] = deriveSecrets(
      seed,
      Buffer.alloc(32),
      Buffer.from('WhisperGroup')
    );

    // Cria buffer de 32 bytes com partes específicas dos buffers derivados
    const keys = new Uint8Array(32);
    keys.set(new Uint8Array(derivative[0].slice(16)));        // 16 bytes finais
    keys.set(new Uint8Array(derivative[1].slice(0, 16)), 16); // 16 bytes iniciais

    // Define os valores da instância
    this.iv = Buffer.from(derivative[0].slice(0, 16));
    this.cipherKey = Buffer.from(keys.buffer);
    this.iteration = iteration;
    this.seed = seed;
  }

  getIteration(): number {
    return this.iteration;
  }

  getIv(): Buffer {
    return this.iv;
  }

  getCipherKey(): Buffer {
    return this.cipherKey;
  }

  getSeed(): Buffer {
    return this.seed;
  }
}
