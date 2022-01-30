import express, { json } from "express";
import cors from "cors";
import { MongoClient } from "mongodb";

import dotenv from "dotenv";
dotenv.config();

import joi from "joi";

const userSchema = joi.object({
  name: joi.string().required(),
});

const server = express();
server.use(json());
server.use(cors());

const mongoClient = new MongoClient("mongodb://localhost:27017");
let db;
mongoClient.connect().then(() => {
  db = mongoClient.db("bate-papo-uol");
});

server.post("/participants", (req, res) => {
  const validation = userSchema.validate(req.body);

  if (validation.error) {
    console.log(validation.error.details);
    res.sendStatus(422);
    return;
  }
  console.log(Date.now());

  db.collection("participants").insertOne({
    name: req.body.name,
    lastStatus: Date.now(),
  });

  db.collection("participants")
    .find()
    .toArray()
    .then((obj) => console.log(obj));

  res.sendStatus(200);
});

server.listen(5000);
