import { WebSocketServer, } from "ws";
import { nanoid } from "nanoid/non-secure"
import { createServer } from 'https';
import { readFileSync } from 'fs';
import e from "express"
import { config } from "dotenv";
import * as jose from "jose";

config({path:"./.env"})

if(!process.env.JWT_KEY) throw new Error("secret does not exits");

const key = new TextEncoder().encode(process.env.JWT_KEY);


const generateToken = async (name:string) => {
    const token = new jose.SignJWT({role:"admin"}).setSubject(name).setProtectedHeader({alg:"HS256"}).setExpirationTime("2h").sign(key);

    return token;
}

const verifyToken = async (token:string) => {
    const {payload,protectedHeader} = await jose.jwtVerify(token,key);

    return payload;
}

const app = e();
app.use(e.json());
const server = createServer(app);

type usersType = {
    name:string,
    password:string
}

const users:Array<usersType> = [];

app.get("/", (req, res) => res.end("hello from the server"));

app.post("/signup",async (req,res)=>{
   try {
       const { name, password } = await req.body;

       if (!name || !password) return res.end("all field are required");
       users.push({ name, password });

       res.end("user created succesfully");
   } catch (error) {
        console.log(error);
        res.end("there is some error");
   }
})


app.post("/login",async (req,res)=>{
    try {
        const { name, password } = await req.body;
        console.log(name,password)
        if (!name || !password) return res.end("all field are required");
        users.forEach(async (user) => {
            if (user.name == name && user.password == password) {
                const tk = await generateToken(user.name);

                res.setHeader("Authorization",`Bearer ${tk}`);

                return res.end("user loged in successfully");
            }
        })

        return res.end("email and password does not match");
    } catch (error) {
        return res.end("there is some erro");
    }
})









const wss = new WebSocketServer({ server, path: "/api/ws" });
const idToClient = new Map();


type payloadType = {
    type: string,
    data: string
}

wss.on("connection", (ws, req) => {
    //authentication part will go here using req


    ws.on("message", (data) => {48
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