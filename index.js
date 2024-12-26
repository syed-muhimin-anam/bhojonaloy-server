const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;


// middleware 
app.use(cors({
  origin:['http://localhost:5173'],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// custom middleware for verify token 
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({message:'unauthorized access'})
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({message:'unauthorized access'})
    }
    req.user = decoded;
    next();
  })
}

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

    // jwt create token *************************************
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '5h'});
      res
      .cookie('token', token, {
        httpOnly: true,
        secure: false
      })
      .send({success: true})
    })

    app.post('/logout', (req, res) => {
      res.clearCookie('token', {
        httpOnly: true,
        secure: false
      })
      .send({success: true})
    })


    // post food item
    app.post('/foods', async (req, res) => {
      const foodData = req.body;
      const result = await foodCollections.insertOne(foodData);
      res.send(result);
    })

    // get top foods *****************************************************
    app.get('/foods', async (req, res) => {
      const cursor = foodCollections.find().sort({ purchase: -1 }).limit(6);
      const result = await cursor.toArray();
      res.send(result);
    })
    // get all foods *****************************************************
    app.get('/allFoods', async (req, res) => {
      
      const result = await foodCollections.find().toArray();
      res.send(result);
    })

    // get specific food by id 

    app.get('/allFoods/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await foodCollections.findOne(query);
      res.send(result);
    })



// get specific food by user email
    app.get('/myFoods', verifyToken ,async (req, res) => {
      const email = req.query.email;
      const query = { "addedBy.email": email };

   
      if (req.user.email !== req.query.email) {
        return res.status(403).send({message: 'forbidden access'})
      }
      
      const result = await foodCollections.find(query).toArray();
      res.send(result);
    });


    app.put('/allFoods/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatePurchase = req.body;

      const food = {
        $set: {
          purchase: updatePurchase.purchase,
        },
      };

      const result = await foodCollections.updateOne(filter, food, options);
      res.send(result);
    });


    // update food
    app.patch('/allFoods/:id', async (req, res) => {
      const id = req.params.id;
      const updateFood = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateFoodDoc = {
        $set: {
          foodName: updateFood.foodName,
          foodImage: updateFood.foodImage,
          foodCategory: updateFood.foodCategory,
          quantity: updateFood.quantity,
          price: updateFood.price,
          foodOrigin: updateFood.foodOrigin,
          description: updateFood.description,
        },
      };
      const result = await foodCollections.updateOne(filter, updateFoodDoc);
      res.send(result);
    });

    // delete food 
    app.delete('/allFoods/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodCollections.deleteOne(query);
      res.send(result)
    })






    // purchase ##########################################################################################
    const purchaseCollection = client.db('restaurant').collection('purchase');
    // post purchase data to the db 
    app.post('/purchase', async (req, res) => {
      const purchaseInfo = req.body;
      const result = await purchaseCollection.insertOne(purchaseInfo);
      res.send(result);
    })
    // get  purchase data  by user email
    app.get('/purchase',verifyToken, async (req, res) => {
      const email = req.query.email;
      const query = { "purchaseBy.email": email };
      if (req.user.email !== req.query.email) {
        return res.status(403).send({message: 'forbidden access'})
      }
      const result = await purchaseCollection.find(query).toArray();
      for (const food of result) {
        const queryFood = { _id: new ObjectId(food.food_id) }
        const foodFind = await foodCollections.findOne(queryFood)
        if (foodFind) {

          food.foodImage = foodFind.foodImage;
          food.foodOrigin = foodFind.foodOrigin;
        }
      }
      res.send(result);
    })


    // get all purchase data 
    app.get('/allPurchase', async (req, res) => {
      const cursor = purchaseCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    // get purchase data by id 
    app.get('/allPurchase/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await purchaseCollection.findOne(query);
      res.send(result);
    })

    // delete purchase 
    app.delete('/allPurchase/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await purchaseCollection.deleteOne(query);
      res.send(result)
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