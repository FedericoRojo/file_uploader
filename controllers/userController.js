const pool = require("../config/pool");
const {genPassword} = require("../lib/passwordUtils");
const passport = require("passport");
const multer = require('multer');
const path = require('path');
const cloudinary = require("cloudinary");
const streamifier = require('streamifier');
const { time } = require("console");

require('dotenv').config();

cloudinary.config({
    cloud_name: 'drpxawyty',
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});


function getHome(req,res) {
    res.render('home', {error: null});
}

async function registerUser(req, res) {
    const saltHash = genPassword(req.body.password);

    const salt = saltHash.salt;
    const hash = saltHash.hash;

    try{
        await pool.query('INSERT INTO users(username, hash, salt) VALUES ($1, $2, $3);', [req.body.username, hash, salt]);
        res.redirect('/');
    }catch(e){
        if (e.code === '23505') {
            res.render('registerUser', {error: 'Username already exists. Please choose another one'});
        } else {
            res.render('registerUser', {error: e.message});
        }
    }
} 

function getRegisterUser(req, res){
    res.render("registerUser", {error: null});
}

function getLoginUser(req, res){
    if(req.user == null){
        return res.render('loginUser', {error: null});
    }else{
        return res.render('error', {error: 'You are already logged in'});
    }
}

function loginUser(req, res, next){
    
    passport.authenticate('local', (err, user, info) => {
        
        if(err){
            return res.render('loginUser', {error: 'Error while login user'});
        }
        if(!user){
            return res.render('loginUser', {error: 'Error in authentication, username or password incorrect'});
        }
        req.logIn(user, (err) => {
            if(err){
                return res.render('loginUser', {error: err});
            }
            
            return res.redirect('/');
        })
    })(req,res,next);
}

function logoutUser(req, res, next){
    req.logout((err) => {
        if(err){
            return res.render('error', {error: 'Error while loggin out'});
        }
       res.redirect('/');
    })
}

async function getCreateFolder(req, res){
    try{
        const {rows} = await pool.query('SELECT * FROM folders WHERE user_id = $1', [req.user.id]);
        res.render('folders', {folders: rows, error: null});
    }catch(e){
        res.render('error', {error: 'Error while trying to get folders'});
    }
}
    

async function createFolder(req,res){
    try{
        await pool.query('INSERT INTO folders (name, user_id) VALUES ($1, $2)', [req.body.name, req.user.id]);
        res.redirect('/folders');
    }catch(e){
        res.render('error', {error: e});
    }
}

async function getFilesFromFolder(req, res) {
    const folderId = req.params.id;
    try{
        
        const { rows } = await pool.query('SELECT * FROM files WHERE folder_id = $1', [folderId]);
     
        res.render('fileDashboard', {files: rows, error: null, folderId: folderId});
    }catch(e){
        res.render('error', {error: 'Error occur while trying to search files in folder'});
    }
}

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

async function uploadFile(req, res) {
    const file = req.file;
    const folderId = req.body.folderId;
    if (!file) {
        return res.render('error', { error: 'Please select a file to upload.' });
    }

    try {
        const uploadResult = await cloudinary.v2.uploader.upload_stream(
           {folder: folderId}, 
           async (error, result) => {
                if (error) {
                    return res.render('error', { error: 'Error uploading to Cloudinary.' });
                }
                const query = 'INSERT INTO files (user_id, folder_id, public_id, url, resource_type, type, created_at, size) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);';
                const values = [req.user.id, folderId, result.public_id, result.url, result.resource_type, result.type, result.created_at, result.bytes];

                await pool.query(query, values); 
        
                res.redirect(`/folder/${folderId}`);
           }
       );
       streamifier.createReadStream(file.buffer).pipe(uploadResult);
    } catch (err) {
        res.render('error', { error: 'Error uploading file. Please try again.' });
    } 
} 

async function downloadFile(req, res) {
    const fileId = req.query.fileId;
    try {
        const {rows} = await pool.query('SELECT * FROM files WHERE id = $1', [fileId]);
        const file = rows[0];
        const newUrl = cloudinary.v2.url(file.public_id, { resource_type: 'image', type: 'upload', sign_url: true }); 
        res.redirect(newUrl);
    } catch (err) {
        res.render('error', { error: 'Error retrieving file. Please try again.' });
    } 
};

