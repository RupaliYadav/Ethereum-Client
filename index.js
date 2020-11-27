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
        //0xcf825420db56cb882de2ca9d36f7d39ce69ffaee9b5f5ff4830cc46618d7deef
        //txId=0x8237ab106c4434a3d417fe3883f13c0ae73a6b182d40b361d9895ae499ff36f3
        web3.eth.getTransaction(req.params.txId, function (err, txResult) {
            if (err) {
                console.log(err)
                res.json({
                    "res": false
                });
            } else {

                if (txResult.input === '0x') {
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
                                    //console.log(web3.utils.fromWei(result, "ether") + " ETH")
                                    console.log("result obtained is :: ", result);
                                    transactionStatus = result.status ? "confirmed" : "not-confirm";
                                    // console.log("input  is :: ",web3.utils.toAscii(result.input));
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
                        else {
                            console.log("Response of Code is ", code);
                        }
                    })
                } else {

                    //Check and run transaction of Token
                    //0xcf825420db56cb882de2ca9d36f7d39ce69ffaee9b5f5ff4830cc46618d7deef
                    //0xb54ced6081b7812297c4170c082d54bf40567ccbfbce0bd35ad9b24bd4ec4e51    
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
                            //to == out
                            //from == in
                            //console.log(web3.utils.fromWei(result, "ether") + " ETH")

                            console.log("getTransactionReceipt obtained is :: ", result);
                            let logRecords = result.logs;
                            const decodedLogs = abiDecoder.decodeLogs(result.logs);

                            console.log("Decoded logs are:: ", decodedLogs);
                            decodedLogs.forEach(decoded => {
                                console.log("############ status is ", result.status);
                                console.log("######### element block no is ", result.blockNumber);
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