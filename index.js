const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const CriminalModel = require('./Model/Criminal_data');
const CameraModel = require('./Model/cameraModel');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'ff9187363b7561c605bab61c1658da877f3a6745123b599f524e400be99c99673a4702deb3500b9c5bbbdf9efb1aa095df9bf3eece4d2f1879b9869883194275'
const ContactModel = require('./Model/Contact');
const Contact = require('./Model/Contact');
const { error } = require('console');
const fugitiveModel = require('./Model/fugetiveModel');
const multer = require('multer');
const path = require('path');
const reportModel = require('./Model/ReportModel');
const userModel = require('./Model/usermodel');
const bcrypt = require('bcrypt');
const logModel = require('./Model/logs');
const generateCameraJson = require('./fetchAndSave');

const app = express();

const server = http.createServer(app); 

mongoose.connect(process.env.MONGO_URI )

app.use(cors());
app.use(express.json());

//for accessing tha images in respective folder
app.use('/criminal_faces', express.static(path.join(__dirname, 'criminal_faces')));
app.use('/matched_faces', express.static(path.join(__dirname, 'matched_faces')));
app.use('/Report_images', express.static(path.join(__dirname, 'Report_images')));
app.use('/user_faces', express.static(path.join(__dirname, 'user_faces')));

const db = mongoose.connection;


 setInterval(() => {
     generateCameraJson();
   }, 10 * 60 * 1000);


//auth
const verifyJWT = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) return res.status(403).json({ message: 'Failed to authenticate token' });
      req.user = decoded;
      next();
  });
};

app.get('/validate-token', verifyJWT, (req, res) => {
  res.status(200).json({ valid: true, user: req.user });
});


