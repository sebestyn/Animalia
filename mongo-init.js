// MongoDB initialization script
// Creates the animalia database and a user with read/write access

db = db.getSiblingDB('animalia');

// Create collections
db.createCollection('szekrenies');
db.createCollection('leaders');

print('Database and collections created successfully');
