const { Jwt } = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET_KEY;


const verifyToken =(req, res, next)=>{

    const token = req.headers['authorization'].split(' ')[0];
    if(!token){
        return res.status(403).json({message: 'Token not provided'});

    }
  jwt.verify(token, JWT_SECRET, (err, user)=>{
    if(err){
        return res.status(403).json({message: 'Invalid token'});
    }
    req.user = user;
    next();
  })
}

module.exports = verifyToken;