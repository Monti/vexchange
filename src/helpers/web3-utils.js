export function getBlockDeadline(connex, deadline) {
  return new Promise(async (resolve, reject) => {
    const block = await connex.thor.block().get();

    if (!block.id && block.id !== 0) {
      return reject();
    }

    if (!block) {
      return reject();
    }

    resolve(block.timestamp + deadline);
  });
}
