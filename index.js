var express = require('express');
var mysql = require('mysql');
const app = express();

var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

var connection = mysql.createConnection({
    host: 'localhost',
    user: 'admin',
    password: 'Admin@1234',
    database: 'Platform3solutions'
});

connection.connect();

var cors = require('cors');
var corsOptions = {
    credentials: true,
    origin: ["http://localhost:3000", "http://localhost:20002", "http://platform3solutions.in", "http://www.platform3solutions.in"],
    origin: function (origin, callback) {
        callback(null, true)
    },
    allowedHeaders: "Accept, Origin, X-Requested-With, X-Auth-Token, X-Auth-Userid, Authorization, Content-Type, Cache-Control, X-Session-ID, Access-Control-Allow-Origin, x-app-version, X-GEO-TOKEN, X-Geo-Token, x-geo-token, x-device-token",
};

app.use(cors(corsOptions));
app.options("*", cors());

app.get('/', function (req, res) {
    res.send('Atm Module')
});

function calculateThresholdAmount(threshold){
    let total = 0;
    if(threshold.Hundred) total += (100 * threshold.Hundred)
    if(threshold.FiveHundred) total += (500 * threshold.FiveHundred)
    if(threshold.TwoThousand) total += (2000 * threshold.TwoThousand)
    return total;
}

function fetchDenomination(amount, threshold) {
    console.log('threshold passed',threshold)
    const result = {
        Hundred: threshold.Hundred ? threshold.Hundred : 0,
        FiveHundred: threshold.FiveHundred ? threshold.FiveHundred : 0,
        TwoThousand: threshold.TwoThousand ? threshold.TwoThousand : 0
    }
    console.log('basic result from system threshold', result)
    const thresholdTotal = calculateThresholdAmount(threshold);
    console.log('system threshold Amount' , thresholdTotal)
    const remainingAmount = amount - thresholdTotal;
    if(remainingAmount > 0) result.Hundred += remainingAmount/100;
    return result;
    // var notes;
    // var avlcurrency = [2000, 500, 100];
    // var notenumber = [];

    // for (var i = 0; i < avlcurrency.length; i++) {
    //     notes = amount / avlcurrency[i];

    //     if (notes) {
    //         amount = amount % avlcurrency[i];
    //         notenumber[i] = notes;
    //         console.log('notes');
    //     }
    // }
}
// sample usage
// denomination(6000);

app.get('/accountbalance', function (req, res) {
    // res.send('Available Balance')
    connection.query(`Select * from ATMBalance where id =${req.headers.id} `, function (err, result, fields) {
        // throe error from mysql
        if (err) throw err;
        // return error if user does not exists 
        if (!result.length) res.status(400).send({ message: "user not found" });

        console.log(result);
        res.status(200).send({ message: "Balance fetched Successfully", balance: result[0].Balance });
    });
});

app.post('/withdrawal', (req, res) => {
    // Body validation
    if (!req.headers.id || !req.body.amount) res.status(400).send({ message: req.headers.id ? "amount is required" : "id is required" });

    // check if user is having sufficent balance 
    connection.query(`Select * from ATMBalance where id =${req.headers.id} `, function (err, result, fields) {
        if (!result.length) res.status(400).send({ message: "user not found" });

        console.log('user balance', result[0].Balance);
        if (result[0].Balance < req.body.amount) res.status(400).send({ message: "insufficent funds!" });

        // fetch threshold values 
        connection.query(`Select * from ThresholdValues where Amount <= ${req.body.amount} order by Amount desc `, function (err, threshold, fields) {
            threshold = threshold[0]; //pick max 

            // calculate withdrawable notes 
            const denominations = fetchDenomination(req.body.amount, threshold)
            // update user amount
            connection.query(`update ATMBalance set balance = ${result[0].Balance - req.body.amount} where id =${req.headers.id}`, function (err, success, fields) {
                res.status(200).send({ message: "Withdraw Successfull", balance: denominations });
            });
        });

    });







    // return success



    // console.log(req.body.amount, 'Entered amount to be withdrawn')
    // const result = denomination(req.body.amount);
    // res.status(200).send({ message: "Withdraw Successfull", balance: result });
});

app.listen(8008);
console.log('App listening on port 8008')