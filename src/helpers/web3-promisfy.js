export default function promisify(connex, methodName, ...args) {
  return new Promise((resolve, reject) => {
    if (!connex) {
      reject(new Error('No Web3 object'));
      return;
    }

    const method = connex.eth[methodName];

    if (!method) {
      reject(new Error(`Cannot find web3.eth.${methodName}`));
      return;
    }

    method(...args, (error, data) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(data);
    })
  });
}
