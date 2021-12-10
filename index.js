// Setup node js application with "express"
const express = require('express')
const app = express()
const port = 80

// Setup handlebars template engine
const { engine } = require('express-handlebars')
app.set('views', __dirname + '/views')
app.set('view engine', 'hbs')
app.engine('hbs', engine({
  layoutsDir: __dirname + '/views/layouts',
  extname: 'hbs' }))
app.use(require('body-parser').urlencoded({ extended: false }))
app.use(express.static('static'))

// Setup database connection
const connuri = process.env["DBCONN"];
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
const { Pool, Client } = require('pg')
const connectionString = connuri + '?sslmode=require'
const client = new Client ({ connectionString })
client.connect()


app.get('/', (req, res) => {
  res.render("index");
})

app.get('/customers', (req, res) => {
  var q = 'SELECT cno, name, count(id) as nrorders FROM customers '+
          'LEFT JOIN orders USING (cno) GROUP BY cno'
  doQuery(res, q, 'customers')
})

app.get('/customersearch', (req, res) => {
  var q = 'SELECT cno, name FROM customers '+
          'WHERE name like \'%'+req.query.search+'%\''
  doQuery(res, q, 'customers');
})

app.get('/shop/:offset', (req, res) => {
  var offset = Number(req.params.offset || 0);
  var q = 'SELECT * FROM products LIMIT 4 OFFSET '+offset;
  doQuery(res, q, 'shop', { next: offset+4})
})

app.post('/', (req, res) => {
  console.log(req.body);
  client.query('SELECT generate_series(1, '+req.body.limit+') AS number',
     (err, data) => {
       res.render('index', {rows: data.rows});
     })
})



app.listen(port, () => {
  console.log(`App listening on ${port}`)
})

function doQuery (res, query, template, params = {}) {
  client.query(query, 
    (err, data) => {
      if (err) {
        err.query = query;
        err.msg = String(err);
        res.render('error', err);
      } else {
        for (var key in params) {
          data[key] = params[key];
        }
        res.render(template, data)
      }
    }
  )
}
