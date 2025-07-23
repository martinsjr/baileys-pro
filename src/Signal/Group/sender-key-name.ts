// Função auxiliar para verificar nulo ou string vazia
function isNull(str: any): boolean {
  return str === null || str.value === '';
}

/**
 * Implementação de intValue equivalente ao int do Java
 */
function intValue(num: number): number {
  const MAX_VALUE = 0x7fffffff;
  const MIN_VALUE = -0x80000000;

  if (num > MAX_VALUE || num < MIN_VALUE) {
    return (num &= 0xffffffff); // Força overflow para 32 bits
  }

  return num;
}

/**
 * Implementação de hashCode ao estilo do Java
 */
function hashCode(strKey: string): number {
  let hash = 0;

  if (!isNull(strKey)) {
    for (let i = 0; i < strKey.length; i++) {
      hash = hash * 31 + strKey.charCodeAt(i);
      hash = intValue(hash); // Garante overflow de 32 bits
    }
  }

  return hash;
}

// Interface que representa um sender
export interface Sender {
  id: string;
  deviceId: number;
  toString(): string;
}

export class SenderKeyName {
  private groupId: string;
  private sender: Sender;

  constructor(groupId: string, sender: Sender) {
    this.groupId = groupId;
    this.sender = sender;
  }

  getGroupId(): string {
    return this.groupId;
  }

  getSender(): Sender {
    return this.sender;
  }

  serialize(): string {
    return `${this.groupId}::${this.sender.id}::${this.sender.deviceId}`;
  }

  toString(): string {
    return this.serialize();
  }

  equals(other: any): boolean {
    if (other === null) return false;
    if (!(other instanceof SenderKeyName)) return false;

    return (
      this.groupId === other.groupId &&
      this.sender.toString() === other.sender.toString()
    );
  }

  hashCode(): number {
    return hashCode(this.groupId) ^ hashCode(this.sender.toString());
  }
}
