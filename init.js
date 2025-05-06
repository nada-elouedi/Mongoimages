db = db.getSiblingDB("admin");

var user = process.env.MONGO_INITDB_ROOT_USERNAME;
var password = process.env.MONGO_INITDB_ROOT_PASSWORD;

if (user && password) {
    var userExists = db.system.users.find({ user: user }).count() > 0;
    
    if (!userExists) {
        print("✅ Creating root user: " + user);
        db.createUser({
            user: user,
            pwd: password,
            roles: [ { role: "root", db: "admin" } ]
        });
    } else {
        print("⚠️ User already exists: " + user + ". Skipping creation.");
    }
}

