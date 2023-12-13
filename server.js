// importing
import dotenv from 'dotenv';
dotenv.config({ path: "./config.env" });
import express from 'express';
import mongoose from 'mongoose';
import Pusher from 'pusher';
import cors from 'cors';
import Messages from './dbMessages.js';

// app config
const app = express();
const port = process.env.PORT || 9000;

const pusher = new Pusher({
    appId: "1724231",
    key: process.env.KEY,
    secret: process.env.SECRET,
    cluster: "eu",
    useTLS: true
});

// middlewares
app.use(express.json());

app.use(cors()); // Allows all headers. It should be changed for production 


// DB config
const conn_url = `mongodb+srv://${process.env.USER}:${process.env.PASSWORD}@atlascluster.ojqv6jc.mongodb.net/${process.env.DB}?retryWrites=true&w=majority`;
mongoose.connect(conn_url);

const db = mongoose.connection;
db.once('open', () => {
    console.log('DB Connected');

    const msgCollection = db.collection("messagecontents");
    const changeStream = msgCollection.watch();

    changeStream.on('change', (change) => {
        console.log("A change occured", change);

        if (change.operationType === 'insert') {
            const messageDetails = change.fullDocument;
            pusher.trigger('messages', 'inserted',
                {
                    name: messageDetails.name,
                    message: messageDetails.message,
                    timestamp: messageDetails.timestamp
                })
        } else {
            console.log('Error triggering Pusher')
        }
    })
});


// api routes
app.get('/api/v1/messages/sync', (req, res) => {
    Messages.find()
        .then(data => res.status(200).send(data))
        .catch(err => res.status(500).send(err))
});

app.post('/api/v1/messages/new', (req, res) => {
    Messages.create(req.body)
        .then(data => res.status(201).send(data))
        .catch(err => res.status(500).send(err))
});





// listen
app.listen(port, () => console.log(`Listening on localhost: ${port}`));