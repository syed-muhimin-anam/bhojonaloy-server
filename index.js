const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;


// middleware 
app.use(cors());
app.use(express.json());

// 
// 

// mong db ********************************************************************************
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.a8zm4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    // db where stored data ###################################################################
    const foodCollections = client.db('restaurant').collection('foods');
    


    // get all foods *****************************************************
    app.get('/foods', async(req, res) => {
        const cursor = foodCollections.find().sort({ purchase: -1 }).limit(6);
        const result  = await cursor.toArray();
        res.send(result);
    })

    // get specific food by id 

    app.get('/foods/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await foodCollections.findOne(query);
      res.send(result);
    })



// purchase ##########################################################################################
const purchaseCollection = client.db('restaurant').collection('purchase');
// post purchase data to the db 
app.post('/purchase', async(req, res) => {
  const purchaseInfo = req.body;
  const result = await purchaseCollection.insertOne(purchaseInfo);
  
  res.send(result);
})
// get  purchase data  by user email
app.get('/purchase', async(req, res ) => {
  const email = req.query.email;
  const query = { "purchaseBy.email": email };
  const result  = await purchaseCollection.find(query).toArray();
  for(const food of result){
    console.log(food.food_id);
    const queryFood = {_id: new ObjectId(food.food_id)}
    const foodFind = await foodCollections.findOne(queryFood)
    if (foodFind) {
      
      food.foodImage = foodFind.foodImage;
      food.foodOrigin = foodFind.foodOrigin;
    }
  }
  res.send(result);
})










  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);





app.get('/', (req, res) => {
    res.send('welcome to bhojonaloy web server')
});
app.listen(port, () => {
    console.log(`server is running on port: ${port}`)
})