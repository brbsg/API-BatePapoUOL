import express, { json } from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";

import dotenv from "dotenv";

import joi from "joi";

import dayjs from "dayjs";

//================================================

const userSchema = joi.object({
  name: joi.string().required(),
});

const messageSchema = joi.object({
  to: joi.string().required(),
  text: joi.string().required(),
  type: joi.valid("message", "private_message").required(),
});

//================================================

dotenv.config();
const server = express();
server.use(json());
server.use(cors());

//================================================

const mongoClient = new MongoClient("mongodb://localhost:27017");
let db;

mongoClient.connect().then(() => {
  db = mongoClient.db("bate-papo-uol");
});

//================================================

server.post("/participants", async (req, res) => {
  const validation = userSchema.validate(req.body);

  if (validation.error) {
    return res
      .status(422)
      .send(validation.error.details.map((err) => err.message));
  }

  const { name } = req.body;

  try {
    const registered = await db.collection("participants").findOne({ name });

    if (registered) {
      return res.status(409).send("Nome do usuário já existe.");
    }

    await db.collection("participants").insertOne({
      name: req.body.name,
      lastStatus: Date.now(),
    });

    const currentTime = dayjs().locale("pt-br").format("HH:mm:ss");

    await db.collection("messages").insertOne({
      from: name,
      to: "Todos",
      text: "entra na sala...",
      type: "message",
      time: currentTime,
    });

    res.sendStatus(201);
  } catch {
    res.sendStatus(500);
  }
});

//================================================

server.get("/participants", async (req, res) => {
  try {
    const allParticipants = await db
      .collection("participants")
      .find({})
      .toArray();
    res.status(200).send(allParticipants);
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

//================================================

server.post("/messages", async (req, res) => {
  console.log(req.body);

  const validation = messageSchema.validate(req.body);

  if (validation.error) {
    return res
      .status(422)
      .send(validation.error.details.map((err) => err.message));
  }

  const { user } = req.headers;
  const { to, text, type } = req.body;

  try {
    const registered = await db.collection("participants").findOne({ name });

    if (!participantRegistered) {
      return res.status(422).send("Usuário " + user + " não cadastrado.");
    }

    const time = dayjs().locale("pt-br").format("HH:mm:ss");

    await db.collection("messages").insertOne({
      from: user,
      to,
      text,
      type,
      time,
    });

    res.sendStatus(201);
  } catch {
    res.sendStatus(500);
  }
});

//================================================

server.get("/messages", async (req, res) => {
  const validation = userSchema.validate({ name: req.header.user });

  if (validation.error) {
    return res
      .status(422)
      .send(validation.error.details.map((err) => err.message));
  }

  const { user } = req.headers;
  const { limit } = req.query;

  try {
    const messages = await db.collection("messages").find({}).toArray();

    const invertedMessages = [...messages].reverse();

    const allowedMessages = invertedMessages.filter(
      (message) =>
        message.type === "message" ||
        message.from === user ||
        message.to === user
    );

    if (limit) {
      const sendLimitedMessages = [...allowedMessages].slice(
        0,
        parseInt(limit)
      );

      return res.status(200).send(sendLimitedMessages);
    }

    res.status(200).send(allowedMessages);
  } catch {
    res.sendStatus(500);
  }
});

//================================================

server.post("/status", async (req, res) => {
  const { user } = req.headers;

  try {
    try {
      const validParticipant = await db
        .collection("participants")
        .findOne({ name: user });

      if (!validParticipant || !user) {
        return res.sendStatus(404);
      }

      await db
        .collection("participants")
        .updateOne({ name: user }, { $set: { lastStatus: Date.now() } });
      res.sendStatus(200);
    } catch (error) {
      console.error(error);
      res.sendStatus(500);
    }
  } catch {
    res.sendStatus(500);
  }
});

//================================================

async function checkInactiveUsers() {
  const participants = await db.collection("participants").find({}).toArray();
  const time = dayjs().locale("pt-br").format("HH:mm:ss");
  participants.forEach(async (participant) => {
    if (Date.now() - participant.lastStatus > 10000) {
      await db.collection("messages").insertOne({
        from: participant.name,
        to: "Todos",
        text: "sai da sala...",
        type: "status",
        time,
      });
      await db.collection("participants").deleteOne({
        _id: new ObjectId(participant._id),
      });
    }
  });
}

setInterval(checkInactiveUsers, 1000);

server.listen(5000);
