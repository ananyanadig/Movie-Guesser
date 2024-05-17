const express = require("express"); 
const app = express();
const bodyParser = require("body-parser");
process.stdin.setEncoding("utf8");
const { MongoClient, ServerApiVersion } = require('mongodb');
const databaseAndCollection = {db: "CMSC335_DB", collection:"movieGuesses"};

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, 'credentials/.env') });  


app.use(bodyParser.urlencoded({extended:false}));
app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");

const uri = "mongodb+srv://anadig:ancmsc335@atlascluster.cgjwcwr.mongodb.net/";

const portNumber = 3000;
console.log(`Web server started and running at http://localhost:${portNumber}`)
console.log(`Stop to shutdown the server:`)

process.stdin.setEncoding("utf8"); 
process.stdin.on('readable', () => {  
	const dataInput = process.stdin.read();
	if (dataInput !== null) {
		const command = dataInput.trim();
		if (command === "stop") {
			console.log("Shutting down the server");
            process.exit(0); 
        } else {

			console.log(`Invalid command: ${command}`);
		}
    }
});

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


app.get("/", (req, res) => {
    res.render('index'); 
});

app.listen(portNumber);


app.get('/guesser', (req, res) => {
    res.render('guesser'); 
});


app.post('/formSubmitted', async (req, res) => {
    let { title, year } = req.body;
    try {
        await client.connect();
        const url = `https://movie-database-alternative.p.rapidapi.com/?s=${title}`;
        const options = {
            method: 'GET',
            headers: {
                'X-RapidAPI-Key': '641488978bmshf53238fa4eae34ap1d29dajsn30f90a72682c',
                'X-RapidAPI-Host': 'movie-database-alternative.p.rapidapi.com'
            }
        };
        
        const response = await fetch(url, options);
        const result = await response.json();
        let movieYear = result.Search[0].Year;
        

        let newValues = {title:title, year:year, movieYear: movieYear};
        
        await insertGuess(client, databaseAndCollection, newValues);
        res.render("submit", newValues);
        
        
    } catch (e) {
        console.error(e);
    }
});

app.post("/remSubmit", async (request, response) => {
    try {
        await client.connect();
        const result = await client.db(databaseAndCollection.db)
        .collection(databaseAndCollection.collection)
        .deleteMany({});
        response.render('index');

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
       
});

async function insertGuess(client, databaseAndCollection, newValues) {
    const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(newValues);
}


app.get("/prevGuesses", async (request, response) => {
    try{
        await client.connect();
        
        let table = `<table border="1">
            <tr>
                <th>Title</th>
                <th>Guess</th>
                <th>Actual Year</th>
            </tr>`;
        
        let filter = {};
        let cursor = client.db(databaseAndCollection.db)
            .collection(databaseAndCollection.collection)
            .find(filter);
        let result = await cursor.toArray();
        
        result.forEach(a => {
            table += 
            `<tr>
                <td>${a.title}</td>
                <td>${a.year}</td>
                <td>${a.movieYear}</td>
            </tr>`;
        });
        table += '</table>';
        
        response.render('prevGuesses', {table: table});
    }

    catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
});

