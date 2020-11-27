const abiDecoder = require('abi-decoder');
const express = require('express')
const Web3 = require("web3")

const props = require("./config/dev_config..json")
const app = express()
const port = 3000

const web3 = new Web3(new Web3.providers.HttpProvider(props.provider))
const ethchain = "ETH.main";
const currency = "ETH";
const erc20TransferEvent = props.erc20TransferEvent;

abiDecoder.addABI(erc20TransferEvent);

app.get('/eth/api/v1/transaction/:txId', (req, res) => {
    try {
        //getTransaction from transaction hash
        web3.eth.getTransaction(req.params.txId, function (err, txResult) {
            if (err) {
                console.log(err)
                res.json({
                    "res": false
                });
            } else {

                if (txResult.input === '0x') {
                    //Case 1 : Details about account transfers.
                    web3.eth.getCode(txResult.to, (error, code) => {
                        if (error) {
                            console.log("error: ", error);
                            res.json({
                                "res": false
                            });
                        }
                        else if (code === "0x") {
                            console.log("response of get code ", code);
                            let transactionStatus;
                            web3.eth.getTransactionReceipt(req.params.txId, function (err, result) {
                                if (err) {
                                    console.log(err)
                                    res.json({
                                        "res": false
                                    });
                                } else {
                                    transactionStatus = result.status ? "confirmed" : "not-confirm";
                                    res.send({
                                        "block": {
                                            "blockHeight": result.blockNumber
                                        },
                                        "outs": [
                                            {
                                                "address": result.to,
                                                "value": txResult.value
                                            }
                                        ],
                                        "ins": [
                                            {
                                                "address": result.from,
                                                "value": "-" + txResult.value
                                            }
                                        ],
                                        "hash": txResult.hash,
                                        "currency": currency,
                                        "chain": ethchain,
                                        "state": transactionStatus,
                                        "depositType": "account"

                                    })

                                }
                            })


                        }
                    })
                } else {
                    //CASE 2 :: Deatils of Token Transaction
                    web3.eth.getTransactionReceipt(req.params.txId, function (err, result) {
                        if (err) {
                            console.log(err);
                            res.json({
                                "res": false
                            });
                        } else {
                            let arrayIns = [];
                            let arrayOuts = [];
                            let status, blockNumber, hash;
                            
                            console.log("getTransactionReceipt obtained is :: ", result);
                            let logRecords = result.logs;
                            const decodedLogs = abiDecoder.decodeLogs(result.logs);

                            //console.log("Decoded logs are:: ", decodedLogs);
                            decodedLogs.forEach(decoded => {
                                status = result.status ? "confirmed" : "not-confirm";
                                blockNumber = result.blockNumber;
                                hash = result.transactionHash;

                                if (decoded != undefined) {
                                    let inArray = [];
                                    let outArray = [];
                                    decodedLogs.forEach(element => {

                                        console.log("Element is :: ", element);
                                        let inEntryJson = {};
                                        let outEntryJson = {};
                                        if (element) {

                                            element.events.forEach(data => {
                                                data.name === "from" ? inEntryJson["address"] = data.value : data.name === "to" ? outEntryJson["address"] = data.value : console.log(data.name, " value ", data.value);
                                                if (data.name === 'value') {
                                                    inEntryJson['value'] = "-" + data.value;
                                                    inEntryJson['type'] = "token";
                                                    inEntryJson["coinspecific"] = {
                                                        "tokenAddress": element.address
                                                    };
                                                    outEntryJson['value'] = data.value;
                                                    outEntryJson['type'] = "token";
                                                    outEntryJson["coinspecific"] = {
                                                        "tokenAddress": element.address
                                                    };
                                                }
                                            });
                                            inArray.push(inEntryJson);
                                            outArray.push(outEntryJson);

                                        }
                                    });

                                    res.json({
                                        "block": {
                                            "blockHeight": blockNumber
                                        },
                                        "outs": outArray,
                                        "ins": inArray,
                                        "hash": hash,
                                        "currency": currency,
                                        "state": status,
                                        "depositType": "Contract",
                                        "chain": ethchain
                                    });

                                } else {
                                    //CASE 3 :: 
                                    console.log("################# Transaction is of type contract method invoked");

                                    res.json({
                                        "block": {
                                            "blockHeight": blockNumber
                                        },
                                        "outs": [],
                                        "ins": [],
                                        "hash": hash,
                                        "currency": currency,
                                        "state": status,
                                        "depositType": "Contract",
                                        "chain": ethchain
                                    });
                                }
                            })


                        }

                    })

                }
            }
        })
    } catch (error) {
        console.log("error obtained is :: ", error);
        res.json({
            "res": false
        });
    }

})



app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})