async function downloadFileShared(req, res) {
    const fileId = req.query.fileId;
    try {
        const {rows} = await pool.query('SELECT * FROM files WHERE id = $1', [fileId]);
        const file = rows[0];
        const newUrl = cloudinary.v2.url(file.public_id, { resource_type: 'image', type: 'upload', sign_url: true }); 
        res.redirect(newUrl);
    } catch (err) {
        res.render('error', { error: 'Error retrieving file. Please try again.' });
    } 
};

async function deleteFolder(req, res) {
    const id = req.body.folderId;
    try{
        await deleteAllFilesFromFolder(id);
        await pool.query('DELETE FROM folders WHERE id = $1', [id]);
        res.redirect('/folders');
    }catch(e){
        res.render('error', {error: 'Error while trying to remove folder'});
    }
}

async function deleteAllFilesFromFolder(idFolder) {
    try {
        const { rows } = await pool.query('SELECT * FROM files WHERE folder_id = $1', [idFolder]);

        if (rows.length === 0) {
            console.log('No files found in this folder.');
            return;
        }

        for (let i = 0; i < rows.length; i++) {
            const fileId = rows[i].id;
            const fileResult = await pool.query('SELECT * FROM files WHERE id = $1', [fileId]);
            const cloudinaryResponse = await cloudinary.uploader.destroy(fileResult.rows[0].public_id, { resource_type: fileResult.rows[0].resource_type });

            if (cloudinaryResponse.result === 'ok') {
                await pool.query('DELETE FROM files WHERE id = $1', [fileId]);
                console.log(`Deleted file with id ${fileId} from database.`);
            } else {
                console.error(`Failed to delete file with public_id ${fileResult.rows[0].public_id} from Cloudinary.`);
            }
        }
    } catch (error) {
        console.error('Error deleting files from folder:', error);
    }
}

async function deleteFile(req, res) {
    const fileId = req.body.fileId;
    const folderId = req.body.folderId;
    try{
        const {rows} = await pool.query('SELECT * FROM files WHERE id = $1', [fileId]);
        await cloudinary.uploader.destroy(rows[0].public_id, { resource_type: rows[0].resource_type });

        await pool.query('DELETE FROM files WHERE id = $1', [fileId]);

        res.redirect(`/folder/${folderId}`);
    }catch(e){
        res.render('error', {error: 'Error while trying to delete file'});
    }
}

async function updateFolder(req, res) {
    const folderName = req.body.folderName;
    const folderId = req.body.folderId;
    try{
        await pool.query('UPDATE folders SET name = $1 WHERE id = $2;', [folderName, folderId]);
        res.redirect(`/folder/${folderId}`);
    }catch(e){
        res.render('error', {error: 'Error while trying to update folder'});
    }
}

async function generateShareLink(req, res) {
    const folderId = req.query.folderId;
    const duration = req.query.duration;
    try {
        const expirationDate = new Date(Date.now() + 60 * 60 * 1000 * duration);

        await pool.query(
            'UPDATE folders SET share_expiration = $1 WHERE id = $2',
            [expirationDate, folderId]
        );

        const shareUrl = `${req.protocol}://${req.get('host')}/shared-folder/${folderId}`;
        console.log(shareUrl);
        res.render('shareLink', {link: shareUrl});

    } catch (err) {
        res.render('error', { error: 'Error retrieving file. Please try again.' });
    } 
}

async function getShareFolder(req, res) {
    const id = req.params.id;
    try{
        const {rows} = await pool.query('SELECT share_expiration FROM folders WHERE id = $1;', [id]);
        const accessOnTime = rows[0].share_expiration > new Date(Date.now());
        if( accessOnTime ){
            const result = await pool.query('SELECT * FROM files WHERE folder_id = $1', [id]);
            res.render('shareFolder', {files: result.rows, error: null, folderId: null});
        }else{
            res.render('shareFolder', {files: null, error: 'This share link has expired', folderId: null});
        } 

         
    }catch(e){
        res.render('error', {error: 'Error occur while trying to search files in folder'});
    }
}

module.exports = {
    getHome,
    loginUser,
    getLoginUser,
    logoutUser,
    getRegisterUser,
    registerUser,
    getCreateFolder,
    createFolder,
    getFilesFromFolder,
    upload,
    uploadFile,
    deleteFolder,
    deleteFile,
    updateFolder,
    downloadFile,
    generateShareLink,
    getShareFolder,
    downloadFileShared
}

