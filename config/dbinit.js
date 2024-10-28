const {Client} = require("pg");
require('dotenv').config();

const SQL = ` 
CREATE TABLE IF NOT EXISTS file_uploader_session (
  sid VARCHAR NOT NULL PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,        
  username VARCHAR(255) NOT NULL UNIQUE, 
  hash TEXT NOT NULL,            -- Hash of the password
  salt TEXT NOT NULL             -- Salt used for hashing
);

CREATE TABLE IF NOT EXISTS folders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),  
  name VARCHAR(255) NOT NULL,            
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  share_expiration TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS files (
  id SERIAL PRIMARY KEY,
  user_id INTEGER, 
  folder_id INTEGER, 
  url VARCHAR(255) NOT NULL,
  public_id VARCHAR(255) NOT NULL,
  resource_type VARCHAR(100),
  type VARCHAR(100),                  
  size INTEGER NOT NULL,                             
  created_at TIMESTAMPTZ NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE
);
`;

async function main(){
    console.log('seeding...');
    const client = new Client({
        connectionString: `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`,
    });
    await client.connect();
    await client.query(SQL);
    await client.end();
    console.log('done');
}

main();