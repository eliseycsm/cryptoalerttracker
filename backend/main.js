//actual app deployed in separate folder

const express = require('express')
const morgan = require('morgan')
const mysql = require('mysql2/promise')
require('dotenv').config()
const cors = require('cors')
const {pool, authLoginUser, addNewUser, SQL_GET_LOGIN_USER, getUserDetailsFromSQL, getUserDetailsViaEmail, SQL_ADD_NEW_USER} = require('./sql')
const jwt = require('jsonwebtoken')
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const fetch = require('node-fetch')
const withQuery = require('with-query').default
const { client, getPortfolioFromMongo, addCoinToExistingPortfolio, addNewPortfolio, mergeCoinData, updateCoinToPortfolio, deleteEntryFromPortfolio, getEmailListData} = require('./mongo')
const { sendEmail } = require('./nodemailer')
//


const TOKEN_SECRET = process.env.TOKEN_SECRET
const CRYPTO_ENDPOINT = 'https://api.nomics.com/v1/currencies/ticker'
const PORT= process.env.PORT || 3000

//config strategy
passport.use(new LocalStrategy(
    {usernameField: 'username', passwordField: 'password'},
    async (user, password, done) => {
        //authenticate if user exists in database
        console.info(`LocalStrategy>> username: ${user}, password: ${password}`)
        const conn = await pool.getConnection()
        try{
            const [result, _] = await conn.query(SQL_GET_LOGIN_USER, [user, password])
            console.info('>> result from sql for localStrat: ', result)
            if(result.length > 0){
                done(null, {
                    user_id: result[0].user_id,
                    username:result[0].username,
                    email: result[0].email,
                    loginTime: (new Date()).toString()
                })
            }else{
                done('Incorrect login', false)
            }
        } catch(e) {
            done(e, false)
        } finally {
            conn.release()
        }
    }
))

const mkAuth = (passport) => {
    return (req, resp, next) => {
        passport.authenticate('local',
            (err, user, info) => {
                if ((null != err) || (!user)) { //if there is no user
                    resp.status(401)
                    resp.type('application/json')
                    resp.json({ error: err })
                    return
                }
                // else attach user to the request object
                req.user = user
                next()
            }
        )(req, resp, next)
    }
}

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
    },
    async function(accessToken, refreshToken, profile, done) {
        const userProfile = profile
        //console.log("profile: ", profile)
        const email = userProfile.emails[0].value //profile.emails.verified implies google verified this email
        //check if email alr in userdb
        const details = await getUserDetailsViaEmail(email)
        console.log("details from sql for gmail signin: ", details)
        if (details.length>0) {//have existing user
            done(null, {
                user_id: details[0].user_id,
                username:details[0].username,
                email: details[0].email,
                loginTime: (new Date()).toString()
            })
        }else{
            try{
            const username = profile.displayName
            const password = 'signinbygmail'
            console.log("username, pw, email: ", username, password, email)
            const result = await addNewUser([username, password, email])
            console.log("result from adding new user: ", result)
            const details = await getUserDetailsViaEmail([email])
            console.log("adding new g-user & retrieving works!: ", details)
            done(null, {
                user_id: details[0].user_id,
                username:details[0].username,
                email: details[0].email,
                loginTime: (new Date()).toString()
            
            })
        }catch(e){
            console.error(`error creating acct for g-user:`, e)

            }
        }
    }
))

const localStrategyAuth = mkAuth(passport)

const app = express()
app.use(cors())
app.use(morgan('combined'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use(passport.initialize())

app.use(express.static(__dirname + '/client'))


app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] }))

app.get('/auth/google/callback', 
    passport.authenticate('google', {session: false}),
    async(req, res) =>{
        const result = req.user
        console.log("result from sql google auth: ", result)
        //generate jwt token for google user

        const timestamp = (new Date()).getTime() /1000
        const token = jwt.sign({
            sub: req.user.username,
            iss: 'tracker',
            iat: timestamp,
            exp: timestamp + (60*60),//valid for 1hr
            data: {
                user_id: req.user.user_id,
                email: req.user.email,
                loginTime: req.user.loginTime
            }

        }, TOKEN_SECRET)

        let responseHTML = '<html><head><title>Main</title></head><body></body><script>res = %value%; window.opener.postMessage(res, "*");window.close();</script></html>'
        responseHTML = responseHTML.replace('%value%', JSON.stringify({
        user: req.user,
        token
        }))
        res.status(200).send(responseHTML);
    // Successful authentication, redirect home.
    //res.redirect('/success');
})

