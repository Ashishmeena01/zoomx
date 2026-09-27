import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http"; // Changed from https to http (use https only with SSL cert options)
import type { IncomingMessage } from "http";
import express from "express";
import { config } from "dotenv";
import * as jose from "jose";

config({ path: "./.env" });

if (!process.env.JWT_KEY) throw new Error("secret does not exist");

const key = new TextEncoder().encode(process.env.JWT_KEY);

const generateToken = async (name: string) => {
    return await new jose.SignJWT({ role: "admin" })
        .setSubject(name)
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("2h")
        .sign(key);
};

const verifyToken = async (token: string) => {
    const { payload } = await jose.jwtVerify(token, key);
    return payload;
};

const app = express();

// Middleware placed BEFORE route definitions
app.use(express.json());

const users = new Map<string, string>();

app.get("/", async (req, res) => {
    try {
        res.end("hello i am server");
    } catch (error) {
        res.end("there is some error");
    }
});

app.post("/signup", async (req, res) => {
    try {
        const { name, password } = req.body;
        if (!name || !password) return res.end("all fields are required");

        users.set(String(name), String(password));
        res.end("user created successfully");
    } catch (error) {
        console.log(error);
        res.end("there is some error");
    }
});

app.post("/login", async (req, res) => {
    try {
        const { name, password } = req.body;

        if (!name || !password) return res.end("all fields are required");

        if (users.get(name) === password) {
            const token = await generateToken(name);
            res.setHeader("Authorization", `Bearer ${token}`);
            return res.end("user logged in successfully");
        }
        return res.end("email and password do not match");
    } catch (error) {
        return res.end("there is some error");
    }
});

async function AuthHandler(ws: WebSocket, req: IncomingMessage) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];

    if (!token) {
        throw new Error("Missing authorization token");
    }

    return await verifyToken(token);
}

const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/api/ws" });

const activeUser = new Map<string,WebSocket>();

wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
    let userPayload;

    try {
        userPayload = await AuthHandler(ws, req);
        ws.send(JSON.stringify({ type: "system", data: "you are good to go" }));
        activeUser.set(userPayload.sub,ws);
    } catch (error) {
        ws.send(JSON.stringify({ type: "error", data: "Unauthorized: Invalid or missing token" }));
        ws.close();
        return; // Prevent listeners from attaching if unauthorized
    }

    interface msgSend{
        type:string
        to:string,
        data:"string"
    }

    ws.on("message", (message) => {
        try {
            const parsedData:msgSend = JSON.parse(message.toString());
            console.log("Received message:", parsedData);
            if(parsedData.type === "send-message"){
                const user2 = activeUser.get(parsedData.to);
                user2?.send(JSON.stringify({from:userPayload.sub,data:parsedData.data}));
            }else{
                ws.send("it should be valid type of payload")
            }


        } catch (error) {
            console.log("Invalid JSON received:", error);
            ws.send(JSON.stringify({ type: "error", data: "Invalid JSON payload" }));
        }
    });

    ws.on("close", (code, reason) => {
        console.log(`Client disconnected with code ${code}, reason: ${reason.toString()}`);
    });
});

wss.on("close", () => {
    console.log("WebSocket server closed");
});

wss.on("listening", () => {
    console.log("WebSocket server is listening");
});

server.listen(8080, () => {
    console.log("Server running on port 8080");
});