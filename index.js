const {
 Client, AccountCreateTransaction, AccountBalanceQuery,
 PrivateKey, Hbar, TransferTransaction,
} = require('@hashgraph/sdk')
const { config } = require('dotenv');

config();

const parseEnv = () => {

    if (!process.env.HEDERA_ACCOUNT_ID) {
        throw new Error('missing HEDERA_ACCOUNT_ID')
    }

    if (!process.env.HEDERA_PRIVATE_KEY) {
        throw new Error('missing HEDERA_PRIVATE_KEY')
    }

    return {
        accountId: process.env.HEDERA_ACCOUNT_ID.trim(),
        privateKey: process.env.HEDERA_PRIVATE_KEY.trim(),
    }
}

const createAccountId = async (client) => {
    // create new keys
    const newAccountPrivateKey = PrivateKey.generateED25519()
    const newAccountPublicKey = newAccountPrivateKey.publicKey

    const newAccount = await new AccountCreateTransaction()
        .setKey(newAccountPublicKey)
        .setInitialBalance(Hbar.fromTinybars(100))
        .execute(client)

    // get receipt
    const receipt = await newAccount.getReceipt(client)
    return receipt.accountId
}

const getAccountBalance = async (client, accountId) => {
    const balance = await new AccountBalanceQuery()
        .setAccountId(accountId)
        .execute(client)
    
    return balance.hbars.toTinybars()
}

const transferMoney = async (client, senderAccountId, receiverAccountId, amount) => {
    const transferTx = await new TransferTransaction()
        .addHbarTransfer(senderAccountId, Hbar.fromTinybars(-amount))
        .addHbarTransfer(receiverAccountId, Hbar.fromTinybars(amount))
        .execute(client)

    return transferTx
}

const transferMoneyAndGetReceipt = async (client, senderAccountId, receiverAccountId, amount) => {
    const transferTx = await transferMoney(client, senderAccountId, receiverAccountId, amount)
    console.log('The transfer transaction from the new account to my account was: ', transferTx.transactionId.toString())

    // get receipt
    const transferReceipt = await transferTx.getReceipt(client)
    return transferReceipt
}

const getQueryCost = async (client, accountId) => {
    const queryCost = await new AccountBalanceQuery()
        .setAccountId(accountId)
        .getCost(client)
    
    return queryCost.toTinybars()
}

async function main() {
    const envs = parseEnv()

    const client = Client.forTestnet()
    client.setOperator(envs.accountId, envs.privateKey)

    const newAccountId = await createAccountId(client)
    console.log('new account ID:', newAccountId.toString())

    const balance = await getAccountBalance(client, newAccountId)
    console.log('balance: ', balance, " tinybars")

    const transferReceipt = await transferMoneyAndGetReceipt(
        client, newAccountId, envs.accountId, 1000
    )
    console.log('The transfer transaction from my account to the new account was: ', transferReceipt.status.toString())

    const queryCost = await getQueryCost(client, newAccountId)
    console.log('The cost of query is: ', queryCost)

    const newBalance = await getAccountBalance(client, newAccountId)
    console.log('balance: ', newBalance, " Tinybars")
}

main()
