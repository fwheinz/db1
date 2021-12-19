// Setup node js application with "express"
const express = require('express')
const app = express()
const port = 80
// Serve static files from folder 'static'
app.use(express.static('static'))
// Decode form submitted values to req.body.<key>
app.use(require('body-parser').urlencoded({ extended: false }))
// Permit session persistent data in req.session.<key>
const session = require('express-session')
app.use(session({ secret: 'masterblaster', cookie: { maxAge: 86400000 }}))

// Setup handlebars template engine
const { engine } = require('express-handlebars')
app.set('views', __dirname + '/views')
app.set('view engine', 'hbs')
app.engine('hbs', engine({
  layoutsDir: __dirname + '/views/layouts',
  extname: 'hbs' }))

// Setup database connection
const connuri = process.env["DBCONN"]
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0
const { Pool, Client } = require('pg')
const connectionString = connuri + '?sslmode=require'
const client = new Client ({ connectionString })
client.connect()

app.use(function (req, res, next) {
  console.log(req);
  if (!req.session.user && req.path != "/login") {
    res.render('login');
  } else {
    next();
  }
});

/**********************************************************************/
/*                                                                    */
/*             Routes and views for the webshop application           */
/*                                                                    */
/**********************************************************************/ 

// Log into the webshop. Check username and password and set the
// session variable "user" and "name" if authentication succeeds
app.post('/login', (req, res) => {
  client.query({
    text: 'SELECT * FROM customers WHERE cno=$1 AND password=$2',
    values: [req.body.username, req.body.password]},
    (err, data) => {
      if (!err && data.rowCount == 1) {
        req.session.user = data.rows[0].cno
        req.session.name = data.rows[0].name
        res.redirect(301, '/')
      } else {
        res.render('login', {err: 'Authentication failed'})
      }
    })
})
 

// Log out from the webshop by unsetting the session variables
app.get('/logout', (req, res) => {
  req.session.user = undefined;
  req.session.name = undefined;
  res.render('login')
})

// Render the page views/index.hbs
app.get('/', (req, res) => {
  res.render('index', {name: req.session.name})
})

// Render the page views/admin.hbs
app.get('/admin', (req, res) => {
  res.render('admin', {name: "Aperture"})
})

// Render a list of all customers
app.get('/customers', (req, res) => {
  let q1 = 'SELECT cno, name, count(id) as nrorders FROM customers '+
          'LEFT JOIN orders USING (cno) GROUP BY cno,name ORDER BY name'
  let q2 = 'SELECT count(*) AS numbercustomers FROM customers'
  doQuery(res, 'customers', null, q1, q2)
})

// Render customer search result
app.post('/customersearch', (req, res) => {
  let search = req.body.search
  let q = 'SELECT cno, name FROM customers '+
          `WHERE name like '%${search}%'`
  doQuery(res, 'customers', null, q);
})

// Show the items of the webshop at a given offset
// This query uses a prepared statement
app.get('/shop/:offset', (req, res) => {
  let offset = Number(req.params.offset)
  let q = { text: 'SELECT * FROM products LIMIT 4 OFFSET $1',
            values: [offset] }
  doQuery(res, 'shop', { next: offset+4, 
                         prev: offset-4}, q)
})

// Show the items of the webshop at a given offset
// This query uses a prepared statement
app.post('/shopsearch', (req, res) => {
  let offset = Number(req.params.offset)
  let pattern = req.body.pattern
  let q = `SELECT name,price FROM products WHERE name LIKE '%${pattern}%'`
  doQuery(res, 'shop', { next: 0, 
                         prev: 0}, q)
})



// Perform a database query
// res:      the response context
// query:    the database query to perform 
// template: the template file to render (in directory "views")
// params:   further parameters to pass to the template
function doQuery (res, template, params, ...queries) {
  _doQuery(res, template, params || {}, 1, queries)
}
function _doQuery (res, template, params, depth, queries) {
  if (queries.length > 0) {
    let query = queries.shift();
    client.query(query, 
      (err, data) => {
        if (err) {
          err.query = JSON.stringify(query);
          err.msg = err.message
          res.render('error', err)
        } else {
          console.log(JSON.stringify(data))
          params['result'+depth] = data
          _doQuery(res, template, params, depth+1, queries)
        }
      }
    )
  } else {
    return res.render(template, params)
  }
}

// Open listen port and serve requests
app.listen(port, () => {
  console.log(`App listening on ${port}`)
})
