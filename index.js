const connuri = 'postgres://iwosxfsxlsbdvi:7c6d034a16a9cf90378347660d7b1af6d50d0a521a92ce3a398c242a57c3309f@ec2-63-34-223-144.eu-west-1.compute.amazonaws.com:5432/d39g8ljitk7ijg'

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

const express = require('express')
const app = express()
app.set('view engine', 'pug')
app.use(require('body-parser').urlencoded({ extended: false }))
const port = 80

const { Pool, Client } = require('pg')

const connectionString = connuri + '?sslmode=require'

const client = new Client ({ connectionString })

client.connect()


app.get('/', (req, res) => {
  client.query('SELECT generate_series(1, 100) AS falafel', (err, data) => {
    console.log(data);
    res.render('index', {rows: data.rows})
  })
})

app.post('/', (req, res) => {
  console.log(req.body);
  client.query('SELECT generate_series(1, '+req.body.limit+') AS falafel',
     (err, data) => {
       res.render('index', {rows: data.rows});
     })
})

app.listen(port, () => {
  console.log(`App listening on ${port}`)
})
