const express = require("express");
const server = express();
const cors = require('cors')
const bodyParser = require('body-parser');
server.use(cors());
server.use(bodyParser.json());
const mongoose = require('mongoose');
const cookieParser = require("cookie-parser")
const bcrypt = require("bcrypt");
const salt =  10;
const jwt = require('jsonwebtoken');
require('dotenv').config();
main().catch(err => console.log(err));

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
//   await mongoose.connect("mongodb+srv://royaltyfitness:Royalty@gymdata.ptratk2.mongodb.net/?retryWrites=true&w=majority");
  console.log('db connected');
}

const userSchema = new mongoose.Schema({
    Name: String,
    Mobile:{ type: Number, unique: true },
    DOB: Date,
    Age:Number,
    Height:Number,
    Weight:Number,
    BMI:Number,
    Address:String,  
    JoinDate:Date,
    EndDate:Date,
    FeesPaid:Number,
    FeesBalance:Number,
    Gender:String,
    PT:String,
    role:String,
    Password:String,
});

const userReview = new mongoose.Schema({
    Name : String,
    Review: String,
});
const userFeedback = new mongoose.Schema({
    Name : String,
    Feedback: String,
});

const User = mongoose.model('User', userSchema);
const UserReviews = mongoose.model('UserReviews',userReview);
const UserFeedbacks = mongoose.model('UserFeedbacks',userFeedback);

const corsOptions = { 
    credentials: true,
  };

server.use(cors(corsOptions));
server.use(bodyParser.json());
server.use(cookieParser());

