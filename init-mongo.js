db = db.getSiblingDB('admin');

if (db.getUser("admin") === null) {
  db.createUser({
    user: "admin",
    pwd: "admin123",
    roles: [
      { role: "root", db: "admin" }
    ]
  });
}

const testDb = db.getSiblingDB('testdb');
testDb.createCollection("init");
testDb.setProfilingLevel(2);

