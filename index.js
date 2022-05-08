const express = require("express");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const { send } = require("express/lib/response");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

// verify JWT (json web token)
const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const accessToken = authHeader.split(" ")[1];
  jwt.verify(accessToken, process.env.SECRETE_TOKEN_ACCESS, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    if (decoded) {
      req.decoded = decoded;
      next();
    }
  });
};

//mongodb
const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASS}@cluster0.zgrq2.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// start api function
const run = async () => {
  try {
    await client.connect();
    const productsCollection = client.db("carle_warehouse").collection("products");

    //auth
    app.post("/login", async (req, res) => {
      const email = req.body;
      const token = jwt.sign(email, process.env.SECRETE_TOKEN_ACCESS, { expiresIn: "1d" });
      res.send({ token });
    });

    //post products
    app.post("/products", async (req, res) => {
      const product = req.body;
      const result = await productsCollection.insertOne(product);
      res.send(result);
    });

    //get products
    app.get("/products", async (req, res) => {
      const query = {};
      const cursor = productsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    //my all items
    app.get("/myitem", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded;
      if (decodedEmail.email === email) {
        console.log(decodedEmail);
        const query = { email: email };
        const cursor = productsCollection.find(query);
        const result = await cursor.toArray();
        res.send(result);
      } else {
        res.status(403).send({ message: "forbidden access" });
      }
    });

    // update product
    app.put("/product/:id", async (req, res) => {
      const id = req.params.id;
      const quantity = req.body;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: quantity,
      };
      const result = await productsCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    // delete product
    app.delete("/product/:id", async (req, res) => {
      const inputId = req.params.id;
      console.log(inputId);
      const query = { _id: ObjectId(inputId) };
      const result = await productsCollection.deleteOne(query);
      res.send(result);
    });
  } finally {
    // await client.close()
  }
};

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Running Carle warehouse!");
});

app.listen(port, () => {
  console.log(`Running server port ${port}`);
});
