import { WebSocketServer, } from "ws";
import  { nanoid }from "nanoid/non-secure"
import { createServer } from 'https';
import { readFileSync } from 'fs';

const server = createServer({
    cert: readFileSync('/path/to/cert.pem'),
    key: readFileSync('/path/to/key.pem')
});


const wss = new WebSocketServer({server});
const idToClient = new Map();

wss.on("connection",(ws,req)=>{
    console.log(req.headers);

    ws.on("message",(data)=>{
        ws.send("chal wait kar abhi sever ban raha hai ")
    })
})


wss.on("close",()=>{
    console.log("client disconnected from the server")
})

wss.on("listening",()=>{
    console.log("server started to listen");
})

server.listen(8080);