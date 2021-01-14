const {Timestamp, MongoClient} = require('mongodb') 
const ObjectId = require('mongodb').ObjectID
const { v4: uuidv4 } = require('uuid')

//config mongodb
const MONGO_DATABASE = 'crypto'
const MONGO_COLLECTION = 'portfolios'
const LIMIT = 5

const MONGO_URL = 'mongodb://localhost:27017'

const uri = `mongodb+srv://fred:${process.env.MONGO_PW}@paf-cluster.7ywpi.mongodb.net/${MONGO_DATABASE}?retryWrites=true&w=majority`
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true }); //replace with uri

function mergeCoinData(apidata, ngdata) {
    var id = uuidv4()

    const coinData = {
        
        entryId: ngdata.entryId || id.substring(0, 8),
        id: apidata.id,
        currency: apidata.currency,
        symbol: apidata.symbol,
        name: apidata.name,
        price: apidata.price,
        price_date: apidata.price_date,
        price_timestamp: apidata.price_timestamp,
        dateBought: ngdata.date,
        units: ngdata.units,
        boughtPrice: ngdata.boughtPrice,
        targetProfit: ngdata.targetProfit,
        targetPrice: ngdata.boughtPrice + ngdata.boughtPrice * ngdata.targetProfit /100,
        notify: ngdata.notify
    }
    
    
    return coinData
}

//GET PORTFOLIO DATA
async function getPortfolioFromMongo(userId){
    const result = await client.db(MONGO_DATABASE).collection(MONGO_COLLECTION).find({userId}).toArray()
    
    return result
}
//POST PORTFOLIO DATA
async function addNewPortfolio(userSet){
    const result = await client.db(MONGO_DATABASE).collection(MONGO_COLLECTION).insertOne(userSet)
    return result
}

//ADD COIN TO PORTFOLIO DATA
const addCoinToExistingPortfolio = async(userId, record) => {
    
    const result = await client.db(MONGO_DATABASE).collection(MONGO_COLLECTION)
        .updateOne( { userId } ,{ $set: { portfolio: record.portfolio}})
    
    return result.modifiedCount
}

//UPDATE COIN DATA
const updateCoinToPortfolio = async(userId, coinData) => {
    const coinId = coinData.id
    try{
    const record = await getPortfolioFromMongo(userId)
    const pf = record[0]
    const idx = pf.portfolio.findIndex(e => e.entryId == coinData.entryId)
    pf.portfolio.splice(idx, 1, coinData)
    const result = await addCoinToExistingPortfolio(userId, pf)
    return result
    }catch(e){
        throw e
    }
}

//delete entry from portfolio
const deleteEntryFromPortfolio = async(userId, entryId) =>{
    const result = await client.db(MONGO_DATABASE).collection(MONGO_COLLECTION)
    .updateOne({'userId': userId}, {$pull: {'portfolio': {'entryId': entryId}}})
    
    return result.modifiedCount //return 1
}

//get list of ppl to email to from mongo
const getEmailListData = async() => {
    const agg = [
    {
      '$unwind': {
        'path': '$portfolio', 
        'preserveNullAndEmptyArrays': false
      }
    }, {
      '$match': {
        'portfolio.notify': 'yes'
      }
    }, {
      '$group': {
        '_id': '$portfolio.id', 
        'sendTo': {
          '$push': '$$ROOT'
        }
      }
    }, {
      '$project': {
        'userId': 1, 
        'sendTo.userId': 1, 
        'sendTo.portfolio.boughtPrice': 1, 
        "sendTo.portfolio.targetProfit": 1,
        'sendTo.portfolio.targetPrice': 1, 
        'sendTo.portfolio.id': 1
      }
    }
  ];
    const coll = await client.db(MONGO_DATABASE).collection(MONGO_COLLECTION)
        .aggregate(agg).toArray()
  
    return coll
      
    
}

module.exports = {client, getEmailListData, deleteEntryFromPortfolio, updateCoinToPortfolio, getPortfolioFromMongo, addCoinToExistingPortfolio, addNewPortfolio, mergeCoinData}