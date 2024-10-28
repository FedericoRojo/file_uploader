function isAuth (req,res,next){
    if(req.isAuthenticated()){
        next();
    }else{
        res.render('error', {error: 'Not authorized to see this resource, please log in'});
    }
}

module.exports = {isAuth}