// 按给定并发数映射数据，并保持结果与输入顺序一致。
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1)
    throw new RangeError('concurrency must be a positive integer');
  // 按输入索引保存每项异步处理结果。
  const results = new Array<R>(items.length);
  // 指向下一项尚未分配给工作器的输入。
  let nextIndex = 0;
  // 持续领取输入项，直到全部任务处理完成。
  async function runWorker(): Promise<void> {
    while (nextIndex < items.length) {
      // 固定本轮任务索引，防止等待期间被其他工作器推进。
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  }
  // 限制实际工作器数量不超过输入项数量。
  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, runWorker));
  return results;
}
