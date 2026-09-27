import { WebSocketServer } from "ws";
import { nanoid } from "nanoid/non-secure"
import { createServer } from 'https';
import { readFileSync } from 'fs';
import e from "express"
import { config } from "dotenv";
import * as jose from "jose";
import type { IncomingMessage } from "http";
import type WebSocket from "ws";

config({ path: "./.env" })

if (!process.env.JWT_KEY) throw new Error("secret does not exits");

const key = new TextEncoder().encode(process.env.JWT_KEY);


const generateToken = async (name: string) => {
    const token = new jose.SignJWT({ role: "admin" }).setSubject(name).setProtectedHeader({ alg: "HS256" }).setExpirationTime("2h").sign(key);

    return token;
}

const verifyToken = async (token: string) => {
    const { payload, protectedHeader } = await jose.jwtVerify(token, key);
    return payload;
}

const app = e();




const users  = new Map<String,String>();

app.get("/",async (req, res) => {
    try {
      res.end("hello i am sever")
    } catch (error) {
        res.end("ther is smoe erer");
    }
});
app.use(e.json());

app.post("/signup", async (req, res) => {
    try {
        const { name, password } = req.body;
        console.log(name,password)
        if (!name || !password) return res.end("all field are requisred");
        let k = String(name).toString();
        let v = String(password).toString()
        users.set(k,v);

        res.end("user created succesfully");
    } catch (error) {
        console.log(error);
        res.end("there is some error");
    }
})


app.post("/login", async (req, res) => {
    try {
        const { name, password } =  req.body;

        if (!name || !password) return res.end("all field are required");
        if(users.get(name) === password){
            const token = await generateToken(name);
            res.setHeader("Authorization",`Bearer ${token}`);
            return res.end("user logged in successfully");
        }
        return res.end("email and password does not match");
    } catch (error) {
        return res.end("there is some error");
    }
})



async function AuthHandler(ws:WebSocket,req:IncomingMessage){
    const token = req.headers.authorization?.split(" ")[1];
    if (!token || token == undefined){
        ws.emit("you need to login first");
        ws.close();
    };
    const py = await verifyToken(token!);
    return py;
}



const server = createServer(app);



const wss = new WebSocketServer({ server, path: "/api/ws" });
const idToClient = new Map();


type payloadType = {
    type: string,
    data: string
}

wss.on("connection", (ws, req) => {
    let data = AuthHandler(ws,req);
    ws.send("your are good to go");
    ws.on("message", (data) => {
        try {
            const pay = "{type: call}";

            console.log(JSON.parse(pay));

            // if (payload.type == "offer") {

            // } else if (payload.type == "answer") {

            // } else if (payload.type == "ice-candidate") {

            // } else {
            //     ws.emit("no data we have")   
            // }

            ws.emit("no message reacive")
        } catch (error) {
            console.log(error);
            ws.send("there is not data")
        }
    })

    ws.on("close", (code, reson) => {
        console.log(`client ended the connectin this is the  ${code} and the reason for it is ${reson}`);
    })

})


wss.on("close", () => {
    console.log("client disconnected from the server")
})

wss.on("listening", () => {
    console.log("server started to listen");
})

server.listen(8080);