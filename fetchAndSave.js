const { MongoClient } = require('mongodb');
const fs = require('fs');

const uri = 'mongodb://localhost:27017'; 
const dbName = 'criminalDb';
const collectionName = 'cameras';

console.log('Current working directory:', process.cwd()); 

async function generateCameraJson() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    const records = await collection.find({}).toArray();
    console.log('Fetched records:', records); 

    const formatted = records.map(item => ({
      name: item.cameraName || "Unknown",
      url: `http://${item.ipAddress}:${item.port}/video`
    }));

    console.log('Formatted data to write:', formatted); // Debug log
    fs.writeFileSync('cameras.json', JSON.stringify(formatted, null, 2), 'utf-8');
    console.log(`[${new Date().toLocaleString()}] cameras.json updated.`);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.close();
  }
}

module.exports = generateCameraJson;

