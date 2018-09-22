class dbjs {

    constructor(){
        db: null
    }
    
    createDb (dbName, dbVersion, dbStoreName, indexes, objectId, callback) {
        window.indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.OIndexedDB || window.msIndexedDB,
        IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.OIDBTransaction || window.msIDBTransaction;

        var self = this, db_name;
        dbVersion += 1;
        //console.log('version is ', dbVersion); 

        if (typeof dbName === 'object') {
            db_name = dbName.name;
            dbName.close();
            dbName = null;
        }

        db_name = db_name || dbName;
        var req = indexedDB.open(db_name, dbVersion);
        //console.log('the source', req.source);
            req.onsuccess = function (evt) {
                var db = evt.currentTarget.result;
                //self.db = db;
                callback(db);
            };
            req.onerror = function (evt) {
                console.log("openDb:", evt.target);
            };
            req.onblocked = function (evt) {
                if (evt.target.readyState == 'done') {
                    //callback(db);
                }   
            }
            // For future use. Currently only in latest Firefox versions
            req.onupgradeneeded = function (evt) {
                var target = evt.currentTarget.result;
                var store = !(objectId === null) ?                         
                     target.createObjectStore(dbStoreName, { keyPath: objectId }) :
                     target.createObjectStore(dbStoreName, { keyPath: 'id', autoIncrement: true });

                indexes.concat("id").forEach(function (str,i,arr) {
                    store.createIndex(str, str, { unique: false });
                });
                
            };
    }

    getObjectStore (db, objectStores, storeName, mode) {
        var self = this;
        try {
            var tx = db.transaction(objectStores, mode);
            return tx.objectStore(storeName);
        } catch (e) {
            console.log(e);
        }

    }

    objectStoreExists (db, objectStore, indexes, cb) {
        if (!db.objectStoreNames.contains(objectStore) && indexes.length) {
            this.createDb(db, db.version, objectStore, indexes, null, cb);
        } else {
            cb(db);
        } 
    }

    insertData (db, objectStores, storeNames, records, callback) {
        callback = callback || null;
        var self = this,
            dbStoreName,
            recordExists = false,
            result;

        arr = storeNames;
        function func(storeName, i,db) {
            var index = (i + 1);
            if (!records[i])
                return callback(0, db);

            self.objectStoreExists(db, storeName, Object.keys(records[i][0] || {}), function (db) {
                var req = self.getObjectStore(db, objectStores[i], storeName, "readwrite");
                if (req !== undefined) {
                    if ((!records[i].length && !records[index]) && i !== 0) {
                        return callback(0, db);
                    }
                    (Array.isArray(records[i])) && records[i].forEach(function (obj, index_, arr2) {
                        var tx = req.add(obj);
                        tx.onsuccess = function (evt) {
                            result = evt.target.result;
                            if ((arr.length == (index)) && (arr2.length == (index_ + 1))) {
                                console.log("entry two");
                                return callback(result, db)
                            }
                        }
                    })
                    arr[index] && func(storeNames[index],index,db);
                } else {
                    if ((!records[i].length && !records[index]) && i !== 0) {
                        console.log("entry three");
                        return callback(i, db);
                    }
                    arr[index] && func(storeNames[index], index, db);
                }
            })
        }
        func(storeNames[0], 0, db);
    }

    insertData2 (db, objectStores, storeNames, records, callback) {
        callback = callback || null;
        var self = this,
            dbStoreName,
            result;
        objectStores.forEach(function (objectStore, i, arr) {
            self.objectStoreExists(db, objectStore[0], Object.keys(records[i][0] || {}), function (db) {
                var req = self.getObjectStore(db, objectStore, storeNames[i], "readwrite");
                if (req !== undefined) {
                    if ((!records[i].length && !records[i + 1]) && i !== 0)
                        return callback(0, db);
                    records[i].forEach(function (obj, index, arr2) {
                        var tx = req.add(obj);
                        tx.onsuccess = function (evt) {
                            result = evt.target.result;
                            if (arr.length == (i + 1) && (arr2.length == (index + 1))) {
                                callback(result, db);
                            }
                        }
                    })
                    return false;
                }
            })
        })
    }

    fetchData (db, objectStores, storeName, keypathId, callback) {
        if (!db.objectStoreNames.contains(storeName))
            return callback([]);
        callback = callback || null;
        var req = this.getObjectStore(db, objectStores, storeName, "readwrite")
        var tx = (keypathId == 0) ? (req !== undefined && req.getAll()) : (req !== undefined && req.get(keypathId));
        tx.onsuccess = function (evt) {
            var result = evt.target.result;
            ("function" == typeof callback) && callback(result);
        }
    }

    deleteData (db, objectStores, storeName, keypathId, callback) {
        var self = this;
        callback = callback || null;
        var req = this.getObjectStore(db, objectStores, storeName, "readwrite")
        if (req == undefined) {
            var req = this.getObjectStore(db, objectStores, storeName, "readwrite")
        }

        var tx = (keypathId[0] === 0) ? req.getAllKeys() : req.delete(keypathId[0]);
        tx.onsuccess = function (evt) {
            var result = Array.isArray(evt.target.result) ? evt.target.result : keypathId.splice(1);
            if (result && result.length) {
                result.forEach(function (index, i, arr) {
                    tnx = req.delete(index);
                    tnx.onsuccess = function () {
                        if (arr.length == (i + 1))
                            ("function" == typeof callback) && callback(index - 1);
                    }
                });
            } else {
                ("function" == typeof callback) && callback(1);
            }
        }
    }

    fetchDataIndex (db, objectStores, storeName, obj, callback) {
        if (!db.objectStoreNames.contains(storeName))
            return callback([]);
        callback = callback || null;
        var req = this.getObjectStore(db, objectStores, storeName, "readwrite")
        var indexes = Object.keys(obj);

        var tx = req.index(indexes[0]).getAll();
        tx.onsuccess = function (evt) {
            var result = evt.target.result;
            result = result.filter(function (rc) {
                return indexes.every(function (index) {
                    return rc[index] == obj[index];
                })
            })
            ; ("function" == typeof callback) && callback(result);
        }
    }

    updateData (db, objectStores, storeName, newRecord, callback) {
        callback = callback || null;
        var self = this;
        newRecord.forEach(function (id, i, a) {
            var req = self.fetchData(db, objectStores, storeName, newRecord[i].id, function (res) {
                var obj = JSON.parse(JSON.stringify(res));
                for (var prop in obj) {
                    obj[prop] = newRecord[i][prop] || obj[prop];
                }
                var objectStore = self.getObjectStore(db, objectStores, storeName, 'readwrite');
                var tx = objectStore.put(obj);
                tx.onsuccess = function (evt) {
                    var result = evt.target.result;
                    if ((i + 1) == a.length)
                        ("function" == typeof callback) && callback(result);
                }
            })
        })
    }

    closeConn() {
       var closeConn = this.db.close();
    }

    openConn (dbName, callback) {
        var req = indexedDB.open(dbName);
        req.onsuccess = function (evt) {
            var db = this.result;
            //self.db = db;
            ('function' == typeof callback) && callback(db);
        };
        req.onerror = function (evt) {
            console.log("openDb:", evt.target.errorCode);
        };
        req.onclose = function (evt) {
            alert('closing connection');
            console.log("closing connection:", evt.target);
        };
    }

    createObjectStore (dbName, dbStoreNames, indexes, objectIds, callback) {
        var self = this;
        var request = indexedDB.open(dbName);
        request.onsuccess = function (e) {
            var database = e.target.result;
            var version = parseInt(database.version);
            database.close();
            var secondRequest = indexedDB.open(dbName, (version + 1));
            secondRequest.onupgradeneeded = function (evt) {
                var target = evt.currentTarget.result;

                try {
                    dbStoreNames.forEach(function (dbStoreName, i) {
                        var store = !(objectIds[i] === null) ?
                        target.createObjectStore(dbStoreName, { keyPath: objectIds[i] }) :
                        target.createObjectStore(dbStoreName, { keyPath: 'id', autoIncrement: true });

                        var indices = Array.isArray(indexes[i]) ? indexes[i] : indexes;
                        indices.forEach(function (str) {
                            store.createIndex(str, str, { unique: false });
                        });
                    })
                } catch ($e) {
                    console.log('error creating these records', $e.message)
                }

            };
            secondRequest.onsuccess = function (evt) {
                var db = this.result;
                //self.db = db;
                callback(db)
            }
            secondRequest.onerror = function (evt) {
                console.log("openDb:", evt.target);
            }
        }
    }

    deleteObjectStore (dbName, dbStoreNames, callback) {
        var self = this;
        var request = indexedDB.open(dbName);
        request.onsuccess = function (e) {
            var database = e.target.result;
            var version = parseInt(database.version);
            database.close();
            database = null;
            var secondRequest = indexedDB.open(dbName, (version + 1));
            secondRequest.onupgradeneeded = function (evt) {
                var target = evt.currentTarget.result;
                dbStoreNames.forEach(function (dbStoreName) {
                    if (target.objectStoreNames.contains(dbStoreName))
                        target.deleteObjectStore(dbStoreName);
                })
            };

            secondRequest.onblocked = function (evt) {
                evt.preventDefault();
                return false;
            }
            secondRequest.onsuccess = function (evt) {
                var db = evt.target.result;
                db.close();
                callback();
            }
            secondRequest.onerror = function (evt) {
                
            }
        }
       
    }



}