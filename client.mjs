import * as grpc from '@grpc/grpc-js';
import * as crypto from 'crypto';
import { connect, signers } from '@hyperledger/fabric-gateway';
import { promises as fs } from 'fs';
import { TextDecoder } from 'util';

import { parse, stringify } from 'yaml'


var CHANNEL_NAME = "demo"
var CHAINCODE_NAME = "asset-dev"
var MSP_ID = "Org1MSP"
var HLF_USER = "admin"
var NETWORK_CONFIG_PATH = "./data/org1.yaml"

const utf8Decoder = new TextDecoder();

export async function newGrpcConnection(peerEndpoint, tlsRootCert) {
    const tlsCredentials = grpc.credentials.createSsl(Buffer.from(tlsRootCert));
    return new grpc.Client(peerEndpoint, tlsCredentials);
}


async function main() {
    const networkConfig = parse(await fs.readFile(NETWORK_CONFIG_PATH, 'utf8'));
    const adminUser = networkConfig["organizations"][MSP_ID]["users"][HLF_USER]
    const userCertificate = adminUser["cert"]["pem"]
    const userKey = adminUser["key"]["pem"]
    const identity = { mspId: MSP_ID,  credentials: Buffer.from(userCertificate)};
    const privateKey = crypto.createPrivateKey(userKey);
    const signer = signers.newPrivateKeySigner(privateKey);
    const tls = networkConfig["peers"]["org1-peer0.default"]["tlsCACerts"]["pem"]
    const client = await newGrpcConnection('peer0-org1.localho.st:443', tls)
    const gateway = await connect({ identity, signer, client });
    const network = await gateway.getNetwork(CHANNEL_NAME);
    const contract = await network.getContract(CHAINCODE_NAME);
    const getResult = await contract.evaluateTransaction('QueryAllCars');
    console.log('Get result:', utf8Decoder.decode(getResult));
}

main().catch(console.error);