// app.get('/success', (req, resp) => {
//     resp.status(200).send({message: 'google login ok'})
// })  

app.post('/login', localStrategyAuth, async(req, resp)=> {

    //console.log("received from ng: ", req.body)
    const result = req.user
    console.log("result from sql local auth: ", result)
    //const username = req.body.username, password = req.body.password
    //const result = await authLoginUser([username, password])
    

    const timestamp = (new Date()).getTime() /1000
    const token = jwt.sign({
        sub: req.user.username,
        iss: 'tracker',
        iat: timestamp,
        exp: timestamp + (60*60),
        data: {
            user_id: req.user.user_id,
            email: req.user.email,
            loginTime: req.user.loginTime
        }

    }, TOKEN_SECRET)
    resp.type('application/json')
    if (result.length <= 0){
        //no such existing user
        resp.status(401).end()
    }else{
        //resp.status(200).json(JSON.stringify(result))
        resp.status(200).json({message: `token issued at ${new Date()}`, token, result})
    }
})


app.post('/register', async(req, resp) => {
    console.log("received new user details: ", req.body)
    const username = req.body.username, password = req.body.password, email = req.body.email
    
    try{
        const result = await addNewUser([username, password, email])
        console.log("added new user successfully: ", result)
        resp.type('application/json')
        resp.status(200).end()
    }catch(e){
        console.error("error caught: ", e)
        resp.type('application/json')
        resp.status(500).end()
    } 
})



const getDataFromAPI = async(ids) => {
    const fullURL = withQuery(CRYPTO_ENDPOINT, {
        key: process.env.CRYPTO_APIKEY,
        ids: ids,
        interval: '1h',

    })
    //console.log('full url: ', fullURL)

    var result = await fetch(fullURL)
    result = await result.json()
    result = result.map(coin => {
        return {
            id: coin.id,
            currency: coin.currency,
            symbol: coin.symbol,
            name: coin.name,
            price: coin.price,
            price_date: coin.price_date,
            price_timestamp: coin.price_timestamp
        }
    })
    //console.log("result from site: ", result)
    return result
}

const checkAuth = (req, resp, next) => {
    // check if the request has Authorization header
    const auth = req.get('Authorization')
    if (null == auth) {
        resp.status(403)
        resp.json({ message: 'Missing Authorization header' })
        return
    }
    // Bearer authorization
    const terms = auth.split(' ')
    if ((terms.length != 2) || (terms[0] != 'Bearer')) {
        resp.status(403)
        resp.json({message: 'Incorrect Authorization'})
        return
    }
    const token = terms[1]
    try {
        const verified = jwt.verify(token, TOKEN_SECRET)
        console.info(`Verified token`, verified)
        req.token = verified
        next()
    } catch (e) {
        resp.status(403)
        resp.json({message: 'Incorrect token', error: e})
        return
    }
}

//PUT update entry
app.put('/updateentry', async(req, resp) => {
    console.log("in updateEntry: ", req.body)
    const ngdata = req.body
    const currency = req.body.currency
    const [apiResult] = await getDataFromAPI(currency) 
    const coinData = mergeCoinData(apiResult, ngdata)
    console.log("updated coin data: ", coinData)
    const userId = ngdata.userId

    const result = await updateCoinToPortfolio(userId, coinData) //returns 1
    resp.type('application/json')
    if(result == 1){
        resp.status(200).end()
    } else {
        resp.status(500).end()
    }
})

//GET /user/list/:userId
app.get('/user/list/:userId', checkAuth, async (req, resp) => {
    
    const userId = Number(req.params.userId)
    console.log("userId rcvd from ng: ", userId)
    //verify if user is valid via token

    //if valid token and user
    const result = await getPortfolioFromMongo(userId)

    resp.type('application/json')
    if (result.length <= 0){ //no record in mongo
        //insert new record to mongo
        const userSet = { userId, portfolio: []}
        console.log("new Portfolio: ", userSet)
        const resultFromAddNewPortfolio = await addNewPortfolio(userSet)
        console.log("add new portfolio?: ", resultFromAddNewPortfolio.ops)
        const result = resultFromAddNewPortfolio.ops
        resp.status(201).json({result})
    }else{
        resp.status(200).json({result})
    }     
})

