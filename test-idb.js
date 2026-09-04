const req = indexedDB.open('test', 1);
req.onerror = () => console.log('error');
req.onsuccess = () => console.log('success');
