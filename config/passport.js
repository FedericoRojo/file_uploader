const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const pgPool = require("./pool");
const {validPassword} = require("../lib/passwordUtils");

const customFields = {
    username: 'username',
    password: 'password'
}

async function verifyCallback(username, password, done) {
    try{
        
        const {rows} = await pgPool.query('SELECT * FROM users WHERE username = $1', [username]);

        if(rows[0] == null){
            return done(null, false);
        }

        const user = rows[0];
        const isValid = validPassword(password, user.hash, user.salt);

        if(isValid){
            return done(null, user);
        }else{
            return done(null, false);
        }

    }catch(e){
        done(e);
    }
}

const strategy = new LocalStrategy(customFields, verifyCallback);

passport.use(strategy);

passport.serializeUser( (user, done) => {
    done(null, user.id);
});

passport.deserializeUser( async(userId, done) => {
    try{
        const {rows} = await pgPool.query('SELECT * FROM users WHERE id = $1', [userId]);
        const user = rows[0];
        done(null, user);
    }catch(e){
        done(e);
    }
})