app.delete('/admindelete/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const user = await userModel.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    if (user.image) {
      const oldPath = user.image;
      const path = require('path');
      const fs = require('fs');
      const fileName = path.basename(oldPath);
      const newDir = path.join(__dirname, 'deleted_admin_profile');
      if (!fs.existsSync(newDir)) fs.mkdirSync(newDir);
      const newPath = path.join(newDir, fileName);
      try {
        fs.renameSync(oldPath, newPath);
      } catch (moveErr) {
        console.error('Failed to move admin profile photo:', moveErr);
      }
    }
    await userModel.findByIdAndDelete(id);
    res.status(200).json({ message: 'Admin deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/pdelete/:id', async (req, res) => {
  const { id } = req.params;
  try {

    const user = await userModel.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'Police officer not found' });
    }
    if (user.image) {
      const oldPath = user.image;
      const path = require('path');
      const fs = require('fs');
      const fileName = path.basename(oldPath);
      const newDir = path.join(__dirname, 'deleted_police_profile');
      if (!fs.existsSync(newDir)) fs.mkdirSync(newDir);
      const newPath = path.join(newDir, fileName);
      try {
        fs.renameSync(oldPath, newPath);
      } catch (moveErr) {
        console.error('Failed to move profile photo:', moveErr);
      }
    }
    await userModel.findByIdAndDelete(id);
    res.status(200).json({ message: 'police deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/opdelete/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const user = await userModel.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'Operator not found' });
    }
    if (user.image) {
      const oldPath = user.image;
      const path = require('path');
      const fs = require('fs');
      const fileName = path.basename(oldPath);
      const newDir = path.join(__dirname, 'deleted_operator_profile');
      if (!fs.existsSync(newDir)) fs.mkdirSync(newDir);
      const newPath = path.join(newDir, fileName);
      try {
        fs.renameSync(oldPath, newPath);
      } catch (moveErr) {
        console.error('Failed to move operator profile photo:', moveErr);
      }
    }
    await userModel.findByIdAndDelete(id);
    res.status(200).json({ message: 'operator deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


const fs = require('fs');



app.get('/matched_photos/:name', (req, res) => {
  const folderPath = path.join(__dirname, 'matched_faces', req.params.name);

  fs.readdir(folderPath, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Folder not found or inaccessible' });
    }

    const imageFiles = files.filter(file =>
      file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png')
    );

    res.json(imageFiles);
  });
});

app.get('/fetch-matched-fugitives', (req, res) => {
  const baseDir = path.join(__dirname, 'matched_faces');
  const data = [];

  fs.readdir(baseDir, (err, folders) => {
    if (err) return res.status(500).send('Error reading matched_faces');

    folders.forEach(folder => {
      const folderPath = path.join(baseDir, folder);
      if (fs.statSync(folderPath).isDirectory()) {
        const files = fs.readdirSync(folderPath);
        files.forEach(file => {
          const [name, camera, date, timeRaw] = file.replace('.jpg', '').split('_');
          const time = timeRaw.replace(/-/g, ':');
          data.push({
            name,
            camera,
            date,
            time,
            file,
            folder
          });
        });
      }
    });

    res.json(data);
  });
});

app.get('/matched-image-count', (req, res) => {
  const basePath = path.join(__dirname, 'matched_faces');
  let totalImages = 0;

  fs.readdir(basePath, (err, folders) => {
    if (err) return res.status(500).json({ error: 'Failed to read matched_faces directory' });

    folders.forEach(folder => {
      const folderPath = path.join(basePath, folder);
      if (fs.existsSync(folderPath) && fs.lstatSync(folderPath).isDirectory()) {
        const files = fs.readdirSync(folderPath).filter(file => file.endsWith('.jpg') || file.endsWith('.png'));
        totalImages += files.length;
      }
    });

    res.json({ count: totalImages });
  });
});


app.delete('/delete-fugitive/:id', async (req,res)=>{
  const {id} = req.params;
  const {adminId, adminName} = req.query;
  console.log(`${adminName} and ${adminId}`);

  await logModel.create({
          adminId,
          adminName,
          action: 'delete-matched-fugitive',
          target: id,
          description: `Fugitive with id ${id} deleted by admin`,
          timestamp: new Date()
        });
  CriminalModel.findByIdAndDelete(id)
  .then(result => res.status(200).json({message: 'Fugitive Data deleted successfully'}))
  .catch(err => res.status(500).json({error: err.message}))
});
//end of auth

//getauth
app.get('authuser', (req, res)=>{
  const user = req.body;
  userModel.findOne({user})
  .then(result => res.status(200).json({message: result.message}))
  .catch(err => res.status(500).json({error: error.message}));
});

app.post("/save-data", async (req, res) => {
    try {
      const { cameraName, screenshotPath, date, time } = req.body;
  
      const newRecord = new CriminalModel({
        cameraName,
        screenshotPath,
        date,
        time,
      });
  
      await newRecord.save();
      res.status(201).json({ message: "Data saved successfully", data: newRecord });
    } catch (error) {
      res.status(500).json({ error: "Failed to save data" });
    }
  });

  app.post('/contact', (req, res)=>{
    const {email, phone, description} = req.body;
    ContactModel.create({email, phone, description})
    .then(result => res.status(200).json({message: 'Message sent successfully'}))
    .catch(err => res.status(500).json({error: err.message}));

  });


  app.delete('/delete-list/:id', async (req, res) => {
    const { id } = req.params;
    const { adminId, adminName } = req.query;

    await logModel.create({
      adminId,
      adminName,
      action: 'delete-fugitive',
      target: id,
      description: `Fugitive with id ${id} deleted by ${adminName}`,
      timestamp: new Date()
    });

    try {
      const fugitive = await fugitiveModel.findById(id);
      if (fugitive && fugitive.imagePath) {
        const oldPath = fugitive.imagePath;
        const path = require('path');
        const fs = require('fs');
        const fileName = path.basename(oldPath);
        const newDir = path.join(__dirname, 'deleted_fugitive_images');
        if (!fs.existsSync(newDir)) fs.mkdirSync(newDir);
        const newPath = path.join(newDir, fileName);
        try {
          fs.renameSync(oldPath, newPath);
        } catch (moveErr) {
          console.error('Failed to move fugitive image:', moveErr);
        }
      }
      await fugitiveModel.findByIdAndDelete(id);
      res.status(200).json({ message: 'Criminal data deleted successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/add-camera", async (req, res) => {
    try {
      const { cameraName, ipAddress, port, location} = req.body;
      const adminId = req.body.adminId; 
      const adminName = req.body.adminName;
      console.log("Received camera add request:", req.body);

      const newCamera = new CameraModel({ cameraName, ipAddress, port, location });

      await newCamera.save();

       await logModel.create({
          adminId: adminId, 
          adminName:adminName,
          action: 'add-camera',
          target: cameraName,
          description: `Camera ${cameraName} added by admin`,
          timestamp: new Date()
        });
        console.log(`Admin name: ${adminName}`);
      res.status(200).json({ message: "Camera added successfully", data: newCamera });
    } catch (error) {
      res.status(500).json({ error: "Failed to add camera" });
    }
  });

  app.get('/api/admin/logs', async (req, res) => {
  try {
    const logs = await logModel.find().sort({ timestamp: -1 });
    res.json(logs);
  } catch (err) {
    console.error("Error fetching logs:", err);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});


  app.get("/fetch-cameras", async (req, res) => {
    try {
      const cameras = await CameraModel.find();
      res.json(cameras);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cameras" });
    }
  });
  
  app.get('/fetch-fugitives',(req, res)=>{
    CriminalModel.find({})
    .then(result => res.json(result))
    .catch(err => res.json(err));
  });


  app.get('/camera-count', async (req, res)=>{
try{ 
     const count = await db.collection('cameras').countDocuments();
    res.status(200).json({count});
    }catch(err){
      console.log(err);
      res.status(500).json({error: err.message});
    }

  });

  //search fugitive
  app.get('/search',async (req, res)=>{
    const query = req.query.q;
    try{

      const result = await fugitiveModel.find({
        fullName: {$regex: '^' + query, $options: 'i'}
      });
      res.json(result);

    }catch(err){
      console.log(err);
      res.status(500).json({error: err.message});
    }
  });

  app.get('/admin-count', async (req, res)=>{
    try{
      const countad = await db.collection('users').countDocuments({role: 'admin'});
      res.status(200).json({countad});
    }catch(error){
      res.status(500).json({error: err.message});
    }
  });

  app.get('/police-count', async (req, res)=>{
    try{
      const countpl= await db.collection('users').countDocuments({role: 'police'});
      res.status(200).json({countpl});
    }catch(error){
      res.status(500).json({error: err.message});
    }
  });

    app.get('/operator-count', async (req, res)=>{
    try{
      const countop = await db.collection('users').countDocuments({role: 'operator'});
      res.status(200).json({countop});
    }catch(error){
      res.status(500).json({error: err.message});
    }
  });

app.get('/report-count', async (req,res)=>{
  try{
    const reportCount = await db.collection('reports').countDocuments();
    res.status(200).json({reportCount});

  }catch(err){
    console.log(err);
    res.status(500).json({error: err.message});
  }

});

  app.get('/criminal-count', async (req, res)=>{
    try{
      const criminalCount = await db.collection('fugitives').countDocuments();
      res.status(200).json({criminalCount});

    }catch(err){
      console.log(err);
      res.status(500).json({error: err.message});
    }
  });

  app.get('/get-criminal-list/:id', (req, res)=>{
    const {id} = req.params;
    fugitiveModel.findById(id)
    .then(result => res.status(200).json(result))
    .catch(err => res.status(500).json({error: err.message}));
  });

  app.get('/getmessage', async (req, res)=>{
    try{
      const countMessage = await db.collection('contacts').countDocuments();
      res.status(200).json({countMessage});

    }catch(err){
      console.log(err);
      res.status(500).json({error: err.message});

    }

  });

  app.get('/get-fugitive/:id', (req, res)=>{
    const {id} = req.params;
    CriminalModel.findById(id)
    .then(result => res.status(200).json(result))
    .catch(err => res.status(500).json({error: err.message}));

  });

  app.delete('/delete-camera/:id', async (req, res) => {
  const { id } = req.params;
  const { adminId, adminName } = req.query;

  console.log(`Deleting camera with adminId: ${adminId}`);

  try {
    // Log the delete action
    await logModel.create({
      adminId: adminId,
      adminName: adminName,
      action: 'Delete-camera',
      target: id,
      description: `Camera with ID ${id} deleted by admin`,
      timestamp: new Date()
    });

    // Delete the camera
    await CameraModel.findByIdAndDelete(id);

    return res.status(200).json({ message: "Camera deleted" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

  app.get('/getcontact', (req, res)=>{
    ContactModel.find({})
    .then(result => res.json(result))
    .catch(err=> res.json(err))
  });

  app.get('/getreport', (req, res)=>{
    reportModel.find({})
      .then(result => res.json(result))
      .catch(err=> res.json(err))
    
  });

  app.get('/fetchreport/:id', (req,res)=>{
    const {id} = req.params;
    reportModel.findById(id)
    .then(result => res.status(200).json(result))
    .catch(err => res.status(500).json({error: err.message}));

  });

 app.patch('/checkreport/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const report = await reportModel.findByIdAndUpdate(id, { checked: true }, { new: true });
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    res.status(200).json(report);
  } catch (err) {
    console.error('Error updating report:', err.message);
    res.status(500).json({ error: err.message });
  }
});

  app.delete('/delete/:id',(req,res)=>{
    const {id} = req.params;
    ContactModel.findByIdAndDelete(id)
    .then(result => res.status(200).json({message: 'Message deleted successfully'}))
    .catch(err => res.status(500).json({error: err.message}));
  });

  app.get('/getmessage/:id', (req, res)=>{
    const {id} = req.params;
    ContactModel.findById(id)
    .then(result => res.status(200).json(result))
    .catch(err => res.status(500).json({error: err.message}));

  });

  app.get('/getCriminal', (req, res)=>{
    fugitiveModel.find({})
    .then(result => res.json(result))
    .catch(err => res.json(err));

  })
  app.post('/dashboard', (req, res)=>{
    const {username, password }= req.body;
    try {
        const admin = UserModel.findOne({username});
        if(!admin){
            return res.status(404).json({message: 'Admin not found'});
        }
        if(username.password !== admin.password){
            return res.status(401).json({message: 'Invalid credentials'});
        }
        const token = Jwt({id: admin._id,username: admin.username, role:admin.role },
            JWT_SECRET,
            { expiresIn: '1h' }
        )
        res.status(200).json({
            message: 'Logged in successfully',
            token: token,
            user:{
                username: admin.username,
                role: admin.role
            }

        })
    } catch (error) {
        
    }
  });

  app.get('/fetch', (req, res)=>{
    CriminalModel.find({})
    .then(result => res.json(result))
    .catch(err => err.json(err));
  });

  //add fug
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'criminal_faces'); 
  },
  filename: function (req, file, cb) {
    const fullName = req.body.fullName ? req.body.fullName.replace(/\s+/g, '_') : 'fugitive';
    const ext = path.extname(file.originalname);
    const filename = `${fullName}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({ storage: storage });
app.post('/add-fugitive', upload.single('image'), async (req, res) => {
  const {
    fullName,
    charges,
    lastSeenLocation,
    dob,
    pob,
    caution,
    weight,
    gender,
    eyes,
    nationality,
    hair,
    height,
    adminId,
    adminName
  } = req.body;

  try {
    const imagePath = req.file ? req.file.path : null; 
    const imageName = req.file ? req.file.filename : null; 

    // Log the action
    await logModel.create({
      adminId,
      adminName,
      action: 'add-fugitive',
      target: fullName,
      description: `Fugitive ${fullName} added by admin`,
      timestamp: new Date()
    });

    console.log(`Admin name: ${adminName}`);

    // Store fugitive data
    await fugitiveModel.create({
      fullName,
      charges,
      imagePath,
      imageName,
      lastSeenLocation,
      dob,
      pob,
      caution,
      weight,
      gender,
      eyes,
      nationality,
      hair,
      height
    });

    res.status(200).json({ message: 'Fugitive added successfully' });

  } catch (err) {
    console.error('Error adding fugitive:', err);
    res.status(500).json({ error: err.message });
  }
});


  //end fug

  //create user handler
  const createStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'user_faces'); 
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
  });
  const createUpload = multer({ storage:createStorage });

  app.post('/create-user', createUpload.single('image') , async(req, res)=>{
    const { name,email, role, adminId, adminName } = req.body;
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    console.log("Recived Data", name,email,hashedPassword, role );
    const image = req.file.path; // path to the saved image
    await logModel.create({
          adminId: adminId, 
          adminName: adminName,
          action: 'create-user',
          target: name,
          description: `User ${name} created by admin`,
          timestamp: new Date()
        });

    userModel.create({ name, email, password:hashedPassword, role, image})
    .then(result => res.status(200).json({message: 'User created successfully'}))
    .catch(err => res.status(500).json({error: err.message}));
    
  });

  const reportStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'Report_images'); // folder where images will be saved
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
  });
  const reportUpload = multer({ storage: reportStorage });

  app.post('/send-report', reportUpload.single('photo'), (req,res)=>{
    const {location, description} = req.body;
  
    const photo = req.file.path;
    console.log("Recived report", location, description);
    reportModel.create({location, photo, description})
    .then(result => res.status(200).json({message: "Report sent successfully"}))
    .catch(err => res.status(500).json({error: err.message}))

  });

  //end of send report

  app.post('/login', async (req, res)=>{
    const {name, password} = req.body;
    console.log("Recived Data", name, password);
    try{
 const user = await userModel.findOne({name:name});
 console.log("user", name);
 console.log("image", user.image);
 if(!user)   return res.status(404).json({message: "User not found"});

 console.log("Comparing pass", password, user.password);
 const isMatch = await bcrypt.compare(password,user.password);
    if(!isMatch) return res.status(400).json({message: "Invalid password"});

    //create token

    const token = jwt.sign({id: user._id, name: user.name}, JWT_SECRET,{expiresIn: '1h'});

    res.status(200).json({message: "login successful", token, name: user.name, role:user.role, image:user.image, id:user._id});
    }catch(error){
        console.log("Error: ",error);
  res.status(500).json({error: error.message});
    }
});


app.get('/getuData/:id', (req, res)=>{
  const {id} = req.params;
  userModel.findById(id)
  .then(result => res.status(200).json(result))
  .catch(err => res.status(500).json({error: err.message}));
});


app.get('/Adminprofile/:id', (req, res)=>{
  const {id} = req.params;
  userModel.findById(id)
  .then(result => res.status(200).json(result))
  .catch(err => res.status(500).json({error: err.message}));
});

app.get('/getAdmins', (req, res)=>{
  userModel.find({role: 'admin'})
  .then(result => res.status(200).json(result))
  .catch(err=> res.status(500).json({error:err.message}));
});

app.get('/Policeprofile/:id', (req, res)=>{
  const {id} = req.params;
  userModel.findById(id)
  .then(result => res.status(200).json(result)) 
  .catch(err => res.status(500).json({error: err.message}));
});

app.get('/Operatorprofile/:id', (req, res)=>{
  const {id} = req.params;
  userModel.findById(id)
  .then(result => res.status(200).json(result)) 
  .catch(err => res.status(500).json({error: err.message}));
});

app.get('/allUsers', (req, res)=>{
  userModel.find({role: 'police'})
  .then(result => res.status(200).json(result))
  .catch(err=> res.status(500).json({error:err.message}));
});
app.get('/allop', (req, res)=>{
  userModel.find({role: 'operator'})
  .then(result => res.status(200).json(result))
  .catch(err=> res.status(500).json({error:err.message}));
});

app.get('/getusData/:id', (req, res)=>{
  const {id} = req.params;
  userModel.findById(id)
  .then(result => res.status(200).json(result))
  .catch(err => res.status(500).json({error: err.message}));
});


  app.post('/update-fugitive/:id', upload.single('image'), async(req, res)=>{
    const {id} = req.params;
    const { 
      fullName, charges, lastSeenLocation, dob, pob, caution,weight, gender, eyes, nationality, hair, height, adminId, adminName
    } = req.body;
    console.log("Recived Data",fullName, charges, lastSeenLocation, dob, pob, caution,weight, gender, eyes, nationality, hair, height);
    const updatedData = {
      fullName, charges, lastSeenLocation, dob, pob, caution,weight, gender, eyes, nationality, hair, height
    }
    if(req.file){
      updatedData.imagePath = req.file.path;
    } 

     await logModel.create({
          adminId: adminId, 
          adminName: adminName,
          action: 'update-fugitive',
          target: fullName,
          description: `Fugitive ${fullName} with id ${id} updated by admin`,
          timestamp: new Date()
        });

    fugitiveModel.findByIdAndUpdate(id, updatedData, {new: true})
    .then(result => res.status(200).json({message: 'Fugitive added successfully'}))
    .catch(err => res.status(500).json({error: err.message}));
    
  });

  //update profile
  const profileStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'user_faces');
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
  });
  
  const profileUpload = multer({ storage: profileStorage });

app.post('/profile-update/:id', profileUpload.single('image'), async (req, res) => {
  const { id } = req.params;
  let { name, email, role, password } = req.body;

  try {
    const updatedData = {
      name,
      email,
      role
    };

    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      updatedData.password = hashedPassword;
    }

    if (req.file) {
      updatedData.image = req.file.path;
    }

    const result = await userModel.findByIdAndUpdate(id, updatedData, { new: true });

    res.status(200).json({
      message: 'Profile updated successfully',
      name: result.name,
      role: result.role,
      image: result.image,
      id: result._id
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
  //end of update profile

app.listen(3001,()=>{
    console.log('Server is Running!');
})

module.exports = generateCameraJson;



