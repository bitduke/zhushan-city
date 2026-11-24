// PG Document throws for missing IDs even when throwOnNotFound is false.
// Classic NoSQL rejects _id inside doc(id).set({ data }); the reference supplies it.
const isMissingDocument = error => /Document not found/i.test(String(error?.message || ''));

function wrapDocument(document) {
  return new Proxy(document, {
    get(target, key) {
      if (key === 'get') return async (...args) => {
        try { return await target.get(...args); }
        catch (error) {
          if (isMissingDocument(error)) return { data: null };
          throw error;
        }
      };
      if (key === 'set') return options => {
        if (!options?.data || !Object.prototype.hasOwnProperty.call(options.data, '_id')) return target.set(options);
        const { _id, ...data } = options.data;
        return target.set({ ...options, data });
      };
      const value = Reflect.get(target, key, target);
      return typeof value === 'function' ? value.bind(target) : value;
    }
  });
}

function wrapCollection(collection) {
  return new Proxy(collection, {
    get(target, key) {
      if (key === 'doc') return (...args) => wrapDocument(target.doc(...args));
      const value = Reflect.get(target, key, target);
      return typeof value === 'function' ? value.bind(target) : value;
    }
  });
}

function wrapDatabase(database) {
  return new Proxy(database, {
    get(target, key) {
      if (key === 'collection') return (...args) => wrapCollection(target.collection(...args));
      if (key === 'runTransaction') return (callback, ...args) =>
        target.runTransaction(transaction => callback(wrapDatabase(transaction)), ...args);
      const value = Reflect.get(target, key, target);
      return typeof value === 'function' ? value.bind(target) : value;
    }
  });
}

module.exports = wrapDatabase;
