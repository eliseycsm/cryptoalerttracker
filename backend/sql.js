require('dotenv').config()
const sql = require('mysql2/promise')
const fs = require('fs')

const pool = sql.createPool({
    host: process.env.MYSQL_SERVER,
	port: process.env.MYSQL_SVR_PORT,
	user: process.env.MYSQL_USERNAME,
	password: process.env.MYSQL_PASSWORD,
	database: process.env.MYSQL_SCHEMA,
	connectionLimit: process.env.MYSQL_CONN_LIMIT,
	connectTimeout: 20000,
	waitForConnections: true,
	//comment out ssl if running locally, ssl for digital ocean
	ssl: {
		ca: fs.readFileSync(__dirname + '/certs/ca-certificate.crt'),
	  },
	timezone: "+08:00",
})

//SQL statements
const SQL_GET_LOGIN_USER = 'select user_id, username, email from users where username=? and password=sha1(?)'
const SQL_GET_USER_DETAILS = 'select username, email from users where user_id=?'
const SQL_ADD_NEW_USER = 'insert into users (username, password, email) values (?,sha1(?), ?)'
const SQL_GET_USER_DETAILS_FROM_EMAIL = 'select * from users where email=?'

const makeQuery = (sqlStmt, pool) => {
	return async (args) => {
		const conn = await pool.getConnection()
		try {
			let results = await conn.query(sqlStmt, args || [])
			return results[0]
		} catch (e) {
			console.error(e)
			throw e
		} finally {
			conn.release()
		}
	};
};

const authLoginUser = makeQuery(SQL_GET_LOGIN_USER, pool)
const addNewUser = makeQuery(SQL_ADD_NEW_USER, pool)
const getUserDetailsFromSQL = makeQuery(SQL_GET_USER_DETAILS, pool)
const getUserDetailsViaEmail = makeQuery(SQL_GET_USER_DETAILS_FROM_EMAIL, pool)

module.exports = {pool, authLoginUser, addNewUser, getUserDetailsFromSQL, getUserDetailsViaEmail ,SQL_ADD_NEW_USER, SQL_GET_LOGIN_USER}