// CRUD - Creates
server.post('/addMember', async (req, res) => {
    try {
        let user = new User();
        const existingUser = await User.findOne({ Mobile: req.body.mobilenum })
        if (existingUser) {
            console.log("Mobile number already exists.");
            return res.status(400).json({ success: false, message: 'Mobile number already exists.' });
        }
        user.Name = req.body.name;
        user.Mobile = req.body.mobilenum;
        user.DOB = req.body.birthdate;
        user.Age = req.body.age;
        user.Height = req.body.height;
        user.Weight = req.body.weight;
        user.Address = req.body.address;
        user.JoinDate = req.body.joindate;
        user.EndDate = req.body.enddate;
        user.FeesPaid = req.body.feespaid;
        user.FeesBalance = req.body.feesbalance;
        user.PT = req.body.pt;
        user.role = "member";
        user.Password = process.env.USERPASSWORD;
        const doc = await user.save();
        // console.log(doc);
        res.json(doc);
    } catch (error) {
        console.error('Error adding member:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
})


// CRUD -  Read 
// http://localhost:8080/getMembers
server.get('/getMembers',async (req,res)=>{
    const docs = await User.find({ role: { $ne: 'admin' } });
    res.json(docs)
})

// test update

server.put("/updateMember/:id", async (req, res) => {
    const id = req.params.id;
    const updateFields = {
        Name: req.body.Name,
        Mobile: req.body.Mobile, // Mobile number being updated
        DOB: req.body.DOB,
        Age: req.body.Age,
        Height: req.body.Height,
        Weight: req.body.Weight,
        PT: req.body.PT,
        Address: req.body.Address,
        JoinDate: req.body.JoinDate,
        EndDate: req.body.EndDate,
        FeesPaid: req.body.FeesPaid,
        FeesBalance: req.body.FeesBalance,
    }
    
    try {
        // Find the existing user being updated
        const existingUser = await User.findById(id);

        if (!existingUser) {
            return res.status(404).json({ success: false, message: "Document not found." });
        }

        // Check if another document already has the same mobile number
        const existingUserWithMobile = await User.findOne({
            Mobile: updateFields.Mobile,
            _id: { $ne: id }, // Exclude the current document from the query
        });

        if (existingUserWithMobile) {
            console.log("Mobile number already in use.")
            return res.status(400).json({ success: false, message: "Mobile number already in use." });
        }

        // Update the document
        existingUser.set(updateFields); // Update the fields
        const updatedUser = await existingUser.save(); // Save the updated document
        res.json({ success: true, message: "Data updated.", updatedUser });
    } catch (error) {
        console.error('Error updating member:', error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
})



//CRUD - Delete
// http://localhost:8080/deleteMember/:id
server.delete("/deleteMember/:id", async(req,res)=>{
    const id = req.params.id;
    const data = await User.deleteOne({_id:id});
    res.send({success:true, message:"Data Deleted Successfully.",data : data})

})

// login
server.post("/searchMember",async (req, res) => {
    try {
        const { mobile, password } = req.body;
        const mem = await User.findOne({ Mobile: mobile });
        if (mem) {
            if (mem.Password === password) {
                const role = mem.role;
                const token = jwt.sign({role},process.env.TOKEN,{expiresIn:'1d'});
                res.send({ 
                    success: true, 
                    message: "Member Exists.", 
                    role: mem.role, 
                    id: mem._id, 
                    Token: token,
                    data : mem,
                });
            } else {
                res.send({ success: false, message: "Password not matched." });
            }
        } else {
            // if entered wrong mobile number while log in
            res.send({ success: false, message: "You are not Registered" });
        }
    } catch (error) {
        console.error('Error searching member:', error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

// Search member for bill
server.post("/findMember/:mobile",async (req, res) => {
    try{
        const mobile = req.params.mobile;
        const user = await User.findOne({Mobile : mobile});

        if(!user){
            return res.status(404).json({message:"User not found"});
        }
        res.status(200).json(user);
    }
    catch(error){
        res.status(500).json({ message: "Internal server error" });
    }
})


// Save a review
server.post("/saveReview", async (req, res) => {
    try {
      const { Name, Review } = req.body;

      const newReview = new UserReviews({
        Name: Name,
        Review: Review,
      });
  
      await newReview.save();
      res.status(200).json({ message: "Review saved successfully" });
    } catch (error) {
      console.error("Error saving review:", error);
      res.status(500).json({ error: "Internal Server Error", errorMessage: error.message });
    }
  });


// get Reviews
server.get("/getReviews",async(req,res) =>{
    const reviews = await UserReviews.find({});
    res.json(reviews)
})

// http://localhost:8080/deleteReview/:id
server.delete("/deleteReview/:id", async(req,res)=>{
    const id = req.params.id;
    const data = await UserReviews.deleteOne({_id:id});
    res.send({success:true, message:"Review Deleted Successfully.",data : data})

})

// Save Feedback
server.post("/saveFeedback", async (req, res) => {
    try {
      const { Name, Feedback } = req.body;
  
      const newFeedback = new UserFeedbacks({
        Name: Name,
        Feedback: Feedback,
      });
  
      await newFeedback.save();
      res.status(200).json({ message: "Feedback saved successfully" });

    } catch (error) {
      console.error("Error saving Feedback:", error);
      res.status(500).json({ error: "Internal Server Error", errorMessage: error.message });
    }
  });

// get all Suggestions
server.get("/getFeedbacks",async (req,res) => {
    const feedbacks = await UserFeedbacks.find({});
    res.json(feedbacks);
})

// http://localhost:8080/deleteFeedback/:id
server.delete("/deleteFeedback/:id", async(req,res)=>{
    const id = req.params.id;
    const data = await UserFeedbacks.deleteOne({_id:id});
    res.send({success:true, message:"Feedback Deleted Successfully.",data : data})

})


//  Notifications : 
// http://localhost:8080/getMembersNearToEndDate
server.get("/getMembersNearToEndDate",async(req,res)=> {
    try{
        const currentDate = new Date();
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate()+7);

        // Fetch members whose membership is about to end
        const members = await User.find({
            role:{$ne:'admin'}, // Exclude admin
            EndDate:{$gte : currentDate, $lte: thresholdDate} // EndDate within 7 days
        })
        res.json(members);
    }catch(error){
        console.log("Error fetching members:"+error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
})

// server started on port
server.listen(process.env.PORT,()=>{
    console.log('server started');
})

