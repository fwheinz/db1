console.log("Loading Data...")

const connuri = process.env["DBCONN"];
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
const { Pool, Client } = require('pg')
const connectionString = connuri + '?sslmode=require'
const client = new Client ({ connectionString })

const fs = require('fs');
const readline = require('readline');

async function query (q) {
  let res
  try {
    await client.query('BEGIN')
    try {
      res = await client.query(q)
      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      console.log(err)
      throw err
    }
  } finally {
  }
  return res
}

async function processLineByLine() {
  const fileStream = fs.createReadStream('data.sql');
  await client.connect()

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    console.log("querying "+line)
    await query(line);
  }
  console.log("All data loaded!")
  process.exit();
}

processLineByLine();
