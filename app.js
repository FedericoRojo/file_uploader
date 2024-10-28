const express = require("express");
const expressSession = require("express-session");
const passport = require("passport");
const userRouter = require("./routes/userRouter.js");
const pgSession = require("connect-pg-simple")(expressSession);
const pgPool = require("./config/pool.js");
const path = require("path");

require("dotenv").config();

var app = express();

app.use(express.json());
app.use(express.urlencoded({extended: true}));


app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use('/styles', express.static(path.join(__dirname, 'styles')));

app.use(expressSession({
    store: new pgSession({
        pool: pgPool,
        tableName: 'file_uploader_session'
    }),
    secret: process.env.SESSION_COOKIE_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {maxAge: 30 * 24 * 60 * 60 * 1000}
}));

require('./config/passport');
app.use(passport.initialize());
app.use(passport.session());

app.use(userRouter);

const PORT = process.env.PORT || 3000;
app.listen( PORT, () => console.log(`App running on PORT ${PORT}`));
