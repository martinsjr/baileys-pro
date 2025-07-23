// vim: ts=4:sw=4:expandtab

/**
 * jobQueue gerencia várias filas indexadas por "bucket" para serializar
 * operações assíncronas (como leitura/escrita de sessão no banco de dados).
 */

const _queueAsyncBuckets: Map<any, JobEntry[]> = new Map();
const _gcLimit = 10000;

// Tipagem dos itens que compõem a fila
interface JobEntry {
  awaitable: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}

// Executor assíncrono que processa uma fila de jobs
async function _asyncQueueExecutor(queue: JobEntry[], cleanup: () => void): Promise<void> {
  let offt = 0;

  while (true) {
    const limit = Math.min(queue.length, _gcLimit);

    for (let i = offt; i < limit; i++) {
      const job = queue[i];
      try {
        const result = await job.awaitable();
        job.resolve(result);
      } catch (e) {
        job.reject(e);
      }
    }

    if (limit < queue.length) {
      if (limit >= _gcLimit) {
        queue.splice(0, limit);
        offt = 0;
      } else {
        offt = limit;
      }
    } else {
      break;
    }
  }

  cleanup();
}

// Função principal exportada
export default function queueJob<T = any>(
  bucket: string | symbol | object,
  awaitable: () => Promise<T>
): Promise<T> {
  if (!awaitable.name) {
    // Atribui um nome à função para facilitar o debug
    Object.defineProperty(awaitable, 'name', { writable: true });
    if (typeof bucket === 'string') {
      awaitable.name = bucket;
    } else {
      console.warn('Unhandled bucket type (for naming):', typeof bucket, bucket);
    }
  }

  let inactive = false;

  if (!_queueAsyncBuckets.has(bucket)) {
    _queueAsyncBuckets.set(bucket, []);
    inactive = true;
  }

  const queue = _queueAsyncBuckets.get(bucket)!;

  const job = new Promise<T>((resolve, reject) => {
    queue.push({ awaitable, resolve, reject });
  });

  if (inactive) {
    _asyncQueueExecutor(queue, () => _queueAsyncBuckets.delete(bucket));
  }

  return job;
}