//GET /user
app.get('/account', checkAuth, async (req, resp) => {
    const userId = req.query.userId
    console.log(`userId ${userId} for sql query`)
    const result = await getUserDetailsFromSQL(userId)
    console.log("user details: ", result)
    resp.type('application/json')
    if(result.length <= 0){ //no such user in database
        resp.status(403).end()
    }else{
        resp.status(200).json(result)
    }
})

//POST ADDCOIN
app.post('/addcoin', async(req, resp)=> {

    const userId = req.body.userId
    const currency = req.body.currency
    const ngdata = req.body
    console.log("req.body", ngdata)
    const [apiResult] = await getDataFromAPI(currency) //returns in an array
    //console.log("getAPIData for adding coin: ", result)
    //console.log("req.body in addcoin: ", req.body)

    //mergeCoinData
    const coinData = mergeCoinData(apiResult, ngdata)
    
    //check if userID alr exists in mongo - it should cos we create upon signing up
    const existingPortfolioResult = await getPortfolioFromMongo(userId) //returns array of results
    //if exists update coindata in portfolio
    //console.log("existingPortfolioResult.length: ", existingPortfolioResult)
    if (existingPortfolioResult.length >0 ){
        const record = existingPortfolioResult[0]
        record.portfolio.push(coinData)
        console.log("after adding new coin: ", record)
        const result = addCoinToExistingPortfolio(userId, record)
        resp.type('application/json')
        if (result){
            
            resp.status(200).end()
        }else{
            resp.status(500).end()
        }

    }
    //else return error
    else{
        resp.status(401).end()
    }
}) 

//DELETE entry
app.delete('/deleteentry', async(req, resp) =>{
    const entryId = req.query.entryId
    const userId = Number(req.query.userId)
    console.log(`${entryId} to be deleted under ${userId}`)
    const result = await deleteEntryFromPortfolio(userId, entryId)
    resp.type('application/json')
    if (result){
        resp.status(200).send({message: 'deleted from portfolio'})
    }else {
        resp.status(500).end()
    }
})

// app.get("/signout", (req, resp) =>{
//     req.logout()
//     res.status(200).end()
// })

//sendEmail function
const sendemail = async() => {
    const sendList = await getEmailListData()
    //console.log("sendList: ", sendList)
    let coins = []
    for (let coin of sendList){
        //console.log(coin['_id'])
        coins.push(coin['_id'])
    }
    coins = coins.join(",")
    console.log("coins: ", coins)
    const coinData = await getDataFromAPI(coins)
    console.log("coinData for sending out: ", coinData)
    for (let data of coinData){
        const coinId = data.id, coinName = data.name
        const latestPrice = data.price
        const receivers = sendList.find(c => c['_id'] == coinId)
        console.log("receivers: ", receivers.sendTo)
        for (let user of receivers.sendTo){
            const userId = user.userId
            const boughtPrice = user.portfolio.boughtPrice
            const targetPrice = user.portfolio.targetPrice
            const targetProfit = user.portfolio.targetProfit
            const notifyByEmail = Number(latestPrice) > targetPrice
            if(notifyByEmail){
                const userdetails = await getUserDetailsFromSQL(userId)
                console.log("userdetails: ", userdetails)
                if (userdetails.length <= 0){
                    resp.type('application/json')
                    resp.status(500).json({error: "user details not found"})
                }
                const username = userdetails[0].username, email = userdetails[0].email            
                const templateParams = {
                    username, email,
                    coinId, coinName,
                    boughtPrice, targetPrice,
                    targetProfit, latestPrice
                }
                sendEmail(templateParams).then(resp =>{
                    console.log(`email sent! at ${new Date()}`)
                }).catch(e => console.error("error sending email: ", e))
                
            }
        }
    }    
}

//repeat sendemail every 2mins **rmb to change to every hour
const repeat = setInterval(sendemail, 1000 * 60 *60)
app.get('/stoprepeat', (req,resp) =>{
    clearInterval(repeat)
    resp.type('application/json')
    resp.status(200).json({msg: 'stoprepeat cmd rcvd'})
})
//add safety function to stop calling

const p1 = client.connect()

//start sql connection
const startSQL = async(pool) => {
    const conn = await pool.getConnection()
    try{
        await conn.ping()
    }catch(e){
        console.error('Error connecting to mysql: ', e)
    }finally{
        conn.release()
    }
}

Promise.all([startSQL(pool), p1])
    .then(
        app.listen(PORT, () => {
        console.info(`App started on port ${PORT} at ${new Date()}`)
    })
    ).catch(e =>
    console.error(`Error connecting to databases: `, e))